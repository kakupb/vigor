// store/habitStore.ts
import { sanitizeCategory } from "@/constants/categories";
import * as habitService from "@/services/habitService";
import { storage } from "@/services/storage";
import { Habit, HabitKind, HabitSchedule } from "@/types/habit";
import { PlannerCategory } from "@/types/planner";
import { getTodayTimestamp } from "@/utils/dateUtils";
import { create } from "zustand";

type HabitState = {
  habits: Habit[];

  // Actions
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
      id: Date.now().toString(),
      title,
      kind,
      unit,
      dailyTarget,
      createdAt: Date.now(),
      completedDates: [],
      completedAmounts: {},
      category,
      schedule, // ← NEU
    };
    const updated = [...get().habits, newHabit];
    set({ habits: updated });
    storage.habits.save(updated);
  },

  updateHabit: (habitId, updates) => {
    const updated = get().habits.map((habit) =>
      habit.id === habitId ? { ...habit, ...updates } : habit
    );

    set({ habits: updated });
    storage.habits.save(updated);
  },

  deleteHabit: (habitId) => {
    const updated = get().habits.filter((h) => h.id !== habitId);
    set({ habits: updated });
    storage.habits.save(updated);
  },

  toggleCheckIn: (habitId) => {
    const timestamp = getTodayTimestamp();

    const updated = get().habits.map((habit) => {
      if (habit.id !== habitId) return habit;

      // Business Logic ist jetzt im Service!
      if (habit.kind === "boolean") {
        return habitService.toggleBooleanHabit(habit, timestamp);
      }

      // Count Habits: +1
      return habitService.incrementCountHabit(habit, 1, timestamp);
    });

    set({ habits: updated });
    storage.habits.save(updated);
  },

  increaseAmount: (habitId, increment) => {
    const timestamp = getTodayTimestamp();

    const updated = get().habits.map((habit) => {
      if (habit.id !== habitId) return habit; // ✅ BUG FIXED!
      return habitService.incrementCountHabit(habit, increment, timestamp);
    });

    set({ habits: updated });
    storage.habits.save(updated);
  },

  setAmountForToday: (habitId, value) => {
    const timestamp = getTodayTimestamp();

    const updated = get().habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      return habitService.setCountAmount(habit, value, timestamp);
    });

    set({ habits: updated });
    storage.habits.save(updated);
  },

  loadHabits: async () => {
    const habits = await storage.habits.load();
    if (!habits) return;

    // 🔧 MIGRATION: Konvertiere alte Daten zu neuem Format
    const normalized = habits.map((h) => {
      let completedAmounts = h.completedAmounts ?? {};

      // Konvertiere String-Keys zu Number-Keys
      if (completedAmounts && Object.keys(completedAmounts).length > 0) {
        const firstKey = Object.keys(completedAmounts)[0];

        // Prüfe ob Keys strings sind (altes Format)
        if (typeof firstKey === "string") {
          const converted: Record<number, number> = {};

          Object.entries(completedAmounts as Record<string, unknown>).forEach(
            ([key, value]) => {
              const numKey = Number(key);
              const numValue = Number(value);

              if (!isNaN(numKey) && !isNaN(numValue)) {
                converted[numKey] = numValue;
              }
            }
          );

          completedAmounts = converted;
        }
      }

      return {
        ...h,
        kind: h.kind ?? "boolean",
        completedAmounts,
        category: sanitizeCategory(h.category),
      };
    });

    set({ habits: normalized });

    // Speichere migrierte Daten zurück
    storage.habits.save(normalized);
  },
}));
