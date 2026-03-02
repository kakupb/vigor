import { PlannerEntry } from "@/types/planner";
import { dateToLocalString } from "@/utils/dateUtils";
import { useMemo } from "react";

export type MonthStats = {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
};

export function useMonthStats(
  entries: PlannerEntry[],
  year: number,
  month: number
): MonthStats {
  return useMemo(() => {
    const monthStart = dateToLocalString(new Date(year, month, 1));
    const monthEnd = dateToLocalString(new Date(year, month + 1, 0));

    const monthEntries = entries.filter(
      (entry) => entry.date >= monthStart && entry.date <= monthEnd
    );

    const completed = entries.filter((entry) => entry.doneAt).length;
    const total = monthEntries.length;
    const pending = total - completed;

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [entries, year, month]);
}
