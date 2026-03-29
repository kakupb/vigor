// types/focus.ts

import { PlannerCategory } from "./planner";

export type SessionStatus = "complete" | "interrupted";

export type FocusSession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  entryId?: string;
  entryTitle?: string;
  category?: PlannerCategory;
  durationSeconds: number;
  focusSeconds?: number; // ← NEU, optional für Rückwärtskompatibilität
  status?: SessionStatus; // ← NEU, optional
  completed: boolean;
  pomodoroCount?: number;
};

export type FocusStats = {
  totalSessions: number;
  totalMinutes: number;
  longestSessionMinutes: number;
  currentStreak: number; // Tage in Folge
  bestStreak: number;
  lastFocusDate: string; // YYYY-MM-DD
  pomodorosCompleted: number;
};

export type SlothMood = {
  emoji: string;
  activity: string;
  motivationalText: string;
};

export type PomodoroState = {
  isActive: boolean;
  timeRemaining: number; // Sekunden
  isBreak: boolean;
  completedPomodoros: number;
};
