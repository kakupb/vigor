// utils/scheduleUtils.ts
import { HabitSchedule } from "@/types/habit";

/**
 * Einzige Quelle der Wahrheit für Schedule-Logik.
 *
 * Prüft ob ein gegebener Timestamp (Tagesbeginn) ein geplanter Tag
 * für das gegebene Schedule ist.
 *
 * Wird verwendet von:
 *   - isScheduledForToday()  → heutiger Tag
 *   - getStreak()            → beliebiger historischer Tag
 *   - getLongestStreak()     → Gap-Berechnung zwischen Completions
 *   - getCompletionRate()    → Zähler geplanter Tage im Zeitraum
 */
export function wasScheduledOn(ts: number, schedule?: HabitSchedule): boolean {
  if (!schedule) return true; // kein Zeitplan = täglich

  const date = new Date(ts);
  const dateStr = date.toISOString().split("T")[0];

  // Vor Startdatum?
  if (schedule.startDate && dateStr < schedule.startDate) return false;
  // Nach Enddatum?
  if (schedule.endDate && dateStr > schedule.endDate) return false;

  const repeatUnit = schedule.repeatUnit ?? "day";
  const repeatEvery = schedule.repeatEvery ?? 1;

  if (repeatUnit === "day") {
    if (repeatEvery === 1) return true;
    const ref = schedule.startDate ? new Date(schedule.startDate) : date;
    ref.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - ref.getTime()) / 86_400_000);
    return diffDays % repeatEvery === 0;
  }

  if (repeatUnit === "week") {
    if (schedule.weekDays && schedule.weekDays.length > 0) {
      return schedule.weekDays.includes(date.getDay());
    }
    const ref = schedule.startDate ? new Date(schedule.startDate) : date;
    ref.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - ref.getTime()) / 86_400_000);
    return diffDays % (repeatEvery * 7) === 0;
  }

  if (repeatUnit === "month") {
    const ref = schedule.startDate ? new Date(schedule.startDate) : date;
    const monthDiff =
      (date.getFullYear() - ref.getFullYear()) * 12 +
      (date.getMonth() - ref.getMonth());
    return monthDiff % repeatEvery === 0 && date.getDate() === ref.getDate();
  }

  if (repeatUnit === "year") {
    const ref = schedule.startDate ? new Date(schedule.startDate) : date;
    const yearDiff = date.getFullYear() - ref.getFullYear();
    return (
      yearDiff % repeatEvery === 0 &&
      date.getMonth() === ref.getMonth() &&
      date.getDate() === ref.getDate()
    );
  }

  return true;
}

/**
 * Ist heute ein geplanter Tag?
 * Thin wrapper um wasScheduledOn — nutzt den aktuellen Tagesbeginn.
 */
export function isScheduledForToday(schedule?: HabitSchedule): boolean {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTs = new Date(todayStr).getTime();
  return wasScheduledOn(todayTs, schedule);
}
