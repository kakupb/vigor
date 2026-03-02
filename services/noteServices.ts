import { note } from "@/types/note";

// Filtere Notes nach Datum
export function getNotesForToday(notes: note[], date: string): note[] {
  return notes.filter((n) => n.date === date);
}

// Filtere notes nach tags
export function getNoteForTags(notes: note[], tags: string): note[] {
  return notes.filter((n) => n.tags.includes(tags));
}

// Gibt alle verwendeten Tags zurück
export function getAllTags(notes: note[]): string[] {
  const tagSet = new Set<string>();
  notes.forEach((note) => {
    note.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

// Sortiert Notes, erst pinned, dann nach Zeit
export function sortNotes(notes: note[]): note[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    return b.createdAt - a.createdAt;
  });
}
