// store/habitStore.ts
import { sanitizeCategory } from "@/constants/categories";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, syncUpsert } from "@/lib/sync";
import * as habitService from "@/services/habitService";
import {
  cancelStreakAtRiskReminder,
  scheduleStreakAtRiskReminder,
} from "@/services/notificationService";
import { storage } from "@/services/storage";
import { Habit, HabitKind, HabitSchedule } from "@/types/habit";
import { PlannerCategory } from "@/types/planner";
import { getTodayTimestamp } from "@/utils/dateUtils";
import { getStreak } from "@/utils/getStreak";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import * as Crypto from "expo-crypto";
import { create } from "zustand";
import { useUserStore } from "./userStore";

// ─── Supabase Mappings ────────────────────────────────────────────────────────
async function toRow(h: Habit) {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: h.id,
    user_id: user.id,
    title: h.title,
    kind: h.kind,
    category: h.category ?? null,
    custom_category_id: h.customCategoryId ?? null,
    unit: h.unit ?? null,
    daily_target: h.dailyTarget ?? null,
    schedule: h.schedule ?? null,
    completed_dates: h.completedDates,
    completed_amounts: h.completedAmounts ?? {},
  };
}

function fromRow(r: any): Habit {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind ?? "boolean",
    category: sanitizeCategory(r.category),
    customCategoryId: r.custom_category_id ?? undefined,
    unit: r.unit ?? undefined,
    dailyTarget: r.daily_target ?? undefined,
    schedule: r.schedule ?? undefined,
    completedDates: r.completed_dates ?? [],
    completedAmounts: r.completed_amounts ?? {},
    createdAt: new Date(r.created_at).getTime(),
  };
}

// ─── Persistenz ───────────────────────────────────────────────────────────────
function saveLocal(habits: Habit[]): void {
  storage.habits.save(habits);
}

async function saveAndSync(habits: Habit[], changed: Habit): Promise<void> {
  saveLocal(habits);
  const row = await toRow(changed);
  if (row) syncUpsert("habits", row);
}

// ─── Widget-Sync: lazy, kein Circular Import ──────────────────────────────────
function syncWidget(habits: Habit[]): void {
  setTimeout(() => {
    try {
      const { syncWidgetData } = require("@/modules/widgetBridge");
      const { useFocusStore } = require("./focusStore");
      const { useUserStore: userStore } = require("./userStore");

      const { sessions, stats } = useFocusStore.getState();
      const { name } = userStore.getState();

      const todayTs = getTodayTimestamp();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayFocusMinutes = sessions
        .filter((s: any) => s.startedAt >= todayStart.getTime())
        .reduce(
          (sum: number, s: any) =>
            sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
          0
        );

      const todayHabits = habits.filter((h) => isScheduledForToday(h.schedule));

      syncWidgetData({
        streak: stats.currentStreak,
        todayFocusMinutes,
        habitsCompleted: todayHabits.filter((h) =>
          h.completedDates.includes(todayTs)
        ).length,
        habitsTotal: todayHabits.length,
        userName: name && name !== "_onboarded" ? name : null,
        lastUpdated: new Date().toISOString(),
      });
    } catch {
      // best-effort — nie die App blockieren
    }
  }, 0);
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
    schedule?: HabitSchedule,
    customCategoryId?: string
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

  addHabit: (
    title,
    kind,
    category,
    unit,
    dailyTarget,
    schedule,
    customCategoryId
  ) => {
    const newHabit: Habit = {
      id: Crypto.randomUUID(),
      title,
      kind,
      unit,
      dailyTarget,
      category,
      customCategoryId,
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
    getCurrentUser()
      .then((user) => {
        if (user) {
          supabase
            .from("habits")
            .delete()
            .eq("id", habitId)
            .eq("user_id", user.id);
        }
      })
      .catch(() => {});
  },

  toggleCheckIn: (habitId) => {
    const timestamp = getTodayTimestamp();
    const updated = get().habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      return habit.kind === "boolean"
        ? habitService.toggleBooleanHabit(habit, timestamp)
        : habitService.incrementCountHabit(habit, 1, timestamp);
    });
    set({ habits: updated });

    // Streak-at-Risk Notification
    const { name } = useUserStore.getState();
    const allTodayDone = updated
      .filter((h) => isScheduledForToday(h.schedule))
      .every((h) => h.completedDates.includes(getTodayTimestamp()));

    if (allTodayDone) {
      cancelStreakAtRiskReminder();
    } else {
      const topHabit = updated.reduce(
        (a, b) => (getStreak(b) > getStreak(a) ? b : a),
        updated[0]
      );
      if (topHabit) {
        scheduleStreakAtRiskReminder({
          userName: name,
          habitTitle: topHabit.title,
          streak: getStreak(topHabit),
        });
      }
    }

    const changed = updated.find((h) => h.id === habitId);
    if (changed) saveAndSync(updated, changed);

    // Widget nach Toggle aktualisieren
    syncWidget(updated);
  },

  increaseAmount: (habitId, increment) => {
    const timestamp = getTodayTimestamp();
    const updated = get().habits.map((habit) =>
      habit.id !== habitId
        ? habit
        : habitService.incrementCountHabit(habit, increment, timestamp)
    );
    set({ habits: updated });
    const changed = updated.find((h) => h.id === habitId);
    if (changed) saveAndSync(updated, changed);
    syncWidget(updated);
  },

  setAmountForToday: (habitId, value) => {
    const timestamp = getTodayTimestamp();
    const updated = get().habits.map((habit) =>
      habit.id !== habitId
        ? habit
        : habitService.setCountAmount(habit, value, timestamp)
    );
    set({ habits: updated });
    const changed = updated.find((h) => h.id === habitId);
    if (changed) saveAndSync(updated, changed);
    syncWidget(updated);
  },

  loadHabits: async () => {
    const local = await storage.habits.load();

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
