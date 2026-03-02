// types/note.ts
export type NoteTableCell = { value: string };
export type NoteTableRow = { cells: NoteTableCell[] };

export type NoteTextBlock = { id: string; type: "text"; content: string };
export type NoteImageBlock = {
  id: string;
  type: "image";
  uri: string;
  caption?: string;
  size: number;
  createdAt: number;
};
export type NoteTableBlock = {
  id: string;
  type: "table";
  headers: string[];
  rows: NoteTableRow[];
};

export type NoteBlock = NoteTextBlock | NoteImageBlock | NoteTableBlock;

// Legacy-Typen für Migration alter Notizen
export type NoteTable = { id: string; headers: string[]; rows: NoteTableRow[] };
export type NoteImage = {
  id: string;
  uri: string;
  caption?: string;
  createdAt: number;
};

export type note = {
  id: string;
  title: string;
  date: string;
  content: string; // aus Text-Blöcken abgeleitet (für Suche/Preview)
  blocks: NoteBlock[];
  tags: string[];
  linkedHabitIds?: string[];
  linkedPlannerIds?: string[];
  images?: NoteImage[]; // Legacy
  tables?: NoteTable[]; // Legacy
  isPinned?: boolean;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt?: number;
};
