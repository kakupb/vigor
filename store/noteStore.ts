// store/noteStore.ts
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
      title: title || "",
      content: deriveContent(blocks),
      blocks,
      date,
      createdAt: Date.now(),
      tags: tags || [],
      linkedHabitIds: linkedHabitIds || [],
      linkedPlannerIds: linkedPlannerIds || [],
      isPinned: false,
      isFavorite: false,
    };
    const updated = [...get().notes, newNote];
    set({ notes: updated });
    storage.notes.save(updated);
  },

  updateNote: (id, blocks, title, tags, linkedHabitIds, linkedPlannerIds) => {
    const updated = get().notes.map((note) =>
      note.id === id
        ? {
            ...note,
            blocks,
            content: deriveContent(blocks),
            title: title ?? note.title,
            tags: tags ?? note.tags,
            linkedHabitIds: linkedHabitIds ?? note.linkedHabitIds,
            linkedPlannerIds: linkedPlannerIds ?? note.linkedPlannerIds,
            updatedAt: Date.now(),
          }
        : note
    );
    set({ notes: updated });
    storage.notes.save(updated);
  },

  deleteNote: (id) => {
    const updated = get().notes.filter((n) => n.id !== id);
    set({ notes: updated });
    storage.notes.save(updated);
  },

  togglePin: (id) => {
    const updated = get().notes.map((note) =>
      note.id === id ? { ...note, isPinned: !note.isPinned } : note
    );
    set({ notes: updated });
    storage.notes.save(updated);
  },

  toggleFavorite: (id) => {
    const updated = get().notes.map((note) =>
      note.id === id ? { ...note, isFavorite: !note.isFavorite } : note
    );
    set({ notes: updated });
    storage.notes.save(updated);
  },

  linkToHabit: (noteId, habitId) => {
    const updated = get().notes.map((note) => {
      if (note.id !== noteId) return note;
      const links = note.linkedHabitIds || [];
      return {
        ...note,
        linkedHabitIds: links.includes(habitId)
          ? links.filter((id) => id !== habitId)
          : [...links, habitId],
      };
    });
    set({ notes: updated });
    storage.notes.save(updated);
  },

  linkToPlanner: (noteId, plannerId) => {
    const updated = get().notes.map((note) => {
      if (note.id !== noteId) return note;
      const links = note.linkedPlannerIds || [];
      return {
        ...note,
        linkedPlannerIds: links.includes(plannerId)
          ? links.filter((id) => id !== plannerId)
          : [...links, plannerId],
      };
    });
    set({ notes: updated });
    storage.notes.save(updated);
  },

  loadNotes: async () => {
    const notes = await storage.notes.load();
    if (!notes) return;

    // Migration: alte Notizen (content + images + tables) → blocks
    const migrated = notes.map((n) => {
      if (n.blocks && n.blocks.length > 0) return n;

      const blocks: NoteBlock[] = [];
      if (n.content) {
        blocks.push({
          id: Crypto.randomUUID(),
          type: "text",
          content: n.content,
        });
      }
      for (const img of n.images || []) {
        blocks.push({
          id: img.id,
          type: "image",
          uri: img.uri,
          caption: img.caption,
          size: DEFAULT_IMAGE_SIZE,
          createdAt: img.createdAt,
        });
      }
      for (const table of n.tables || []) {
        blocks.push({
          id: table.id,
          type: "table",
          headers: table.headers,
          rows: table.rows,
        });
      }
      if (blocks.length === 0) {
        blocks.push({ id: Crypto.randomUUID(), type: "text", content: "" });
      }

      return {
        ...n,
        blocks,
        linkedHabitIds: n.linkedHabitIds || [],
        linkedPlannerIds: n.linkedPlannerIds || [],
      };
    });

    set({ notes: migrated });
    storage.notes.save(migrated);
  },
}));
