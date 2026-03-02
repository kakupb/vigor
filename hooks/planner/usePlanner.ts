// hooks/planner/usePlanner.ts
import { usePlannerStore } from "@/store/plannerStore";
import { PlannerEntry } from "@/types/planner";
import { dateToLocalString, timeToMinutes } from "@/utils/dateUtils";
import { useEffect, useMemo } from "react";

/**
 * Splittet Entries in timed und anytime
 * Sortiert bereits nach Zeit!
 */
export function splitEntriesForDate(entries: PlannerEntry[], date: string) {
  const all = entries.filter((e) => e.date === date);

  const timed = all
    .filter((e) => !!e.startTime)
    .sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!));

  const anytime = all
    .filter((e) => !e.startTime)
    .sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt));

  return { timed, anytime };
}

/**
 * Hook für Planner Day View
 */
export function usePlannerDay(
  date: string,
  onDateChange?: (date: string) => void
) {
  const entries = usePlannerStore((s) => s.entries);
  const loadEntries = usePlannerStore((s) => s.loadEntries);
  const toggleDone = usePlannerStore((s) => s.toggleDone);
  const deleteEntry = usePlannerStore((s) => s.deleteEntry);

  const selectedDate = date;

  // Load on mount
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Computed: Entries für diesen Tag (bereits sortiert!)
  const dayEntries = useMemo(() => {
    return splitEntriesForDate(entries, selectedDate);
  }, [entries, selectedDate]);

  // Stats
  const stats = useMemo(() => {
    const total = dayEntries.timed.length + dayEntries.anytime.length;
    const completed = [...dayEntries.timed, ...dayEntries.anytime].filter(
      (e) => !!e.doneAt
    ).length;

    return {
      total,
      completed,
      remaining: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [dayEntries]);

  // Navigation
  function goToNextDay() {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const newDate = dateToLocalString(current);
    onDateChange?.(newDate);
  }

  function goToPrevDay() {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const newDate = dateToLocalString(current);
    onDateChange?.(newDate);
  }

  function goToToday() {
    const newDate = dateToLocalString(new Date());
    onDateChange?.(newDate);
  }

  function goToDate(newDate: string) {
    onDateChange?.(newDate);
  }

  return {
    selectedDate,
    entries: dayEntries, // ✅ Bereits sortiert!
    stats,
    actions: {
      toggleDone,
      deleteEntry,
    },
    navigation: {
      goToNextDay,
      goToPrevDay,
      goToToday,
      goToDate,
    },
  };
}
