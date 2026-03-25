// types/habit.ts
import { PlannerCategory } from "./planner";

export type HabitKind = "boolean" | "count";

// ─────────────────────────────────────────────
// Frequency – wie oft soll das Habit stattfinden?
// ─────────────────────────────────────────────

/** Täglich – jeden Tag */
type FrequencyDaily = { type: "daily" };

/** Bestimmte Wochentage, z.B. Di+Do → days: [2, 4] (0=So, 1=Mo, …, 6=Sa) */
type FrequencyWeekdays = { type: "weekdays"; days: number[] };

/** X-mal pro Woche, beliebige Tage */
type FrequencyXPerWeek = { type: "xPerWeek"; count: number };

/** X-mal pro Monat, beliebige Tage */
type FrequencyXPerMonth = { type: "xPerMonth"; count: number };

/** Alle N Tage / Wochen / Monate */
type FrequencyInterval = {
  type: "interval";
  every: number; // z.B. 2
  unit: "days" | "weeks" | "months";
};

export type HabitFrequency =
  | FrequencyDaily
  | FrequencyWeekdays
  | FrequencyXPerWeek
  | FrequencyXPerMonth
  | FrequencyInterval;

// Default wenn kein frequency gesetzt ist: täglich
export const DEFAULT_FREQUENCY: HabitFrequency = { type: "daily" };

// ─────────────────────────────────────────────
// Habit
// ─────────────────────────────────────────────
export type Habit = {
  id: string;
  title: string;
  kind: HabitKind;
  unit?: string;
  dailyTarget?: number;
  createdAt: number;
  completedDates: number[]; // Timestamps (Tagesbeginn) der Erledigungen
  completedAmounts?: Record<number, number>;
  category?: PlannerCategory;
  frequency?: HabitFrequency; // neu – optional für Rückwärtskompatibilität
  schedule?: HabitSchedule;
};

// ─────────────────────────────────────────────
// Hilfsfunktionen für Frequency-Labels
// ─────────────────────────────────────────────
const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function frequencyLabel(f?: HabitFrequency): string {
  if (!f || f.type === "daily") return "Täglich";
  if (f.type === "weekdays") {
    if (f.days.length === 0) return "Keine Tage";
    return f.days
      .slice()
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_SHORT[d])
      .join(", ");
  }
  if (f.type === "xPerWeek") return `${f.count}× pro Woche`;
  if (f.type === "xPerMonth") return `${f.count}× pro Monat`;
  if (f.type === "interval") {
    const u =
      f.unit === "days" ? "Tage" : f.unit === "weeks" ? "Wochen" : "Monate";
    return `Alle ${f.every} ${u}`;
  }
  return "Täglich";
}

/** Ist heute ein geplanter Tag für dieses Habit? */
export function isScheduledToday(
  f?: HabitFrequency,
  createdAt?: number
): boolean {
  if (!f || f.type === "daily") return true;

  const today = new Date();

  if (f.type === "weekdays") {
    return f.days.includes(today.getDay());
  }

  // xPerWeek / xPerMonth: immer erlaubt (User entscheidet welche Tage)
  if (f.type === "xPerWeek" || f.type === "xPerMonth") return true;

  if (f.type === "interval") {
    const base = createdAt ? new Date(createdAt) : new Date();
    const baseDay = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate()
    );
    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const diffMs = todayDay.getTime() - baseDay.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (f.unit === "days") return diffDays % f.every === 0;
    if (f.unit === "weeks") return diffDays % (f.every * 7) === 0;
    if (f.unit === "months") {
      // Gleiches Datum im Abstand von N Monaten
      const monthDiff =
        (today.getFullYear() - base.getFullYear()) * 12 +
        (today.getMonth() - base.getMonth());
      return monthDiff % f.every === 0 && today.getDate() === base.getDate();
    }
  }

  return true;
}

export type RepeatUnit = "day" | "week" | "month" | "year";

export type HabitSchedule = {
  startDate?: string; // ISO date string "2025-03-01"
  endDate?: string; // ISO date string, optional
  repeatUnit?: RepeatUnit;
  weekDays?: number[];
  repeatEvery?: number; // alle N Tage/Wochen/Monate/Jahre
};

export function scheduleLabel(s?: HabitSchedule): string {
  if (!s?.repeatUnit) return "Täglich";
  const every = s.repeatEvery ?? 1;
  const unitLabel: Record<RepeatUnit, [string, string]> = {
    day: ["Tag", "Tage"],
    week: ["Woche", "Wochen"],
    month: ["Monat", "Monate"],
    year: ["Jahr", "Jahre"],
  };
  const [singular, plural] = unitLabel[s.repeatUnit];
  return every === 1 ? `Jeden ${singular}` : `Alle ${every} ${plural}`;
}
