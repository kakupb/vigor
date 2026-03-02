// hooks/useHabits.ts - FIXED ✅
import { getTodayAmount, isCompletedToday } from "@/services/habitService";
import { useHabitStore } from "@/store/habitStore";
import { getTodayTimestamp } from "@/utils/dateUtils";
import { getLongestStreak, getStreak } from "@/utils/getStreak";
import { useEffect, useMemo, useState } from "react";

/**
 * Hook für Habit-Verwaltung mit computed values
 */
export function useHabits() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const habits = useHabitStore((s) => s.habits);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const toggleCheckIn = useHabitStore((s) => s.toggleCheckIn);
  const increaseAmount = useHabitStore((s) => s.increaseAmount);
  const setAmountForToday = useHabitStore((s) => s.setAmountForToday);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);

  // ✅ FIX: Load nur einmal on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        await loadHabits();
        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true; // Cleanup: Verhindere setState nach unmount
    };
  }, []); // ✅ Nur einmal on mount!

  // Computed: Heute-Timestamp (nur 1x berechnen)
  const todayTimestamp = useMemo(() => getTodayTimestamp(), []);

  // Computed: Habits mit Meta-Daten
  const habitsWithMeta = useMemo(() => {
    return habits.map((habit) => ({
      habit,
      completed: isCompletedToday(habit, todayTimestamp),
      todayAmount: getTodayAmount(habit, todayTimestamp),
      streak: getStreak(habit),
      longestStreak: getLongestStreak(habit),
    }));
  }, [habits, todayTimestamp]);

  // Computed: Sortiert (uncompleted first)
  const sortedHabits = useMemo(() => {
    return [...habitsWithMeta].sort((a, b) => {
      // 1. Incomplete zuerst
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // 2. Dann nach Streak (höher = wichtiger)
      if (b.streak !== a.streak) return b.streak - a.streak;

      // 3. Dann alphabetisch
      return a.habit.title.localeCompare(b.habit.title);
    });
  }, [habitsWithMeta]);

  // ✅ Memoize actions to prevent re-renders
  const actions = useMemo(
    () => ({
      toggleCheckIn,
      increaseAmount,
      setAmountForToday,
      deleteHabit,
    }),
    [toggleCheckIn, increaseAmount, setAmountForToday, deleteHabit]
  );

  return {
    habits: sortedHabits,
    isLoading,
    error,
    todayTimestamp,
    actions,
  };
}

/**
 * Hook für einzelnes Habit (Detail-Seite)
 */
export function useHabit(habitId: string) {
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === habitId));
  const toggleCheckIn = useHabitStore((s) => s.toggleCheckIn);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);

  const todayTimestamp = useMemo(() => getTodayTimestamp(), []);

  const meta = useMemo(() => {
    if (!habit) return null;

    return {
      completed: isCompletedToday(habit, todayTimestamp),
      todayAmount: getTodayAmount(habit, todayTimestamp),
      streak: getStreak(habit),
      longestStreak: getLongestStreak(habit),
      totalCompletions: habit.completedDates.length,
      // ✅ Sortierte Historie
      history: [...habit.completedDates]
        .sort((a, b) => b - a)
        .map((timestamp) => new Date(timestamp)),
    };
  }, [habit, todayTimestamp]);

  // ✅ Memoize actions
  const actions = useMemo(
    () => ({
      toggleCheckIn: () => habitId && toggleCheckIn(habitId),
      delete: async () => {
        if (!habitId) return false;
        try {
          deleteHabit(habitId);
          return true;
        } catch (error) {
          console.error("Delete failed:", error);
          return false;
        }
      },
    }),
    [habitId, toggleCheckIn, deleteHabit]
  );

  return {
    habit,
    meta,
    actions,
  };
}
