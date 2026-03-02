import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  HABITS: "habits",
  PLANNER: "planner_entries_v1",
  NOTES: "notes_v1",
} as const;

export const storage = {
  /**
   * Speichert Daten unter einem Key
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      const jsonString = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonString);
    } catch (error) {
      console.error(`[Storage] Failed to save ${key}:`, error);
      throw new Error(`Speichern fehlgeschlagen: ${key}`);
    }
  },

  /**
   * Lädt Daten von einem Key
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      const jsonString = await AsyncStorage.getItem(key);
      if (!jsonString) return null;

      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error(`[Storage] Failed to load ${key}:`, error);
      return null;
    }
  },

  /**
   * Löscht Daten unter einem Key
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Failed to remove ${key}:`, error);
      throw new Error(`Löschen fehlgeschlagen: ${key}`);
    }
  },

  /**
   * Löscht ALLE Daten (für Settings/Reset)
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error("[Storage] Failed to clear all:", error);
      throw new Error("Löschen aller Daten fehlgeschlagen");
    }
  },

  // Convenience Methods für spezifische Daten
  habits: {
    save: (habits: any[]) => storage.save(STORAGE_KEYS.HABITS, habits),
    load: () => storage.load<any[]>(STORAGE_KEYS.HABITS),
    clear: () => storage.remove(STORAGE_KEYS.HABITS),
  },

  planner: {
    save: (entries: any[]) => storage.save(STORAGE_KEYS.PLANNER, entries),
    load: () => storage.load<any[]>(STORAGE_KEYS.PLANNER),
    clear: () => storage.remove(STORAGE_KEYS.PLANNER),
  },
  notes: {
    save: (notes: any[]) => storage.save(STORAGE_KEYS.NOTES, notes),
    load: () => storage.load<any[]>(STORAGE_KEYS.NOTES),
    clear: () => storage.remove(STORAGE_KEYS.NOTES),
  },
};
