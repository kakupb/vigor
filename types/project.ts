// types/project.ts
// Fokus-Projekte — leichtgewichtig, lokal gespeichert.
// Kein Supabase-Sync in v1 (bewusste Entscheidung: kein Overhead).

export type Project = {
  id: string;
  title: string;
  color: string; // Hex-Farbe, z.B. "#3b8995"
  emoji?: string; // Optional, z.B. "📚"
  goalHours?: number; // Geschätztes Gesamtziel in Stunden (z.B. 80)
  createdAt: number;
  archivedAt?: number; // Archiviert statt gelöscht — Sessiondaten bleiben erhalten
};

// Vordefinierte Projekt-Farben (harmonisch, nicht zu grell)
export const PROJECT_COLORS = [
  "#3b8995", // Teal (Vigor-Hauptfarbe)
  "#4b60af", // Indigo
  "#8b5cf6", // Violet
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
];
