// services/plannerService.ts
import { AddEntryInput, PlannerEntry } from "@/types/planner";
import {
  dateToLocalString,
  minutesToTime,
  timeToMinutes,
} from "@/utils/dateUtils";

/**
 * Berechnet End-Zeit aus Start + Duration
 */
export function computeEndFromStartAndDuration(
  date: string,
  startTime: string,
  durationMinutes: number
): { endDate: string; endTime: string } {
  const startMinutes = timeToMinutes(startTime);
  const totalMinutes = startMinutes + durationMinutes;

  const dayOffset = Math.floor(totalMinutes / 1440);
  const endMinutes = totalMinutes % 1440;

  let endDate = date;
  if (dayOffset > 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + dayOffset);
    endDate = dateToLocalString(d);
  }

  return {
    endDate,
    endTime: minutesToTime(endMinutes),
  };
}

/**
 * Berechnet Duration aus Start + End
 */
export function computeDurationFromStartAndEnd(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const dayDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const dayMinutes = dayDiff * 1440;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return dayMinutes + (endMinutes - startMinutes);
}

/**
 * Normalisiert ein Entry - stellt sicher dass alle 3 Werte synchron sind
 * Nutzt startTime + durationMinute als "source of truth"
 */
export function normalizeEntry(
  input: AddEntryInput
): Omit<PlannerEntry, "id" | "createdAt"> {
  let endDate = input.endDate;
  let endTime = input.endTime;
  let durationMinute = input.durationMinute;

  // Fall 1: Start + Duration gegeben → End berechnen
  if (input.startTime && durationMinute !== undefined) {
    const computed = computeEndFromStartAndDuration(
      input.date,
      input.startTime,
      durationMinute
    );
    endDate = computed.endDate;
    endTime = computed.endTime;
  }

  // Fall 2: Start + End gegeben → Duration berechnen
  else if (input.startTime && endTime && !durationMinute) {
    durationMinute = computeDurationFromStartAndEnd(
      input.date,
      input.startTime,
      endDate || input.date,
      endTime
    );
  }

  // Fall 3: Ganztägig (kein startTime)
  else {
    durationMinute = undefined;
    endDate = undefined;
    endTime = undefined;
  }

  const result = {
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    durationMinute,
    endDate,
    endTime,
    category: input.category,
    customCategoryId: input.customCategoryId, // ← NEU
    habitId: input.habitId,
    note: input.note,
    color: input.color,
    doneAt: input.doneAt,
  };

  return result;
}

/**
 * Prüft ob ein Entry heute ist
 */
export function isEntryToday(entry: PlannerEntry): boolean {
  const today = dateToLocalString(new Date());
  return entry.date === today;
}

/**
 * Prüft ob ein Entry erledigt ist
 */
export function isEntryDone(entry: PlannerEntry): boolean {
  return !!entry.doneAt;
}
