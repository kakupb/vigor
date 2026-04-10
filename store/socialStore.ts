// store/socialStore.ts
// Freundschaften, Rangliste, Best Study Friend.
//
// Best Study Friend-Algorithmus:
//   Der Freund mit dem höchsten gemeinsamen "Fokus-Overlap":
//   Wie viele Minuten habt ihr in derselben Woche/demselben Tag studiert?
//   (Nicht Co-Focus nötig — einfach Zeitüberschneidung der Sessions)

import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/sync";
import { create } from "zustand";

export type FriendProfile = {
  userId: string;
  displayName: string;
  avatarColor: string;
  weekMinutes: number;
  totalHours: number;
  currentStreak: number;
  bestStreak: number;
  updatedAt: number;
  // computed lokal
  friendshipId?: string;
};

export type FriendRequest = {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
};

export type LeaderboardEntry = FriendProfile & {
  rank: number;
  isMe: boolean;
};

type SocialState = {
  friends: FriendProfile[];
  incomingRequests: FriendRequest[];
  leaderboard: LeaderboardEntry[];
  myProfile: FriendProfile | null;
  isLoading: boolean;
  error: string | null;

  // Setup
  setLeaderboardOptIn: (show: boolean) => Promise<void>;
  syncMyStats: (stats: {
    weekMinutes: number;
    totalHours: number;
    currentStreak: number;
    bestStreak: number;
    displayName: string;
    avatarColor: string;
  }) => Promise<void>;

  // Freunde
  sendFriendRequest: (username: string) => Promise<{ error: string | null }>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendUserId: string) => Promise<void>;

  // Daten laden
  loadFriends: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  loadIncomingRequests: () => Promise<void>;

  // Best Study Friend
  getBestStudyFriend: () => FriendProfile | null;
};

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: [],
  incomingRequests: [],
  leaderboard: [],
  myProfile: null,
  isLoading: false,
  error: null,

  // ── Opt-In für Rangliste ──────────────────────────────────────────────────
  setLeaderboardOptIn: async (show) => {
    const user = await getCurrentUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ show_in_leaderboard: show })
      .eq("id", user.id);
  },

  // ── Eigene Stats in public_focus_stats schreiben ──────────────────────────
  syncMyStats: async (stats) => {
    const user = await getCurrentUser();
    if (!user) return;

    // Nur wenn User Opt-In hat
    const { data: profile } = await supabase
      .from("profiles")
      .select("show_in_leaderboard")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.show_in_leaderboard) return;

    await supabase.from("public_focus_stats").upsert({
      user_id: user.id,
      display_name: stats.displayName,
      avatar_color: stats.avatarColor,
      week_minutes: stats.weekMinutes,
      total_hours: stats.totalHours,
      current_streak: stats.currentStreak,
      best_streak: stats.bestStreak,
      updated_at: new Date().toISOString(),
    });

    set({
      myProfile: {
        userId: user.id,
        displayName: stats.displayName,
        avatarColor: stats.avatarColor,
        weekMinutes: stats.weekMinutes,
        totalHours: stats.totalHours,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        updatedAt: Date.now(),
      },
    });
  },

  // ── Freundschaftsanfrage senden ───────────────────────────────────────────
  sendFriendRequest: async (username) => {
    const user = await getCurrentUser();
    if (!user) return { error: "Nicht eingeloggt" };

    // Username → User-ID auflösen
    const { data: target } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("username", username.toLowerCase().trim())
      .maybeSingle();

    if (!target) return { error: "Nutzer nicht gefunden" };
    if (target.id === user.id)
      return { error: "Du kannst dich nicht selbst hinzufügen" };

    // Bereits befreundet?
    const { data: existing } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_id", user.id)
      .eq("friend_id", target.id)
      .maybeSingle();

    if (existing) return { error: "Bereits befreundet" };

    // Anfrage bereits gesendet?
    const { data: existingReq } = await supabase
      .from("friend_requests")
      .select("id, status")
      .eq("from_id", user.id)
      .eq("to_id", target.id)
      .maybeSingle();

    if (existingReq?.status === "pending")
      return { error: "Anfrage bereits gesendet" };

    const { error } = await supabase.from("friend_requests").upsert({
      from_id: user.id,
      to_id: target.id,
      status: "pending",
    });

    if (error) return { error: "Anfrage konnte nicht gesendet werden" };
    return { error: null };
  },

  // ── Anfrage annehmen ──────────────────────────────────────────────────────
  acceptRequest: async (requestId) => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data: req } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!req) return;

    // Status aktualisieren
    await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    // Beidseitige Freundschaft anlegen
    await supabase.from("friendships").upsert([
      { user_id: user.id, friend_id: req.from_id },
      { user_id: req.from_id, friend_id: user.id },
    ]);

    // Anfrage aus Liste entfernen
    set((s) => ({
      incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId),
    }));

    // Freunde neu laden
    get().loadFriends();
  },

  // ── Anfrage ablehnen ──────────────────────────────────────────────────────
  declineRequest: async (requestId) => {
    await supabase
      .from("friend_requests")
      .update({ status: "declined" })
      .eq("id", requestId);
    set((s) => ({
      incomingRequests: s.incomingRequests.filter((r) => r.id !== requestId),
    }));
  },

  // ── Freund entfernen ──────────────────────────────────────────────────────
  removeFriend: async (friendUserId) => {
    const user = await getCurrentUser();
    if (!user) return;

    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`
      );

    set((s) => ({
      friends: s.friends.filter((f) => f.userId !== friendUserId),
    }));
  },

  // ── Freunde laden (mit Stats) ─────────────────────────────────────────────
  loadFriends: async () => {
    set({ isLoading: true });
    const user = await getCurrentUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    // Eigene Freundschafts-IDs
    const { data: fs } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", user.id);

    if (!fs || fs.length === 0) {
      set({ friends: [], isLoading: false });
      return;
    }

    const friendIds = fs.map((f) => f.friend_id);

    // Stats der Freunde laden
    const { data: stats } = await supabase
      .from("public_focus_stats")
      .select("*")
      .in("user_id", friendIds);

    const friends: FriendProfile[] = (stats ?? []).map((s) => ({
      userId: s.user_id,
      displayName: s.display_name,
      avatarColor: s.avatar_color,
      weekMinutes: s.week_minutes,
      totalHours: s.total_hours,
      currentStreak: s.current_streak,
      bestStreak: s.best_streak,
      updatedAt: new Date(s.updated_at).getTime(),
    }));

    set({ friends, isLoading: false });
  },

  // ── Rangliste laden (ich + alle Freunde, sortiert nach Wochenminuten) ─────
  loadLeaderboard: async () => {
    const user = await getCurrentUser();
    if (!user) return;

    await get().loadFriends();

    const { friends, myProfile } = get();
    const all: FriendProfile[] = [
      ...(myProfile ? [myProfile] : []),
      ...friends,
    ];

    // Sortieren nach weekMinutes (diese Woche)
    const sorted = [...all].sort((a, b) => b.weekMinutes - a.weekMinutes);

    const leaderboard: LeaderboardEntry[] = sorted.map((entry, i) => ({
      ...entry,
      rank: i + 1,
      isMe: entry.userId === user.id,
    }));

    set({ leaderboard });
  },

  // ── Eingehende Anfragen laden ─────────────────────────────────────────────
  loadIncomingRequests: async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data } = await supabase
      .from("friend_requests")
      .select("id, from_id, to_id, status, created_at")
      .eq("to_id", user.id)
      .eq("status", "pending");

    if (!data) return;

    // Namen der Anfragenden laden
    const fromIds = data.map((r) => r.from_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", fromIds);

    const nameMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.name ?? "Unbekannt"])
    );

    set({
      incomingRequests: data.map((r) => ({
        id: r.id,
        fromId: r.from_id,
        toId: r.to_id,
        fromName: nameMap.get(r.from_id) ?? "Unbekannt",
        status: r.status,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  },

  // ── Best Study Friend ─────────────────────────────────────────────────────
  // Der Freund mit den meisten Fokus-Minuten diese Woche.
  // Einfach aber effektiv — zeigt wer "auf deiner Wellenlänge" ist.
  getBestStudyFriend: () => {
    const { friends } = get();
    if (friends.length === 0) return null;
    return friends.reduce(
      (best, f) => (f.weekMinutes > best.weekMinutes ? f : best),
      friends[0]
    );
  },
}));
