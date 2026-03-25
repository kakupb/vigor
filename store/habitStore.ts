// store/habitStore.ts
// Schreibt Habits lokal (AsyncStorage) + in Supabase.
// Offline-first: lokale Änderungen sofort, Supabase im Hintergrund.
import { sanitizeCategory } from "@/constants/categories";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, syncUpsert } from "@/lib/sync";
import * as habitService from "@/services/habitService";
import { storage } from "@/services/storage";
import { Habit, HabitKind, HabitSchedule } from "@/types/habit";
import { PlannerCategory } from "@/types/planner";
import { getTodayTimestamp } from "@/utils/dateUtils";
import * as Crypto from "expo-crypto";
import { create } from "zustand";

// ─── Mapping: Habit → Supabase row ───────────────────────────────────────────
async function toRow(h: Habit) {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: h.id,
    user_id: user.id,
    title: h.title,
    kind: h.kind,
    category: h.category ?? null,
    unit: h.unit ?? null,
    daily_target: h.dailyTarget ?? null,
    schedule: h.schedule ?? null,
    completed_dates: h.completedDates,
    completed_amounts: h.completedAmounts ?? {},
  };
}

// ─── Mapping: Supabase row → Habit ───────────────────────────────────────────
function fromRow(r: any): Habit {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind ?? "boolean",
    category: sanitizeCategory(r.category),
    unit: r.unit ?? undefined,
    dailyTarget: r.daily_target ?? undefined,
    schedule: r.schedule ?? undefined,
    completedDates: r.completed_dates ?? [],
    completedAmounts: r.completed_amounts ?? {},
    createdAt: new Date(r.created_at).getTime(),
  };
}

// ─── Lokale + Cloud-Persistenz ────────────────────────────────────────────────
function saveLocal(habits: Habit[]) {
  storage.habits.save(habits);
}

async function saveAndSync(habits: Habit[], changed: Habit) {
  saveLocal(habits);
  const row = await toRow(changed);
  if (row) syncUpsert("habits", row);
}

// ─── Store ────────────────────────────────────────────────────────────────────
type HabitState = {
  habits: Habit[];
  addHabit: (
    title: string,
    kind: HabitKind,
    category?: PlannerCategory,
    unit?: string,
    dailyTarget?: number,
    schedule?: HabitSchedule
  ) => void;
  updateHabit: (
    habitId: string,
    updates: Partial<Omit<Habit, "id" | "createdAt" | "completedDates">>
  ) => void;
  deleteHabit: (habitId: string) => void;
  toggleCheckIn: (habitId: string) => void;
  increaseAmount: (habitId: string, increment: number) => void;
  setAmountForToday: (habitId: string, value: number) => void;
  loadHabits: () => Promise<void>;
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],

  addHabit: (title, kind, category, unit, dailyTarget, schedule) => {
    const newHabit: Habit = {
      id: Crypto.randomUUID(),
      title,
      kind,
      unit,
      dailyTarget,
      category,
      schedule,
      createdAt: Date.now(),
      completedDates: [],
      completedAmounts: {},
    };
    const updated = [...get().habits, newHabit];
    set({ habits: updated });
    saveAndSync(updated, newHabit);
  },

  updateHabit: (habitId, updates) => {
    const updated = get().habits.map((h) =>
      h.id === habitId ? { ...h, ...updates } : h
    );
    set({ habits: updated });
    const changed = updated.find((h) => h.id === habitId);
    if (changed) saveAndSync(updated, changed);
  },

  deleteHabit: (habitId) => {
    const updated = get().habits.filter((h) => h.id !== habitId);
    set({ habits: updated });
    saveLocal(updated);
    // Aus Supabase löschen
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user)
          supabase
            .from("habits")
            .delete()
            .eq("id", habitId)
            .eq("user_id", user.id);
      })
      .catch(() => {});
  },

  toggleCheckIn: (habitId) => {
    const timestamp = getTodayTimestamp();
    const updated = get().habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      if (habit.kind === "boolean")
        return habitService.toggleBooleanHabit(habit, timestamp);
      return habitService.incrementCountHabit(habit, 1, timestamp);
    });
    set({ habits: updated });
    const changed = updated.find((h) => h.id === habitId);
    if (changed) saveAndSync(updated, changed);
  },

  increaseAmount: (habitId, increment) => {
    const timestamp = getTodayTimestamp();
    const updated = get().habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      return habitService.incrementCountHabit(habit, increment, timestamp);
    });
    set({ habits: updated });
    const changed = updated.find((h) => h.id === habitId);
    if (changed) saveAndSync(updated, changed);
  },

  setAmountForToday: (habitId, value) => {
    const timestamp = getTodayTimestamp();
    const updated = get().habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      return habitService.setCountAmount(habit, value, timestamp);
    });
    set({ habits: updated });
    const changed = updated.find((h) => h.id === habitId);
    if (changed) saveAndSync(updated, changed);
  },

  loadHabits: async () => {
    // 1. Erst lokal laden (sofort, kein Netz nötig)
    const local = await storage.habits.load();

    // 2. Aus Supabase laden falls eingeloggt
    try {
      const user = await getCurrentUser();
      if (user) {
        const { data } = await supabase
          .from("habits")
          .select("*")
          .eq("user_id", user.id);

        if (data && data.length > 0) {
          const fromCloud = data.map(fromRow);
          set({ habits: fromCloud });
          storage.habits.save(fromCloud);
          return;
        }
      }
    } catch {}

    // 3. Fallback: lokale Daten
    if (local) {
      const normalized = local.map((h) => ({
        ...h,
        kind: h.kind ?? "boolean",
        completedAmounts: h.completedAmounts ?? {},
        category: sanitizeCategory(h.category),
      }));
      set({ habits: normalized });
    }
  },
}));
