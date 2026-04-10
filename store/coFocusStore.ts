// store/coFocusStore.ts
// Co-Focus Infrastruktur: Räume erstellen, beitreten, Timer synchronisieren.
//
// Kernprinzip Timer-Sync:
//   Host schreibt room.started_at in Supabase (server-Timestamp).
//   Alle Clients berechnen timeRemaining aus (now - started_at).
//   Kein Broadcast-Delay, kein Drift — Server-Zeit ist einzige Wahrheit.
//
// Realtime: Supabase Postgres Changes auf co_focus_rooms + co_focus_participants
// Broadcast: für sofortige UI-Updates (start/pause/end)

import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/sync";
import {
  CoFocusNote,
  CoFocusParticipant,
  CoFocusRoom,
  NoteMode,
} from "@/types/coFocus";
import { create } from "zustand";

// ─── Supabase → Typen ─────────────────────────────────────────────────────────
function roomFromRow(r: any): CoFocusRoom {
  return {
    id: r.id,
    code: r.code,
    hostId: r.host_id,
    status: r.status,
    noteMode: r.note_mode,
    workMinutes: r.work_minutes,
    breakMinutes: r.break_minutes,
    longBreakMinutes: r.long_break_minutes,
    longBreakAfter: r.long_break_after,
    startedAt: r.started_at ? new Date(r.started_at).getTime() : null,
    endedAt: r.ended_at ? new Date(r.ended_at).getTime() : null,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function participantFromRow(r: any): CoFocusParticipant {
  return {
    id: r.id,
    roomId: r.room_id,
    userId: r.user_id,
    displayName: r.display_name ?? "Anonym",
    joinedAt: new Date(r.joined_at).getTime(),
    leftAt: r.left_at ? new Date(r.left_at).getTime() : null,
    isReady: r.is_ready ?? false,
  };
}

function noteFromRow(r: any): CoFocusNote {
  return {
    id: r.id,
    roomId: r.room_id,
    userId: r.user_id,
    authorName: r.author_name ?? "Anonym",
    content: r.content,
    isPrivate: r.is_private,
    writtenAt: r.written_at,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

// Zufälliger 6-stelliger Code (A-Z, 0-9, keine verwechslungsgefährdete Zeichen)
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ─── Store ────────────────────────────────────────────────────────────────────
type CoFocusState = {
  // Aktiver Raum
  room: CoFocusRoom | null;
  participants: CoFocusParticipant[];
  notes: CoFocusNote[];
  isHost: boolean;
  myUserId: string | null;
  error: string | null;
  isLoading: boolean;

  // Aktionen
  createRoom: (config: {
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakAfter: number;
    noteMode: NoteMode;
  }) => Promise<{ code: string } | null>;

  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;

  setReady: (ready: boolean) => Promise<void>;
  startSession: () => Promise<void>; // nur Host
  endSession: () => Promise<void>; // nur Host

  addNote: (
    content: string,
    isPrivate: boolean,
    writtenAt: "during" | "after"
  ) => Promise<void>;
  updateNote: (
    noteId: string,
    content: string,
    isPrivate: boolean
  ) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;

  updateNoteMode: (mode: NoteMode) => Promise<void>; // nur Host

  // Interne Realtime-Subscription
  _channel: any;
  _subscribeToRoom: (roomId: string) => void;
  _unsubscribe: () => void;
};

export const useCoFocusStore = create<CoFocusState>((set, get) => ({
  room: null,
  participants: [],
  notes: [],
  isHost: false,
  myUserId: null,
  error: null,
  isLoading: false,
  _channel: null,

  // ── Raum erstellen ──────────────────────────────────────────────────────────
  createRoom: async (config) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: "Nicht eingeloggt", isLoading: false });
        return null;
      }

      // Profil-Name laden
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      const displayName = profile?.name ?? "Host";

      // Code generieren (max 3 Versuche bei Kollision)
      let code = "";
      for (let i = 0; i < 3; i++) {
        code = generateRoomCode();
        const { data: existing } = await supabase
          .from("co_focus_rooms")
          .select("id")
          .eq("code", code)
          .maybeSingle();
        if (!existing) break;
      }

      const { data: room, error } = await supabase
        .from("co_focus_rooms")
        .insert({
          code,
          host_id: user.id,
          status: "lobby",
          note_mode: config.noteMode,
          work_minutes: config.workMinutes,
          break_minutes: config.breakMinutes,
          long_break_minutes: config.longBreakMinutes,
          long_break_after: config.longBreakAfter,
        })
        .select()
        .single();

      if (error || !room) {
        set({ error: "Raum konnte nicht erstellt werden", isLoading: false });
        return null;
      }

      // Host als Teilnehmer hinzufügen
      await supabase.from("co_focus_participants").insert({
        room_id: room.id,
        user_id: user.id,
        display_name: displayName,
        is_ready: true, // Host ist immer bereit
      });

      const roomObj = roomFromRow(room);
      set({ room: roomObj, isHost: true, myUserId: user.id, isLoading: false });
      get()._subscribeToRoom(room.id);
      return { code: room.code };
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return null;
    }
  },

  // ── Raum beitreten ──────────────────────────────────────────────────────────
  joinRoom: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ error: "Nicht eingeloggt", isLoading: false });
        return false;
      }

      const normalizedCode = code.toUpperCase().trim();

      const { data: room, error } = await supabase
        .from("co_focus_rooms")
        .select("*")
        .eq("code", normalizedCode)
        .maybeSingle();

      if (error || !room) {
        set({ error: "Raum nicht gefunden", isLoading: false });
        return false;
      }
      if (room.status === "ended") {
        set({ error: "Diese Session ist bereits beendet", isLoading: false });
        return false;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      const displayName = profile?.name ?? "Gast";

      // Participant upsert (falls User schon drin war)
      await supabase.from("co_focus_participants").upsert(
        {
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          left_at: null,
          is_ready: false,
        },
        { onConflict: "room_id,user_id" }
      );

      // Bestehende Notizen laden (nur nicht-private)
      const { data: notes } = await supabase
        .from("co_focus_notes")
        .select("*")
        .eq("room_id", room.id)
        .or(`user_id.eq.${user.id},is_private.eq.false`);

      // Bestehende Teilnehmer laden
      const { data: participants } = await supabase
        .from("co_focus_participants")
        .select("*")
        .eq("room_id", room.id)
        .is("left_at", null);

      set({
        room: roomFromRow(room),
        participants: (participants ?? []).map(participantFromRow),
        notes: (notes ?? []).map(noteFromRow),
        isHost: room.host_id === user.id,
        myUserId: user.id,
        isLoading: false,
      });
      get()._subscribeToRoom(room.id);
      return true;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  // ── Raum verlassen ──────────────────────────────────────────────────────────
  leaveRoom: async () => {
    const { room, myUserId } = get();
    if (!room || !myUserId) return;
    get()._unsubscribe();
    await supabase
      .from("co_focus_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("room_id", room.id)
      .eq("user_id", myUserId);
    set({ room: null, participants: [], notes: [], isHost: false });
  },

  // ── Bereit-Status ───────────────────────────────────────────────────────────
  setReady: async (ready) => {
    const { room, myUserId } = get();
    if (!room || !myUserId) return;
    await supabase
      .from("co_focus_participants")
      .update({ is_ready: ready })
      .eq("room_id", room.id)
      .eq("user_id", myUserId);
    set((s) => ({
      participants: s.participants.map((p) =>
        p.userId === myUserId ? { ...p, isReady: ready } : p
      ),
    }));
  },

  // ── Session starten (nur Host) ──────────────────────────────────────────────
  startSession: async () => {
    const { room, isHost } = get();
    if (!room || !isHost) return;
    const startedAt = new Date().toISOString();
    await supabase
      .from("co_focus_rooms")
      .update({ status: "running", started_at: startedAt })
      .eq("id", room.id);
    // Realtime-Change wird automatisch empfangen → kein lokales Update nötig
  },

  // ── Session beenden (nur Host) ──────────────────────────────────────────────
  endSession: async () => {
    const { room, isHost } = get();
    if (!room || !isHost) return;
    await supabase
      .from("co_focus_rooms")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", room.id);
  },

  // ── Notizen ─────────────────────────────────────────────────────────────────
  addNote: async (content, isPrivate, writtenAt) => {
    const { room, myUserId } = get();
    if (!room || !myUserId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", myUserId)
      .maybeSingle();

    const { data: note, error } = await supabase
      .from("co_focus_notes")
      .insert({
        room_id: room.id,
        user_id: myUserId,
        author_name: profile?.name ?? "Anonym",
        content,
        is_private: isPrivate,
        written_at: writtenAt,
      })
      .select()
      .single();

    if (note && !error) {
      set((s) => ({ notes: [...s.notes, noteFromRow(note)] }));
    }
  },

  updateNote: async (noteId, content, isPrivate) => {
    await supabase
      .from("co_focus_notes")
      .update({
        content,
        is_private: isPrivate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId);
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, content, isPrivate } : n
      ),
    }));
  },

  deleteNote: async (noteId) => {
    await supabase.from("co_focus_notes").delete().eq("id", noteId);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== noteId) }));
  },

  updateNoteMode: async (mode) => {
    const { room, isHost } = get();
    if (!room || !isHost) return;
    await supabase
      .from("co_focus_rooms")
      .update({ note_mode: mode })
      .eq("id", room.id);
    set((s) => ({ room: s.room ? { ...s.room, noteMode: mode } : null }));
  },

  // ── Realtime Subscription ───────────────────────────────────────────────────
  _subscribeToRoom: (roomId) => {
    const channel = supabase
      .channel(`room:${roomId}`)

      // Room-Status-Updates (start, end, note_mode Änderungen)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "co_focus_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) {
            set({ room: roomFromRow(payload.new) });
          }
        }
      )

      // Teilnehmer-Updates (join, ready, leave)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "co_focus_participants",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newP = participantFromRow(payload.new);
            set((s) => ({
              participants: [
                ...s.participants.filter((p) => p.id !== newP.id),
                newP,
              ],
            }));
          } else if (payload.eventType === "UPDATE") {
            const updated = participantFromRow(payload.new);
            set((s) => ({
              participants: s.participants.map((p) =>
                p.id === updated.id ? updated : p
              ),
            }));
          }
        }
      )

      // Neue geteilte Notizen (nur nicht-private von anderen)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "co_focus_notes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newNote = noteFromRow(payload.new);
          const myId = get().myUserId;
          // Nur anzeigen wenn: eigene Notiz ODER öffentlich
          if (newNote.userId === myId || !newNote.isPrivate) {
            set((s) => {
              const alreadyExists = s.notes.some((n) => n.id === newNote.id);
              if (alreadyExists) return s;
              return { notes: [...s.notes, newNote] };
            });
          }
        }
      )

      .subscribe();

    set({ _channel: channel });
  },

  _unsubscribe: () => {
    const { _channel } = get();
    if (_channel) {
      supabase.removeChannel(_channel);
      set({ _channel: null });
    }
  },
}));

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

// Berechnet timeRemaining aus server-started_at.
// Das ist der Kern der Drift-freien Synchronisation.
export function computeTimeRemaining(
  startedAt: number,
  workMinutes: number
): number {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const total = workMinutes * 60;
  return Math.max(0, total - elapsed);
}
