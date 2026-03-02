//utlis/entryUtils.ts
import { PlannerEntry } from "@/types/planner";
import { timeToMinutes } from "./dateUtils";

export function sortEntriesByTime(entries: PlannerEntry[]): PlannerEntry[] {
  return [...entries].sort((a, b) => {
    if (a.startTime && !b.startTime) return -1;
    if (!a.startTime && b.startTime) return 1;

    if (a.startTime && b.startTime) {
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    }

    return Number(!!a.doneAt) - Number(!!b.doneAt);
  });
}
