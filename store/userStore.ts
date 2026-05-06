// store/userStore.ts
import { supabase } from "@/lib/supabase";
import { scheduleHabitReminder } from "@/services/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type UserGoal = "study" | "work" | "language" | "personal";
export type FocusTime = "morning" | "afternoon" | "evening";

const PREFS_KEY = "user_prefs_v1";

export type UserPrefs = {
  goal: UserGoal;
  dailyFocusMinutes: number; // 30 | 60 | 120 | 180
  preferredTime: FocusTime;
};

const DEFAULT_PREFS: UserPrefs = {
  goal: "study",
  dailyFocusMinutes: 60,
  preferredTime: "afternoon",
};

const NOTIFICATION_TIMES: Record<FocusTime, { hour: number; minute: number }> =
  {
    morning: { hour: 8, minute: 0 },
    afternoon: { hour: 14, minute: 0 },
    evening: { hour: 19, minute: 0 },
  };

type UserState = {
  name: string | null;
  hasOnboarded: boolean | null;
  prefs: UserPrefs;

  // Actions
  completeOnboarding: (name: string, prefs: UserPrefs) => Promise<void>;
  setName: (name: string) => Promise<void>;
  loadUser: () => Promise<void>;
  updatePrefs: (prefs: Partial<UserPrefs>) => Promise<void>;
};

export const useUserStore = create<UserState>((set, get) => ({
  name: null,
  hasOnboarded: null as boolean | null,
  prefs: DEFAULT_PREFS,

  // Onboarding abschließen — speichert alles und plant Benachrichtigung
  completeOnboarding: async (name, prefs) => {
    set({ name, hasOnboarded: true, prefs });

    // Lokal speichern
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

    // Supabase
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          name,
          goal: prefs.goal,
          daily_focus_minutes: prefs.dailyFocusMinutes,
          preferred_time: prefs.preferredTime,
        });
        await supabase.auth.updateUser({ data: { name } });
      }
    } catch {}

    // Tägliche Fokus-Benachrichtigung automatisch einrichten
    try {
      const { hour, minute } = NOTIFICATION_TIMES[prefs.preferredTime];
      await scheduleHabitReminder({
        habitId: "daily-focus-reminder",
        habitTitle: "Zeit zu fokussieren!",
        hour,
        minute,
      });
    } catch {}
  },

  setName: async (name) => {
    set({ name, hasOnboarded: true });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({ id: user.id, name });
        await supabase.auth.updateUser({ data: { name } });
      }
    } catch {}
  },

  loadUser: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("name, goal, daily_focus_minutes, preferred_time")
        .eq("id", user.id)
        .maybeSingle();

      const name = data?.name ?? user.user_metadata?.name ?? null;

      // Lokale Prefs als Fallback
      const localRaw = await AsyncStorage.getItem(PREFS_KEY);
      const localPrefs: UserPrefs = localRaw
        ? JSON.parse(localRaw)
        : DEFAULT_PREFS;

      const prefs: UserPrefs = {
        goal: data?.goal ?? localPrefs.goal,
        dailyFocusMinutes:
          data?.daily_focus_minutes ?? localPrefs.dailyFocusMinutes,
        preferredTime: data?.preferred_time ?? localPrefs.preferredTime,
      };

      set({ name, hasOnboarded: !!name, prefs });
    } catch {}
  },

  updatePrefs: async (partial) => {
    const current = get().prefs;
    const updated = { ...current, ...partial };
    set({ prefs: updated });
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          goal: updated.goal,
          daily_focus_minutes: updated.dailyFocusMinutes,
          preferred_time: updated.preferredTime,
        });
      }
    } catch {}
  },
}));
