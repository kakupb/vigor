// store/userStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

type UserState = {
  name: string | null;
  hasOnboarded: boolean;
  setName: (name: string) => Promise<void>;
  loadUser: () => Promise<void>;
};

const KEY = "user_profile_v1";

export const useUserStore = create<UserState>((set) => ({
  name: null,
  hasOnboarded: false,

  setName: async (name) => {
    const data = { name, hasOnboarded: true };
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    set({ name, hasOnboarded: true });
  },

  loadUser: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      set({
        name: data.name ?? null,
        hasOnboarded: data.hasOnboarded ?? false,
      });
    } catch {}
  },
}));
