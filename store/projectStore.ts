// store/projectStore.ts
// Fokus-Projekte — lokal per AsyncStorage, kein Supabase in v1.
//
// Das Wichtigste: currentProject.
// Wird von ProjectPickerSheet gesetzt, von FocusScreen beim Session-Ende gelesen.
// Nach Session-Ende automatisch zurückgesetzt (clearCurrentProject).

import { Project } from "@/types/project";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { create } from "zustand";

const STORAGE_KEY = "vigor_projects_v1";

// ─── Persistenz ───────────────────────────────────────────────────────────────
async function persist(projects: Project[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {}
}

// ─── Store ────────────────────────────────────────────────────────────────────
type ProjectState = {
  projects: Project[];
  currentProject: Project | null; // Das Projekt der nächsten/laufenden Session

  // CRUD
  addProject: (
    title: string,
    color: string,
    emoji?: string,
    goalHours?: number
  ) => Project;
  updateProject: (
    id: string,
    updates: Partial<Omit<Project, "id" | "createdAt">>
  ) => void;
  archiveProject: (id: string) => void; // Soft delete — Sessions bleiben erhalten
  deleteProject: (id: string) => void; // Hard delete

  // Session-Kontext
  setCurrentProject: (project: Project | null) => void;
  clearCurrentProject: () => void;

  // Persistenz
  load: () => Promise<void>;

  // Hilfsfunktion: aktive Projekte (nicht archiviert), nach letzter Verwendung sortiert
  getActiveProjects: () => Project[];
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,

  addProject: (title, color, emoji, goalHours) => {
    const newProject: Project = {
      id: Crypto.randomUUID(),
      title: title.trim(),
      color,
      emoji,
      goalHours,
      createdAt: Date.now(),
    };
    const updated = [...get().projects, newProject];
    set({ projects: updated });
    persist(updated);
    return newProject;
  },

  updateProject: (id, updates) => {
    const updated = get().projects.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ projects: updated });
    persist(updated);
  },

  archiveProject: (id) => {
    const updated = get().projects.map((p) =>
      p.id === id ? { ...p, archivedAt: Date.now() } : p
    );
    set({ projects: updated });
    persist(updated);
    // Wenn das aktuelle Projekt archiviert wird, zurücksetzen
    if (get().currentProject?.id === id) {
      set({ currentProject: null });
    }
  },

  deleteProject: (id) => {
    const updated = get().projects.filter((p) => p.id !== id);
    set({ projects: updated });
    persist(updated);
    if (get().currentProject?.id === id) {
      set({ currentProject: null });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),
  clearCurrentProject: () => set({ currentProject: null }),

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Project[] = JSON.parse(raw);
        set({ projects: parsed });
      }
    } catch {}
  },

  getActiveProjects: () => get().projects.filter((p) => !p.archivedAt),
}));
