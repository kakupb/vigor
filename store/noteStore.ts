// store/noteStore.ts
// Offline-first: AsyncStorage sofort, Supabase im Hintergrund.
// Bilder bleiben lokal (Dateipfade) — nur Metadaten & Blöcke in Supabase.
import {
  getCurrentUser,
  migrateLocalToSupabase,
  syncDelete,
  syncLoad,
  syncUpsert,
} from "@/lib/sync";
import { storage } from "@/services/storage";
import { NoteBlock, NoteTextBlock, note } from "@/types/note";
import * as Crypto from "expo-crypto";
import { create } from "zustand";

const DEFAULT_IMAGE_SIZE = 220;

function deriveContent(blocks: NoteBlock[]): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as NoteTextBlock).content)
    .join("\n")
    .trim();
}

// ─── Mapping: note → Supabase row ────────────────────────────────────────────
async function toRow(n: note) {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: n.id,
    user_id: user.id,
    title: n.title ?? "",
    content: n.content ?? "",
    blocks: n.blocks,
    tags: n.tags ?? [],
    linked_habit_ids: n.linkedHabitIds ?? [],
    linked_planner_ids: n.linkedPlannerIds ?? [],
    is_pinned: n.isPinned ?? false,
    is_favorite: n.isFavorite ?? false,
    date: n.date,
  };
}

// ─── Mapping: Supabase row → note ────────────────────────────────────────────
function fromRow(r: any): note {
  return {
    id: r.id,
    title: r.title ?? "",
    content: r.content ?? "",
    blocks: r.blocks ?? [],
    tags: r.tags ?? [],
    linkedHabitIds: r.linked_habit_ids ?? [],
    linkedPlannerIds: r.linked_planner_ids ?? [],
    isPinned: r.is_pinned ?? false,
    isFavorite: r.is_favorite ?? false,
    date: r.date ?? "",
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
  };
}

// ─── Hilfsfunktion: speichern + syncen ───────────────────────────────────────
function persist(notes: note[]) {
  storage.notes.save(notes);
}

async function persistAndSync(notes: note[], changed: note) {
  storage.notes.save(notes);
  const row = await toRow(changed);
  if (row) syncUpsert("notes", row);
}

