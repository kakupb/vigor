// store/focusStore.ts

import { storage } from "@/services/storage";
import { FocusSession, FocusStats } from "@/types/focus";
import { dateToLocalString } from "@/utils/dateUtils";
import { create } from "zustand";

type FocusState = {
  stats: FocusStats;
  sessions: FocusSession[];
  soundEnabled: boolean;

  // Actions
  addSession: (session: FocusSession) => void;
  loadStats: () => Promise<void>;
  toggleSound: () => void;
  updateStreak: () => void;
};

const defaultStats: FocusStats = {
  totalSessions: 0,
  totalMinutes: 0,
  longestSessionMinutes: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastFocusDate: "",
  pomodorosCompleted: 0,
};

export const useFocusStore = create<FocusState>((set, get) => ({
  stats: defaultStats,
  sessions: [],
  soundEnabled: false,

  addSession: (session) => {
    const newSessions = [...get().sessions, session];
    const durationMinutes = Math.floor(session.durationSeconds / 60);

    const updatedStats: FocusStats = {
      ...get().stats,
      totalSessions: get().stats.totalSessions + 1,
      totalMinutes: get().stats.totalMinutes + durationMinutes,
      longestSessionMinutes: Math.max(
        get().stats.longestSessionMinutes,
        durationMinutes
      ),
      pomodorosCompleted:
        get().stats.pomodorosCompleted + (session.pomodoroCount || 0),
    };

    set({ sessions: newSessions, stats: updatedStats });

    // Persist
    storage.save("focus_sessions", newSessions);
    storage.save("focus_stats", updatedStats);

    // Update streak
    get().updateStreak();
  },

  updateStreak: () => {
    const today = dateToLocalString(new Date());
    const lastFocus = get().stats.lastFocusDate;

    if (lastFocus === today) {
      // Bereits heute fokussiert
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dateToLocalString(yesterday);

    let newStreak = 1;

    if (lastFocus === yesterdayStr) {
      // Streak fortsetzung!
      newStreak = get().stats.currentStreak + 1;
    } else if (lastFocus && lastFocus < yesterdayStr) {
      // Streak gebrochen
      newStreak = 1;
    }

    const updatedStats: FocusStats = {
      ...get().stats,
      currentStreak: newStreak,
      bestStreak: Math.max(get().stats.bestStreak, newStreak),
      lastFocusDate: today,
    };

    set({ stats: updatedStats });
    storage.save("focus_stats", updatedStats);
  },

  loadStats: async () => {
    const stats = await storage.load<FocusStats>("focus_stats");
    const sessions = await storage.load<FocusSession[]>("focus_sessions");
    const soundEnabled = await storage.load<boolean>("focus_sound_enabled");

    set({
      stats: stats || defaultStats,
      sessions: sessions || [],
      soundEnabled: soundEnabled ?? false,
    });
  },

  toggleSound: () => {
    const newValue = !get().soundEnabled;
    set({ soundEnabled: newValue });
    storage.save("focus_sound_enabled", newValue);
  },
}));
