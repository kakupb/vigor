import { PlannerEntry } from "@/types/planner";

export type TimedEntry = PlannerEntry & {
  startMin: number;
  endMin: number;
};

export type PositionedEntry = TimedEntry & {
  columnIndex: number;
  columnCount: number;
};

// Überpüfe auf überlappende Zeitslots

export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function groupOverlappingEntries(entries: TimedEntry[]): TimedEntry[][] {
  const groups: TimedEntry[][] = [];

  entries.forEach((entry) => {
    let placed = false;

    for (const group of groups) {
      const overlapsGroup = group.some((g) =>
        overlaps(entry.startMin, entry.endMin, g.startMin, g.endMin)
      );

      if (overlapsGroup) {
        group.push(entry);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push([entry]);
    }
  });

  return groups;
}

//verteilt Entries auf der X-Achse
export function assignColumns(groups: TimedEntry[][]): PositionedEntry[] {
  const result: PositionedEntry[] = [];

  groups.forEach((group) => {
    const sorted = [...group].sort((a, b) => a.startMin - b.startMin);

    const columns: TimedEntry[][] = [];
    const local: PositionedEntry[] = [];

    for (const entry of sorted) {
      let colIndex = -1;

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const last = col[col.length - 1];

        if (
          !overlaps(entry.startMin, entry.endMin, last.startMin, last.endMin)
        ) {
          col.push(entry);
          colIndex = i;
          break;
        }
      }

      if (colIndex === -1) {
        columns.push([entry]);
        colIndex = columns.length - 1;
      }

      local.push({
        ...entry,
        columnIndex: colIndex,
        columnCount: 0,
      });
    }

    const columnCount = columns.length;

    for (const e of local) {
      e.columnCount = columnCount;
      result.push(e);
    }
  });

  return result;
}

export function getFocusRange(
  now: Date,
  focusHours = 8,
  leadHours = 2
): { startHour: number; endHour: number } {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let startMinutes = currentMinutes - leadHours * 60;
  let endMinutes = startMinutes + focusHours * 60;

  if (startMinutes < 0) {
    startMinutes = 0;
    endMinutes = focusHours * 60;
  }

  if (endMinutes > 24 * 60) {
    endMinutes = 24 * 60;
    startMinutes = endMinutes - focusHours * 60;
  }

  return {
    startHour: Math.floor(startMinutes / 60),
    endHour: Math.ceil(endMinutes / 60),
  };
}