// ─── Store ────────────────────────────────────────────────────────────────────
type NoteState = {
  notes: note[];
  addNote: (
    blocks: NoteBlock[],
    date: string,
    title?: string,
    tags?: string[],
    linkedHabitIds?: string[],
    linkedPlannerIds?: string[]
  ) => void;
  updateNote: (
    id: string,
    blocks: NoteBlock[],
    title?: string,
    tags?: string[],
    linkedHabitIds?: string[],
    linkedPlannerIds?: string[]
  ) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  linkToHabit: (id: string, habitId: string) => void;
  linkToPlanner: (id: string, plannerId: string) => void;
  loadNotes: () => Promise<void>;
};

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],

  addNote: (blocks, date, title, tags, linkedHabitIds, linkedPlannerIds) => {
    const newNote: note = {
      id: Crypto.randomUUID(),
      title: title ?? "",
      content: deriveContent(blocks),
      blocks,
      date,
      createdAt: Date.now(),
      tags: tags ?? [],
      linkedHabitIds: linkedHabitIds ?? [],
      linkedPlannerIds: linkedPlannerIds ?? [],
      isPinned: false,
      isFavorite: false,
    };
    const updated = [...get().notes, newNote];
    set({ notes: updated });
    persistAndSync(updated, newNote);
  },

  updateNote: (id, blocks, title, tags, linkedHabitIds, linkedPlannerIds) => {
    const updated = get().notes.map((n) =>
      n.id !== id
        ? n
        : {
            ...n,
            blocks,
            content: deriveContent(blocks),
            title: title ?? n.title,
            tags: tags ?? n.tags,
            linkedHabitIds: linkedHabitIds ?? n.linkedHabitIds,
            linkedPlannerIds: linkedPlannerIds ?? n.linkedPlannerIds,
            updatedAt: Date.now(),
          }
    );
    set({ notes: updated });
    const changed = updated.find((n) => n.id === id)!;
    persistAndSync(updated, changed);
  },

  deleteNote: (id) => {
    const updated = get().notes.filter((n) => n.id !== id);
    set({ notes: updated });
    persist(updated);
    syncDelete("notes", id);
  },

  togglePin: (id) => {
    const updated = get().notes.map((n) =>
      n.id === id ? { ...n, isPinned: !n.isPinned } : n
    );
    set({ notes: updated });
    const changed = updated.find((n) => n.id === id)!;
    persistAndSync(updated, changed);
  },

  toggleFavorite: (id) => {
    const updated = get().notes.map((n) =>
      n.id === id ? { ...n, isFavorite: !n.isFavorite } : n
    );
    set({ notes: updated });
    const changed = updated.find((n) => n.id === id)!;
    persistAndSync(updated, changed);
  },

  linkToHabit: (noteId, habitId) => {
    const updated = get().notes.map((n) => {
      if (n.id !== noteId) return n;
      const links = n.linkedHabitIds ?? [];
      return {
        ...n,
        linkedHabitIds: links.includes(habitId)
          ? links.filter((id) => id !== habitId)
          : [...links, habitId],
      };
    });
    set({ notes: updated });
    const changed = updated.find((n) => n.id === noteId)!;
    persistAndSync(updated, changed);
  },

  linkToPlanner: (noteId, plannerId) => {
    const updated = get().notes.map((n) => {
      if (n.id !== noteId) return n;
      const links = n.linkedPlannerIds ?? [];
      return {
        ...n,
        linkedPlannerIds: links.includes(plannerId)
          ? links.filter((id) => id !== plannerId)
          : [...links, plannerId],
      };
    });
    set({ notes: updated });
    const changed = updated.find((n) => n.id === noteId)!;
    persistAndSync(updated, changed);
  },

  loadNotes: async () => {
    // ── GUARD: Nicht neu laden wenn bereits Daten im Speicher ─────────────────
    if (get().notes.length > 0) return;

    // 1. Lokal laden und SOFORT anzeigen (kein Warten auf Netz)
    const local = await storage.notes.load();
    if (local && local.length > 0) {
      const migrated = local.map((n) => {
        if (n.blocks && n.blocks.length > 0) return n;
        const blocks: NoteBlock[] = [];
        if (n.content)
          blocks.push({
            id: Crypto.randomUUID(),
            type: "text",
            content: n.content,
          });
        for (const img of n.images ?? [])
          blocks.push({
            id: img.id,
            type: "image",
            uri: img.uri,
            caption: img.caption,
            size: DEFAULT_IMAGE_SIZE,
            createdAt: img.createdAt,
          });
        for (const tbl of n.tables ?? [])
          blocks.push({
            id: tbl.id,
            type: "table",
            headers: tbl.headers,
            rows: tbl.rows,
          });
        if (!blocks.length)
          blocks.push({ id: Crypto.randomUUID(), type: "text", content: "" });
        return {
          ...n,
          blocks,
          linkedHabitIds: n.linkedHabitIds ?? [],
          linkedPlannerIds: n.linkedPlannerIds ?? [],
        };
      });
      // ── Sofort rendern, nicht auf Cloud warten ────────────────────────────
      set({ notes: migrated });
      storage.notes.save(migrated);
    }

    // 2. Cloud im Hintergrund syncen (blockiert die UI nicht mehr)
    const cloud = await syncLoad<note>("notes", fromRow);
    if (cloud && cloud.length > 0) {
      set({ notes: cloud });
      storage.notes.save(cloud);
      return;
    }

    // 3. Migration zu Supabase (einmalig, im Hintergrund)
    const current = get().notes;
    if (current.length > 0) {
      const user = await getCurrentUser();
      if (user) {
        const rows = await Promise.all(current.map(toRow));
        migrateLocalToSupabase("notes", rows.filter(Boolean) as object[]);
      }
    }
  },
}));
