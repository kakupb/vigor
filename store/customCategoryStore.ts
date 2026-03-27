// store/customCategoryStore.ts
// Benutzerdefinierte Kategorien — lokal gespeichert.
// Technisch als "other" getypt, aber mit eigenem Label + Farbe angezeigt.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type CustomCategory = {
  id: string; // "custom_uuid"
  label: string;
  color: string;
  emoji: string;
  createdAt: number;
};

const STORAGE_KEY = "custom_categories_v1";

const PRESET_COLORS = [
  "#3b8995",
  "#4b60af",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

const PRESET_EMOJIS = [
  "📚",
  "🎯",
  "💪",
  "🎨",
  "🎵",
  "✈️",
  "🍳",
  "🌱",
  "💻",
  "🏃",
  "🧘",
  "🎭",
  "📝",
  "🔬",
  "🏋️",
  "🎮",
];

type CustomCategoryState = {
  categories: CustomCategory[];
  load: () => Promise<void>;
  add: (label: string, color: string, emoji: string) => void;
  remove: (id: string) => void;
  presetColors: string[];
  presetEmojis: string[];
};

export const useCustomCategoryStore = create<CustomCategoryState>(
  (set, get) => ({
    categories: [],
    presetColors: PRESET_COLORS,
    presetEmojis: PRESET_EMOJIS,

    load: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) set({ categories: JSON.parse(raw) });
      } catch {}
    },

    add: (label, color, emoji) => {
      const newCat: CustomCategory = {
        id: `custom_${Date.now()}`,
        label: label.trim(),
        color,
        emoji,
        createdAt: Date.now(),
      };
      const updated = [...get().categories, newCat];
      set({ categories: updated });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },

    remove: (id) => {
      const updated = get().categories.filter((c) => c.id !== id);
      set({ categories: updated });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
  })
);
