// store/focusStore.ts
// Offline-first: Sessions lokal + Supabase.
// Stats als Single-Row Upsert (eine Zeile pro User).
import {
  getCurrentUser,
  syncLoadSingle,
  syncUpsert,
  syncUpsertSingle,
} from "@/lib/sync";
import { storage } from "@/services/storage";
import { FocusSession, FocusStats } from "@/types/focus";
import { dateToLocalString } from "@/utils/dateUtils";
import { create } from "zustand";

const defaultStats: FocusStats = {
  totalSessions: 0,
  totalMinutes: 0,
  longestSessionMinutes: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastFocusDate: "",
  pomodorosCompleted: 0,
};

// ─── Mapping ──────────────────────────────────────────────────────────────────
async function sessionToRow(s: FocusSession) {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: s.id,
    user_id: user.id,
    duration_seconds: s.durationSeconds,
    pomodoro_count: s.pomodoroCount ?? 0,
    started_at: new Date(s.startedAt).toISOString(),
  };
}

function statsFromRow(r: any): FocusStats {
  return {
    totalSessions: r.total_sessions ?? 0,
    totalMinutes: r.total_minutes ?? 0,
    longestSessionMinutes: r.longest_session_minutes ?? 0,
    currentStreak: r.current_streak ?? 0,
    bestStreak: r.best_streak ?? 0,
    lastFocusDate: r.last_focus_date ?? "",
    pomodorosCompleted: r.pomodoros_completed ?? 0,
  };
}

async function syncStats(stats: FocusStats) {
  syncUpsertSingle("focus_stats", {
    total_sessions: stats.totalSessions,
    total_minutes: stats.totalMinutes,
    longest_session_minutes: stats.longestSessionMinutes,
    current_streak: stats.currentStreak,
    best_streak: stats.bestStreak,
    last_focus_date: stats.lastFocusDate,
    pomodoros_completed: stats.pomodorosCompleted,
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────
type FocusState = {
  stats: FocusStats;
  sessions: FocusSession[];
  soundEnabled: boolean;
  addSession: (session: FocusSession) => void;
  loadStats: () => Promise<void>;
  toggleSound: () => void;
  updateStreak: () => void;
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
        get().stats.pomodorosCompleted + (session.pomodoroCount ?? 0),
    };

    set({ sessions: newSessions, stats: updatedStats });

    // Lokal speichern
    storage.save("focus_sessions", newSessions);
    storage.save("focus_stats", updatedStats);

    // Supabase: Session + Stats
    sessionToRow(session).then((row) => {
      if (row) syncUpsert("focus_sessions", row);
    });
    syncStats(updatedStats);

    get().updateStreak();
  },

  updateStreak: () => {
    const today = dateToLocalString(new Date());
    const lastFocus = get().stats.lastFocusDate;
    if (lastFocus === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dateToLocalString(yesterday);

    const newStreak =
      lastFocus === yesterdayStr
        ? get().stats.currentStreak + 1
        : lastFocus && lastFocus < yesterdayStr
        ? 1
        : 1;

    const updatedStats: FocusStats = {
      ...get().stats,
      currentStreak: newStreak,
      bestStreak: Math.max(get().stats.bestStreak, newStreak),
      lastFocusDate: today,
    };

    set({ stats: updatedStats });
    storage.save("focus_stats", updatedStats);
    syncStats(updatedStats);
  },

  loadStats: async () => {
    // 1. Lokal laden
    const localStats = await storage.load<FocusStats>("focus_stats");
    const localSessions = await storage.load<FocusSession[]>("focus_sessions");
    const localSound = await storage.load<boolean>("focus_sound_enabled");

    // 2. Cloud laden
    const cloudStats = await syncLoadSingle<FocusStats>(
      "focus_stats",
      statsFromRow
    );

    // Cloud-Daten bevorzugen (sind aktueller bei Multi-Device)
    set({
      stats: cloudStats ?? localStats ?? defaultStats,
      sessions: localSessions ?? [],
      soundEnabled: localSound ?? false,
    });

    // Lokale Stats zu Cloud migrieren falls Cloud leer
    if (!cloudStats && localStats) {
      syncStats(localStats);
    }
  },

  toggleSound: () => {
    const newValue = !get().soundEnabled;
    set({ soundEnabled: newValue });
    storage.save("focus_sound_enabled", newValue);
  },
}));
