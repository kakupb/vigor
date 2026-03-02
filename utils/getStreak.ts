// utils/getStreak.ts
import { Habit, HabitSchedule } from "@/types/habit";
import { getTodayTimestamp } from "./dateUtils";

// ─── Hilfsfunktion: War ein bestimmter Timestamp ein geplanter Tag? ─────────
function wasScheduledOn(ts: number, schedule?: HabitSchedule): boolean {
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

// ─── getStreak ───────────────────────────────────────────────────────────────
/**
 * Aktueller Streak – zählt nur geplante Tage.
 * Ein nicht-geplanter Tag bricht den Streak NICHT.
 * Ein geplanter aber nicht erledigter Tag bricht den Streak.
 */
export function getStreak(habit: Habit, allowGracePeriod = false): number {
  const { completedDates, schedule } = habit;
  if (completedDates.length === 0) return 0;

  const completed = new Set(completedDates);
  const today = getTodayTimestamp();
  const yesterday = getTodayTimestamp(today - 86_400_000);

  const completedToday = completed.has(today);
  const completedYesterday = completed.has(yesterday);

  // Startpunkt bestimmen
  let streak = 0;
  let cursor: number;

  if (completedToday) {
    streak = 1;
    cursor = today;
  } else if (allowGracePeriod && completedYesterday) {
    streak = 1;
    cursor = yesterday;
  } else if (!wasScheduledOn(today, schedule)) {
    // Heute kein geplanter Tag → gehe zurück bis zum letzten geplanten Tag
    cursor = today;
  } else {
    // Heute geplant aber nicht erledigt → kein aktiver Streak
    return 0;
  }

  // Rückwärts zählen
  while (true) {
    const prev = getTodayTimestamp(cursor - 86_400_000);

    // Vor Startdatum → Streak vollständig
    if (schedule?.startDate) {
      const prevStr = new Date(prev).toISOString().split("T")[0];
      if (prevStr < schedule.startDate) break;
    }

    const scheduled = wasScheduledOn(prev, schedule);

    if (!scheduled) {
      // Kein geplanter Tag → überspringen, nicht als Lücke zählen
      cursor = prev;
      // Schutz gegen Endlosschleife: max 1 Jahr zurück
      if (today - cursor > 365 * 86_400_000) break;
      continue;
    }

    if (completed.has(prev)) {
      streak++;
      cursor = prev;
    } else {
      // Geplanter Tag verpasst → Streak gebrochen
      break;
    }
  }

  return streak;
}

// ─── getLongestStreak ────────────────────────────────────────────────────────
/**
 * Längster Streak aller Zeiten – ignoriert nicht geplante Tage zwischen Completions.
 */
export function getLongestStreak(habit: Habit): number {
  const { completedDates, schedule } = habit;
  if (completedDates.length === 0) return 0;

  const sorted = [...completedDates].sort((a, b) => a - b);

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const from = sorted[i - 1];
    const to = sorted[i];

    // Prüfe ob zwischen from und to kein geplanter Tag ausgelassen wurde
    let gapHasScheduledDay = false;
    let cursor = from + 86_400_000;
    while (cursor < to) {
      if (wasScheduledOn(cursor, schedule)) {
        gapHasScheduledDay = true;
        break;
      }
      cursor += 86_400_000;
    }

    if (!gapHasScheduledDay) {
      // Kein geplanter Tag dazwischen → Streak läuft weiter
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      // Geplanter Tag verpasst → Streak reset
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// ─── getCompletionRate ───────────────────────────────────────────────────────
/**
 * Completion-Rate der letzten N Tage – nur geplante Tage zählen als Nenner.
 */
export function getCompletionRate(habit: Habit, days = 30): number {
  const now = getTodayTimestamp();
  const cutoff = now - days * 86_400_000;

  let scheduledCount = 0;
  let completedCount = 0;
  const completed = new Set(habit.completedDates);

  for (let d = cutoff; d <= now; d += 86_400_000) {
    if (wasScheduledOn(d, habit.schedule)) {
      scheduledCount++;
      if (completed.has(d)) completedCount++;
    }
  }

  if (scheduledCount === 0) return 0;
  return Math.round((completedCount / scheduledCount) * 100);
}
