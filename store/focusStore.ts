// store/focusStore.ts
// Offline-first: Sessions lokal + Supabase.
// Neu: pomodoroConfig (einstellbare Zeiten) + selectedSound (expo-audio)
import { DEFAULT_POMODORO_CONFIG, PomodoroConfig } from "@/hooks/usePomodoro";
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

export type AmbientSound =
  | "none"
  | "white"
  | "brown"
  | "rain"
  | "ocean"
  | "forest";

export const AMBIENT_SOUNDS: {
  id: AmbientSound;
  label: string;
  icon: string;
}[] = [
  { id: "none", label: "Kein Sound", icon: "volume-mute-outline" },
  { id: "white", label: "White Noise", icon: "radio-outline" },
  { id: "brown", label: "Brown Noise", icon: "leaf-outline" },
  { id: "rain", label: "Regen", icon: "rainy-outline" },
  { id: "ocean", label: "Meer", icon: "water-outline" },
  { id: "forest", label: "Wald", icon: "partly-sunny-outline" },
];

// Dateipfade — MP3s unter assets/sounds/ ablegen
// Kostenlose Loops: freesound.org / mynoise.net (30–60 Sek. reichen, isLooping: true)
export const SOUND_FILES: Record<AmbientSound, () => any | null> = {
  none: () => null,
  white: () => require("@/assets/sounds/white-noise.mp3"),
  brown: () => require("@/assets/sounds/brown-noise.mp3"),
  rain: () => require("@/assets/sounds/rain.mp3"),
  ocean: () => require("@/assets/sounds/ocean.mp3"),
  forest: () => require("@/assets/sounds/forest.mp3"),
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

type FocusState = {
  stats: FocusStats;
  sessions: FocusSession[];
  soundEnabled: boolean;
  selectedSound: AmbientSound;
  pomodoroConfig: PomodoroConfig;

  addSession: (session: FocusSession) => void;
  loadStats: () => Promise<void>;
  toggleSound: () => void;
  setSound: (sound: AmbientSound) => void;
  setPomodoroConfig: (config: PomodoroConfig) => void;
  updateStreak: () => void;
};

export const useFocusStore = create<FocusState>((set, get) => ({
  stats: defaultStats,
  sessions: [],
  soundEnabled: false,
  selectedSound: "none",
  pomodoroConfig: DEFAULT_POMODORO_CONFIG,

  addSession: (session: FocusSession) => {
    const focusSeconds = session.focusSeconds ?? session.durationSeconds;
    const pomodoroCount = session.pomodoroCount ?? 0;

    // Aborted-Check: kein vollständiger Zyklus UND < 60s Fokuszeit → verwerfen
    if (session.status === "interrupted" && focusSeconds < 60) return;

    const newSessions = [...get().sessions, session];
    const focusMinutes = Math.floor(focusSeconds / 60);

    const updatedStats: FocusStats = {
      ...get().stats,
      totalSessions:
        get().stats.totalSessions + (session.status === "complete" ? 1 : 0),
      totalMinutes:
        get().stats.totalMinutes +
        (session.status === "complete"
          ? focusMinutes
          : Math.floor(focusMinutes / 2)),
      longestSessionMinutes:
        session.status === "complete"
          ? Math.max(get().stats.longestSessionMinutes, focusMinutes)
          : get().stats.longestSessionMinutes,
      pomodorosCompleted: get().stats.pomodorosCompleted + pomodoroCount,
    };

    set({ sessions: newSessions, stats: updatedStats });
    storage.save("focus_sessions", newSessions);
    storage.save("focus_stats", updatedStats);
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
      lastFocus === yesterdayStr ? get().stats.currentStreak + 1 : 1;

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
    const localStats = await storage.load<FocusStats>("focus_stats");
    const localSessions = await storage.load<FocusSession[]>("focus_sessions");
    const localSound = await storage.load<boolean>("focus_sound_enabled");
    const localSelectedSound = await storage.load<AmbientSound>(
      "focus_selected_sound"
    );
    const localPomodoroConfig = await storage.load<PomodoroConfig>(
      "focus_pomodoro_config"
    );
    const cloudStats = await syncLoadSingle<FocusStats>(
      "focus_stats",
      statsFromRow
    );

    set({
      stats: cloudStats ?? localStats ?? defaultStats,
      sessions: localSessions ?? [],
      soundEnabled: localSound ?? false,
      selectedSound: localSelectedSound ?? "none",
      pomodoroConfig: localPomodoroConfig ?? DEFAULT_POMODORO_CONFIG,
    });
    if (!cloudStats && localStats) syncStats(localStats);
  },

  toggleSound: () => {
    const newValue = !get().soundEnabled;
    set({ soundEnabled: newValue });
    storage.save("focus_sound_enabled", newValue);
  },

  setSound: (sound: AmbientSound) => {
    // "none" → Sound aus; alles andere → Sound an
    set({ selectedSound: sound, soundEnabled: sound !== "none" });
    storage.save("focus_selected_sound", sound);
    storage.save("focus_sound_enabled", sound !== "none");
  },

  setPomodoroConfig: (config: PomodoroConfig) => {
    set({ pomodoroConfig: config });
    storage.save("focus_pomodoro_config", config);
  },
}));
