// types/planner.ts
export type PlannerCategory =
  | "work"
  | "fitness"
  | "health"
  | "brain"
  | "spirit"
  | "social"
  | "finance"
  | "home"
  | "creative"
  | "other";

export type PlannerEntry = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD

  // Zeit-Felder (optional für "ganztägig")
  // WICHTIG: Diese 3 müssen immer synchron sein!
  startTime?: string; // HH:MM
  durationMinute?: number; // Minuten
  endDate?: string; // YYYY-MM-DD (wenn über Mitternacht)
  endTime?: string; // HH:MM

  // Metadata
  category?: PlannerCategory;
  habitId?: string;
  note?: string;
  color?: string;

  // Status
  doneAt?: number;
  createdAt: number;
};

export type AddEntryInput = {
  title: string;
  date: string;

  // User kann ENTWEDER Duration ODER End angeben
  startTime?: string;
  durationMinute?: number;
  endDate?: string;
  endTime?: string;

  category?: PlannerCategory;
  habitId?: string;
  note?: string;
  color?: string;
  doneAt?: number;
};
