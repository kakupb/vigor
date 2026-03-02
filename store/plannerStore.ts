///Users/yakupadar/code_projects/HabitTracker/store/plannerStore.ts
import { sanitizeCategory } from "@/constants/categories";
import * as plannerService from "@/services/plannerService";
import { computeDurationFromStartAndEnd } from "@/services/plannerService"; // falls du die Funktion nutzt
import { storage } from "@/services/storage";
import { AddEntryInput, PlannerEntry } from "@/types/planner";
import * as Crypto from "expo-crypto";
import { create } from "zustand";

type PlannerState = {
  entries: PlannerEntry[];

  addEntry: (input: AddEntryInput) => void;
  updateEntry: (id: string, input: AddEntryInput) => void;
  toggleDone: (id: string) => void;
  deleteEntry: (id: string) => void;

  loadEntries: () => Promise<void>;
  clearAll: () => Promise<void>;
};

function makeId() {
  return Crypto.randomUUID();
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  entries: [],

  addEntry: (input) => {
    const normalized = plannerService.normalizeEntry(input);

    const newEntry: PlannerEntry = {
      id: makeId(),
      createdAt: Date.now(),
      ...normalized,
      doneAt: input.doneAt,
    };

    const updated = [...get().entries, newEntry];
    set({ entries: updated });
    storage.planner.save(updated);
  },
  updateEntry: (id, input) => {
    const normalized = plannerService.normalizeEntry(input);

    const updated = get().entries.map((entry) =>
      entry.id === id ? { ...entry, ...normalized } : entry
    );

    set({ entries: updated });
    storage.planner.save(updated);
  },

  toggleDone: (id) => {
    const updated = get().entries.map((e) => {
      if (e.id !== id) return e;

      return {
        ...e,
        doneAt: e.doneAt ? undefined : Date.now(),
      };
    });

    set({ entries: updated });
    storage.planner.save(updated);
  },

  deleteEntry: (id) => {
    const updated = get().entries.filter((e) => e.id !== id);
    set({ entries: updated });
    storage.planner.save(updated);
  },

  // Ersetze deine loadEntries Funktion mit dieser Version:

  loadEntries: async () => {
    const entries = await storage.planner.load();
    if (!entries) return;

    // 🔧 MIGRATION: Normalisiere alte Daten
    const normalized = entries.map((e) => ({
      ...e,
      createdAt: e.createdAt ?? Date.now(),
      category: sanitizeCategory(e.category), // ✅ Validate category!

      // Optional: Weitere Migrations-Checks
      durationMinute:
        e.durationMinute ??
        (e.startTime && e.endTime
          ? computeDurationFromStartAndEnd(
              e.date,
              e.startTime,
              e.date,
              e.endTime
            )
          : undefined),
    }));

    set({ entries: normalized });

    // ✅ Speichere migrierte Daten zurück
    storage.planner.save(normalized);
  },

  clearAll: async () => {
    set({ entries: [] });
    await storage.planner.clear();
  },
}));
