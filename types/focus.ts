// types/focus.ts
// Ergänzt: projectId + projectTitle für Projekt-Tracking

import { PlannerCategory } from "./planner";

export type SessionStatus = "complete" | "interrupted";

export type FocusSession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  entryId?: string;
  entryTitle?: string;
  category?: PlannerCategory;
  // ── Projekt-Tracking (NEU) ────────────────────────────────────────────────
  projectId?: string; // Referenz auf Project.id
  projectTitle?: string; // Snapshot des Titels (bleibt erhalten wenn Projekt umbenannt wird)
  // ─────────────────────────────────────────────────────────────────────────
  durationSeconds: number;
  focusSeconds?: number;
  status?: SessionStatus;
  completed: boolean;
  pomodoroCount?: number;
};

export type FocusStats = {
  totalSessions: number;
  totalMinutes: number;
  longestSessionMinutes: number;
  currentStreak: number;
  bestStreak: number;
  lastFocusDate: string; // YYYY-MM-DD
  pomodorosCompleted: number;
  streakFreezeAvailable?: boolean;
  lastFreezeWeek?: string;
};

export type SlothMood = {
  emoji: string;
  activity: string;
  motivationalText: string;
};

export type PomodoroState = {
  isActive: boolean;
  timeRemaining: number;
  isBreak: boolean;
  completedPomodoros: number;
};
