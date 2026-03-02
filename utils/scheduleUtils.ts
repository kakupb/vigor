// utils/scheduleUtils.ts
import { HabitSchedule } from "@/types/habit";

/**
 * Prüft ob ein Habit heute laut seinem Zeitplan fällig ist.
 */
export function isScheduledForToday(schedule?: HabitSchedule): boolean {
  if (!schedule) return true; // kein Zeitplan = täglich

  const todayStr = new Date().toISOString().split("T")[0]; // "2025-03-15"
  const today = new Date(todayStr);

  // Startdatum noch nicht erreicht?
  if (schedule.startDate && schedule.startDate > todayStr) return false;

  // Enddatum überschritten?
  if (schedule.endDate && schedule.endDate < todayStr) return false;

  const repeatUnit = schedule.repeatUnit ?? "day";
  const repeatEvery = schedule.repeatEvery ?? 1;

  if (repeatUnit === "day") {
    if (repeatEvery === 1) return true;
    // Alle N Tage – Referenz ist startDate oder createdAt
    const ref = schedule.startDate ? new Date(schedule.startDate) : today;
    const diffDays = Math.round((today.getTime() - ref.getTime()) / 86_400_000);
    return diffDays % repeatEvery === 0;
  }

  if (repeatUnit === "week") {
    // Wenn Wochentage definiert → prüfe ob heute dabei ist
    if (schedule.weekDays && schedule.weekDays.length > 0) {
      return schedule.weekDays.includes(today.getDay());
    }
    // Ohne Wochentage: alle N Wochen ab Start
    const ref = schedule.startDate ? new Date(schedule.startDate) : today;
    const diffDays = Math.round((today.getTime() - ref.getTime()) / 86_400_000);
    return diffDays % (repeatEvery * 7) === 0;
  }

  if (repeatUnit === "month") {
    const ref = schedule.startDate ? new Date(schedule.startDate) : today;
    const monthDiff =
      (today.getFullYear() - ref.getFullYear()) * 12 +
      (today.getMonth() - ref.getMonth());
    return monthDiff % repeatEvery === 0 && today.getDate() === ref.getDate();
  }

  if (repeatUnit === "year") {
    const ref = schedule.startDate ? new Date(schedule.startDate) : today;
    const yearDiff = today.getFullYear() - ref.getFullYear();
    return (
      yearDiff % repeatEvery === 0 &&
      today.getMonth() === ref.getMonth() &&
      today.getDate() === ref.getDate()
    );
  }

  return true;
}
