// types/coFocus.ts

export type RoomStatus = "lobby" | "running" | "ended";
export type NoteMode = "individual" | "shared" | "private";

export type CoFocusRoom = {
  id: string;
  code: string; // 6-stelliger Beitrittscode
  hostId: string;
  status: RoomStatus;
  noteMode: NoteMode;
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakAfter: number;
  startedAt: number | null; // Unix timestamp — die einzige Zeitwahrheit
  endedAt: number | null;
  createdAt: number;
};

export type CoFocusParticipant = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  joinedAt: number;
  leftAt: number | null;
  isReady: boolean;
};

export type CoFocusNote = {
  id: string;
  roomId: string;
  userId: string;
  authorName: string;
  content: string;
  isPrivate: boolean;
  writtenAt: "during" | "after";
  createdAt: number;
  updatedAt: number;
};

// Realtime Broadcast-Event vom Host an alle Teilnehmer
export type RoomBroadcast =
  | { type: "start"; serverTime: number } // Host startet — serverTime = UTC ms
  | { type: "pause" }
  | { type: "end" };
