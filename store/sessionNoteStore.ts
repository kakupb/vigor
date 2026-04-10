// store/sessionNoteStore.ts
// Persistiert SessionNotes per sessionId in AsyncStorage.
// Keine Cloud-Sync in v1 — sensible Reflexionen bleiben lokal.

import { SessionNote } from "@/types/sessionNote";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "session_notes_v1";

type SessionNoteState = {
  notes: SessionNote[];

  addNote: (note: SessionNote) => Promise<void>;
  updateNote: (id: string, updates: Partial<SessionNote>) => Promise<void>;
  getBySessionId: (sessionId: string) => SessionNote | undefined;
  getLastByProjectId: (projectId: string) => SessionNote | undefined;
  load: () => Promise<void>;
};

async function persist(notes: SessionNote[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

export const useSessionNoteStore = create<SessionNoteState>((set, get) => ({
  notes: [],

  addNote: async (note) => {
    const updated = [...get().notes.filter((n) => n.id !== note.id), note];
    set({ notes: updated });
    await persist(updated);
  },

  updateNote: async (id, updates) => {
    const updated = get().notes.map((n) =>
      n.id === id ? { ...n, ...updates } : n
    );
    set({ notes: updated });
    await persist(updated);
  },

  getBySessionId: (sessionId) =>
    get().notes.find((n) => n.sessionId === sessionId),

  getLastByProjectId: (projectId) => {
    const projectNotes = get()
      .notes.filter((n) => n.projectId === projectId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return projectNotes[0];
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ notes: JSON.parse(raw) });
    } catch {}
  },
}));
