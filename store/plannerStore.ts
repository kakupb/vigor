// store/plannerStore.ts
// Offline-first: AsyncStorage sofort, Supabase im Hintergrund.
import { sanitizeCategory } from "@/constants/categories";
import {
  getCurrentUser,
  migrateLocalToSupabase,
  syncDelete,
  syncLoad,
  syncUpsert,
} from "@/lib/sync";
import * as plannerService from "@/services/plannerService";
import { computeDurationFromStartAndEnd } from "@/services/plannerService";
import { storage } from "@/services/storage";
import { AddEntryInput, PlannerEntry } from "@/types/planner";
import * as Crypto from "expo-crypto";
import { create } from "zustand";

// ─── Mapping: PlannerEntry → Supabase row ────────────────────────────────────
async function toRow(e: PlannerEntry) {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: e.id,
    user_id: user.id,
    title: e.title,
    date: e.date,
    end_date: e.endDate ?? null,
    start_time: e.startTime ?? null,
    end_time: e.endTime ?? null,
    duration_minute: e.durationMinute ?? null,
    category: e.category ?? null,
    custom_category_id: e.customCategoryId ?? null, // ← muss da sein
    note: e.note ?? null,
    done_at: e.doneAt ?? null,
  };
}

function fromRow(r: any): PlannerEntry {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    endDate: r.end_date ?? undefined,
    startTime: r.start_time ?? undefined,
    endTime: r.end_time ?? undefined,
    durationMinute: r.duration_minute ?? undefined,
    category: sanitizeCategory(r.category),
    customCategoryId: r.custom_category_id ?? undefined, // ← NEU
    note: r.note ?? undefined,
    doneAt: r.done_at ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function persist(entries: PlannerEntry[]) {
  storage.planner.save(entries);
}

async function persistAndSync(entries: PlannerEntry[], changed: PlannerEntry) {
  storage.planner.save(entries);
  const row = await toRow(changed);
  if (row) syncUpsert("planner_entries", row);
}

// ─── Store ────────────────────────────────────────────────────────────────────
type PlannerState = {
  entries: PlannerEntry[];
  addEntry: (input: AddEntryInput) => void;
  updateEntry: (id: string, input: AddEntryInput) => void;
  toggleDone: (id: string) => void;
  deleteEntry: (id: string) => void;
  loadEntries: () => Promise<void>;
  clearAll: () => Promise<void>;
};

export const usePlannerStore = create<PlannerState>((set, get) => ({
  entries: [],

  addEntry: (input) => {
    const normalized = plannerService.normalizeEntry(input);
    const newEntry: PlannerEntry = {
      id: Crypto.randomUUID(),
      createdAt: Date.now(),
      ...normalized,
      customCategoryId: input.customCategoryId, // ← explizit
      doneAt: input.doneAt,
    };
    const updated = [...get().entries, newEntry];
    set({ entries: updated });
    persistAndSync(updated, newEntry);
  },

  updateEntry: (id, input) => {
    const normalized = plannerService.normalizeEntry(input);
    const updated = get().entries.map((e) =>
      e.id === id
        ? { ...e, ...normalized, customCategoryId: input.customCategoryId } // ← explizit
        : e
    );
    set({ entries: updated });
    const changed = updated.find((e) => e.id === id)!;
    persistAndSync(updated, changed);
  },

  toggleDone: (id) => {
    const updated = get().entries.map((e) =>
      e.id !== id
        ? e
        : { ...e, doneAt: e.doneAt ? undefined : new Date().toISOString() }
    );
    set({ entries: updated });
    const changed = updated.find((e) => e.id === id)!;
    persistAndSync(updated, changed);
  },

  deleteEntry: (id) => {
    const updated = get().entries.filter((e) => e.id !== id);
    set({ entries: updated });
    persist(updated);
    syncDelete("planner_entries", id);
  },

  loadEntries: async () => {
    const local = await storage.planner.load();

    const cloud = await syncLoad<PlannerEntry>("planner_entries", fromRow);

    if (cloud && cloud.length > 0) {
      // Local-Map für Fallback
      const localMap = new Map((local ?? []).map((e: any) => [e.id, e]));

      // customCategoryId aus lokal retten falls Cloud-Spalte fehlt
      const merged = cloud.map((e) => ({
        ...e,
        customCategoryId:
          e.customCategoryId ?? localMap.get(e.id)?.customCategoryId,
      }));

      set({ entries: merged });
      storage.planner.save(merged);
      return;
    }

    // Lokale Daten — rest bleibt unverändert
    if (local && local.length > 0) {
      const normalized = local.map((e: any) => ({
        ...e,
        createdAt: e.createdAt ?? Date.now(),
        category: sanitizeCategory(e.category),
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
      storage.planner.save(normalized);

      const user = await getCurrentUser();
      if (user) {
        const rows = await Promise.all(normalized.map(toRow));
        migrateLocalToSupabase(
          "planner_entries",
          rows.filter(Boolean) as object[]
        );
      }
    }
  },

  clearAll: async () => {
    set({ entries: [] });
    await storage.planner.clear();
    // Cloud-Einträge löschen
    try {
      const user = await getCurrentUser();
      if (user) {
        await import("@/lib/supabase").then(({ supabase }) =>
          supabase.from("planner_entries").delete().eq("user_id", user.id)
        );
      }
    } catch {}
  },
}));
