// store/focusStore.ts
// Offline-first: Sessions lokal + Supabase.
import { DEFAULT_POMODORO_CONFIG, PomodoroConfig } from "@/hooks/usePomodoro";
import {
  getCurrentUser,
  syncLoadSingle,
  syncUpsert,
  syncUpsertSingle,
} from "@/lib/sync";
import { syncWidgetData } from "@/modules/widgetBridge";
import { storage } from "@/services/storage";
import { FocusSession, FocusStats } from "@/types/focus";
import { dateToLocalString, getTodayTimestamp } from "@/utils/dateUtils";
import { isScheduledForToday } from "@/utils/scheduleUtils";
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
  streakFreezeAvailable: false,
  lastFreezeWeek: "",
};

function getISOWeekString(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ─── Widget-Sync: lazy, kein Circular Import ──────────────────────────────────
// Greift zur Laufzeit auf beide Stores zu — kein Top-Level-Import nötig
function syncWidget(sessions: FocusSession[], currentStreak: number): void {
  try {
    // Lazy require verhindert Circular Dependency
    const { useHabitStore } = require("./habitStore");
    const { useUserStore } = require("./userStore");

    const { habits } = useHabitStore.getState();
    const { name } = useUserStore.getState();

    const todayTs = getTodayTimestamp();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayFocusMinutes = sessions
      .filter((s) => s.startedAt >= todayStart.getTime())
      .reduce(
        (sum, s) =>
          sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
        0
      );

    const todayHabits = habits.filter((h: any) =>
      isScheduledForToday(h.schedule)
    );

    syncWidgetData({
      streak: currentStreak,
      todayFocusMinutes,
      habitsCompleted: todayHabits.filter((h: any) =>
        h.completedDates.includes(todayTs)
      ).length,
      habitsTotal: todayHabits.length,
      userName: name && name !== "_onboarded" ? name : null,
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    // Widget-Sync ist best-effort — nie die App blockieren
  }
}

// ─── Supabase Mappings ────────────────────────────────────────────────────────
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

  addSession: (session) => {
    const focusSeconds = session.focusSeconds ?? session.durationSeconds;
    const pomodoroCount = session.pomodoroCount ?? 0;

    // Unter 60s und kein vollständiger Zyklus → verwerfen
    if (session.status === "interrupted" && focusSeconds < 60) return;

    const newSessions = [...get().sessions, session];
    const focusMinutes = Math.floor(focusSeconds / 60);
    const prev = get().stats;

    const updatedStats: FocusStats = {
      ...prev,
      totalSessions:
        prev.totalSessions + (session.status === "complete" ? 1 : 0),
      totalMinutes:
        prev.totalMinutes +
        (session.status === "complete"
          ? focusMinutes
          : Math.floor(focusMinutes / 2)),
      longestSessionMinutes:
        session.status === "complete"
          ? Math.max(prev.longestSessionMinutes, focusMinutes)
          : prev.longestSessionMinutes,
      pomodorosCompleted: prev.pomodorosCompleted + pomodoroCount,
    };

    set({ sessions: newSessions, stats: updatedStats });
    storage.save("focus_sessions", newSessions);
    storage.save("focus_stats", updatedStats);

    // Async: Supabase + Streak + Widget — blockiert UI nie
    sessionToRow(session).then((row) => {
      if (row) syncUpsert("focus_sessions", row);
    });
    syncStats(updatedStats);
    setTimeout(() => {
      try {
        const { useSocialStore } = require("@/store/socialStore");
        const { useUserStore } = require("./userStore");
        const { useHabitStore } = require("./habitStore");

        const { name } = useUserStore.getState();
        const { habits } = useHabitStore.getState();

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        weekStart.setHours(0, 0, 0, 0);

        const sessions = get().sessions;
        const weekMinutes = sessions
          .filter((s: any) => s.startedAt >= weekStart.getTime())
          .reduce(
            (sum: number, s: any) =>
              sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
            0
          );

        useSocialStore.getState().syncMyStats({
          weekMinutes,
          totalHours: Math.floor(updatedStats.totalMinutes / 60),
          currentStreak: updatedStats.currentStreak,
          bestStreak: updatedStats.bestStreak,
          displayName: name && name !== "_onboarded" ? name : "Anonym",
          avatarColor: "#3b8995",
        });
      } catch {
        // best-effort
      }
    }, 0);
    get().updateStreak();

    // Widget nach Streak-Update syncen (nächster Tick damit updateStreak fertig ist)
    setTimeout(() => syncWidget(newSessions, get().stats.currentStreak), 0);
  },

  updateStreak: () => {
    const today = dateToLocalString(new Date());
    const lastFocus = get().stats.lastFocusDate;
    if (lastFocus === today) return;

    const yesterday = dateToLocalString(new Date(Date.now() - 86_400_000));
    const dayBeforeYesterday = dateToLocalString(
      new Date(Date.now() - 172_800_000)
    );
    const thisWeek = getISOWeekString(new Date());

    const { currentStreak, streakFreezeAvailable, lastFreezeWeek } =
      get().stats;

    // ── Streak berechnen ────────────────────────────────────────────────
    let newStreak: number;
    let freezeConsumed = false;

    if (lastFocus === yesterday) {
      // Normaler Folgetag
      newStreak = currentStreak + 1;
    } else if (
      lastFocus === dayBeforeYesterday &&
      streakFreezeAvailable &&
      currentStreak >= 5
    ) {
      // Genau 1 Aussetzer + Freeze verfügbar → Streak retten
      newStreak = currentStreak + 1;
      freezeConsumed = true;
    } else {
      // Zu lange Pause → Reset
      newStreak = 1;
    }

    // ── Freeze-Status aktualisieren ─────────────────────────────────────
    // Freeze wird wöchentlich regeneriert wenn:
    // — neuer Streak ≥ 5
    // — diese Woche noch nicht regeneriert
    // — nicht gerade verbraucht
    let newFreezeAvailable: boolean;
    let newLastFreezeWeek: string;

    if (freezeConsumed) {
      newFreezeAvailable = false;
      newLastFreezeWeek = thisWeek;
    } else if (newStreak >= 5 && lastFreezeWeek !== thisWeek) {
      newFreezeAvailable = true;
      newLastFreezeWeek = thisWeek;
    } else {
      newFreezeAvailable = streakFreezeAvailable ?? false;
      newLastFreezeWeek = lastFreezeWeek ?? "";
    }

    const updatedStats: FocusStats = {
      ...get().stats,
      currentStreak: newStreak,
      bestStreak: Math.max(get().stats.bestStreak, newStreak),
      lastFocusDate: today,
      streakFreezeAvailable: newFreezeAvailable,
      lastFreezeWeek: newLastFreezeWeek,
    };
    set({ stats: updatedStats });
    storage.save("focus_stats", updatedStats);
    syncStats(updatedStats);
  },

  loadStats: async () => {
    const [
      localStats,
      localSessions,
      localSound,
      localSelectedSound,
      localPomodoroConfig,
    ] = await Promise.all([
      storage.load<FocusStats>("focus_stats"),
      storage.load<FocusSession[]>("focus_sessions"),
      storage.load<boolean>("focus_sound_enabled"),
      storage.load<AmbientSound>("focus_selected_sound"),
      storage.load<PomodoroConfig>("focus_pomodoro_config"),
    ]);

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

  setSound: (sound) => {
    set({ selectedSound: sound, soundEnabled: sound !== "none" });
    storage.save("focus_selected_sound", sound);
    storage.save("focus_sound_enabled", sound !== "none");
  },

  setPomodoroConfig: (config) => {
    set({ pomodoroConfig: config });
    storage.save("focus_pomodoro_config", config);
  },
}));
