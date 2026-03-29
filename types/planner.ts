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
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinute?: number;
  category?: PlannerCategory;
  customCategoryId?: string; // ← NEU
  color?: string;
  note?: string;
  doneAt?: string;
  createdAt: number;
};

export type AddEntryInput = {
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinute?: number;
  category?: PlannerCategory;
  customCategoryId?: string; // ← NEU
  color?: string;
  note?: string;
  doneAt?: string;
  habitId?: string;
};
