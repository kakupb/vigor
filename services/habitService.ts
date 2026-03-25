// services/habitService.ts
import { Habit, isScheduledToday } from "@/types/habit";
import { getTodayTimestamp } from "@/utils/dateUtils";
import { isScheduledForToday as scheduleCheck } from "@/utils/scheduleUtils";

/** Prüft ob ein Habit heute erledigt ist */
export function isCompletedToday(
  habit: Habit,
  timestamp: number = getTodayTimestamp()
): boolean {
  return habit.completedDates.includes(timestamp);
}

/** Gibt die heutige Amount für ein Count-Habit zurück */
export function getTodayAmount(
  habit: Habit,
  timestamp: number = getTodayTimestamp()
): number {
  if (habit.kind !== "count") return 0;
  return habit.completedAmounts?.[timestamp] ?? 0;
}

/** Ist heute ein geplanter Tag? */
export function isScheduledForToday(habit: Habit): boolean {
  return scheduleCheck(habit.schedule);
}

/** Berechnet ob das Daily Target erreicht wurde */
export function isDailyTargetReached(
  habit: Habit,
  timestamp: number = getTodayTimestamp()
): boolean {
  if (habit.kind !== "count" || !habit.dailyTarget) return false;
  return getTodayAmount(habit, timestamp) >= habit.dailyTarget;
}

/** Toggle ein Boolean Habit */
export function toggleBooleanHabit(
  habit: Habit,
  timestamp: number = getTodayTimestamp()
): Habit {
  if (habit.kind !== "boolean") return habit;
  const already = habit.completedDates.includes(timestamp);
  return {
    ...habit,
    completedDates: already
      ? habit.completedDates.filter((d) => d !== timestamp)
      : [...habit.completedDates, timestamp],
  };
}

/** Erhöht/verringert die Amount eines Count Habits */
export function incrementCountHabit(
  habit: Habit,
  increment: number,
  timestamp: number = getTodayTimestamp()
): Habit {
  if (habit.kind !== "count") return habit;
  const current = getTodayAmount(habit, timestamp);
  const newAmount = Math.max(0, current + increment);
  const newAmounts = {
    ...(habit.completedAmounts ?? {}),
    [timestamp]: newAmount,
  };
  const targetReached = habit.dailyTarget
    ? newAmount >= habit.dailyTarget
    : false;

  let newDates = habit.completedDates;
  if (targetReached && !newDates.includes(timestamp))
    newDates = [...newDates, timestamp];
  else if (!targetReached) newDates = newDates.filter((d) => d !== timestamp);

  return { ...habit, completedAmounts: newAmounts, completedDates: newDates };
}

/** Setzt die Amount direkt */
export function setCountAmount(
  habit: Habit,
  amount: number,
  timestamp: number = getTodayTimestamp()
): Habit {
  if (habit.kind !== "count") return habit;
  const clamped = Math.max(0, amount);
  const newAmounts = {
    ...(habit.completedAmounts ?? {}),
    [timestamp]: clamped,
  };
  const targetReached = habit.dailyTarget
    ? clamped >= habit.dailyTarget
    : false;

  let newDates = habit.completedDates;
  if (targetReached && !newDates.includes(timestamp))
    newDates = [...newDates, timestamp];
  else if (!targetReached) newDates = newDates.filter((d) => d !== timestamp);

  return { ...habit, completedAmounts: newAmounts, completedDates: newDates };
}

/**
 * Streak-Berechnung mit Frequency-Bewusstsein:
 * Zählt nur geplante Tage – nicht erledigte geplante Tage unterbrechen den Streak.
 */
export function computeStreak(habit: Habit): number {
  if (habit.completedDates.length === 0) return 0;

  const completed = new Set(habit.completedDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const ts = cursor.getTime();
    const scheduled = isScheduledToday(habit.frequency, habit.createdAt);

    // Wenn heute kein geplanter Tag: überspringen
    const isToday = cursor.getTime() === today.getTime();
    const dayScheduled = (() => {
      // Prüfe ob cursor ein geplanter Tag ist
      const savedDay = today.getDay();
      // Kurz simulieren
      const d = new Date(cursor);
      if (!habit.frequency || habit.frequency.type === "daily") return true;
      if (habit.frequency.type === "weekdays")
        return habit.frequency.days.includes(d.getDay());
      if (
        habit.frequency.type === "xPerWeek" ||
        habit.frequency.type === "xPerMonth"
      )
        return true;
      if (habit.frequency.type === "interval") {
        const base = habit.createdAt ? new Date(habit.createdAt) : new Date(0);
        base.setHours(0, 0, 0, 0);
        const diffDays = Math.round((d.getTime() - base.getTime()) / 86400000);
        if (habit.frequency.unit === "days")
          return diffDays % habit.frequency.every === 0;
        if (habit.frequency.unit === "weeks")
          return diffDays % (habit.frequency.every * 7) === 0;
        if (habit.frequency.unit === "months") {
          const mDiff =
            (d.getFullYear() - base.getFullYear()) * 12 +
            (d.getMonth() - base.getMonth());
          return (
            mDiff % habit.frequency.every === 0 &&
            d.getDate() === base.getDate()
          );
        }
      }
      return true;
    })();

    if (dayScheduled) {
      if (completed.has(ts)) {
        streak++;
      } else if (!isToday) {
        // Geplanter Tag verpasst → Streak gebrochen
        break;
      }
      // Wenn heute geplant aber noch nicht erledigt: streak nicht brechen, nur nicht zählen
    }

    cursor.setDate(cursor.getDate() - 1);

    // Abbrechen wenn vor createdAt
    if (habit.createdAt && cursor.getTime() < habit.createdAt - 86400000) break;
    // Max 365 Tage zurück
    if (streak > 365) break;
  }

  return streak;
}
