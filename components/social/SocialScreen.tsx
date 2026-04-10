// components/social/SocialScreen.tsx
// Vollständiger Social-Screen als Modal.
// Tabs: Rangliste | Freunde | Anfragen
//
// Erreichbar über: Fortschritt-Screen → "Freunde"-Button
// Oder: Mehr-Tab → Social

import { useAppColors } from "@/hooks/useAppColors";
import { useFocusStore } from "@/store/focusStore";
import {
  FriendProfile,
  LeaderboardEntry,
  useSocialStore,
} from "@/store/socialStore";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "leaderboard" | "friends" | "requests";

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
  name,
  color,
  size = 40,
  rank,
}: {
  name: string;
  color: string;
  size?: number;
  rank?: number;
}) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View style={{ position: "relative" }}>
      <View
        style={[
          av.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      >
        <Text style={[av.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
      </View>
      {rank !== undefined && rank <= 3 && (
        <View style={av.medal}>
          <Text style={{ fontSize: 12 }}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </Text>
        </View>
      )}
    </View>
  );
}

const av = StyleSheet.create({
  circle: { justifyContent: "center", alignItems: "center" },
  initial: { color: "#fff", fontWeight: "700" },
  medal: { position: "absolute", bottom: -4, right: -4 },
});

// ─── Rangliste-Zeile ──────────────────────────────────────────────────────────
function LeaderboardRow({
  entry,
  dark,
}: {
  entry: LeaderboardEntry;
  dark: boolean;
}) {
  const weekH = Math.floor(entry.weekMinutes / 60);
  const weekM = entry.weekMinutes % 60;
  const weekLabel =
    entry.weekMinutes === 0
      ? "–"
      : weekH > 0
      ? `${weekH}h ${weekM > 0 ? `${weekM}m` : ""}`
      : `${weekM}m`;

  return (
    <View
      style={[
        lb.row,
        entry.isMe && {
          borderColor: "#3b8995",
          backgroundColor: dark ? "#0c2430" : "#f0fbfc",
        },
        !entry.isMe && {
          borderColor: dark ? "#334155" : "#e2e8f0",
          backgroundColor: dark ? "#1e293b" : "#f8f9fb",
        },
      ]}
    >
      <Text style={[lb.rank, { color: dark ? "#475569" : "#94a3b8" }]}>
        #{entry.rank}
      </Text>
      <Avatar
        name={entry.displayName}
        color={entry.avatarColor}
        size={36}
        rank={entry.rank}
      />
      <View style={{ flex: 1 }}>
        <Text style={[lb.name, { color: dark ? "#f1f5f9" : "#0f172a" }]}>
          {entry.displayName}
          {entry.isMe ? " (du)" : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[lb.sub, { color: dark ? "#475569" : "#94a3b8" }]}>
            {entry.currentStreak > 0 ? `🔥 ${entry.currentStreak} Tage` : ""}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={[
            lb.minutes,
            { color: entry.isMe ? "#3b8995" : dark ? "#f1f5f9" : "#0f172a" },
          ]}
        >
          {weekLabel}
        </Text>
        <Text style={[lb.sub, { color: dark ? "#475569" : "#94a3b8" }]}>
          diese Woche
        </Text>
      </View>
    </View>
  );
}

const lb = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  rank: { fontSize: 13, fontWeight: "700", minWidth: 28 },
  name: { fontSize: 14, fontWeight: "600" },
  sub: { fontSize: 11 },
  minutes: { fontSize: 16, fontWeight: "800" },
});

// ─── Freund-Karte ─────────────────────────────────────────────────────────────
function FriendCard({
  friend,
  isBest,
  onRemove,
  dark,
}: {
  friend: FriendProfile;
  isBest: boolean;
  onRemove: () => void;
  dark: boolean;
}) {
  const weekH = Math.floor(friend.weekMinutes / 60);
  const weekM = friend.weekMinutes % 60;
  const weekLabel =
    friend.weekMinutes === 0
      ? "Noch keine Session diese Woche"
      : weekH > 0
      ? `${weekH}h ${weekM > 0 ? `${weekM}m` : ""} diese Woche`
      : `${weekM}m diese Woche`;

  return (
    <View
      style={[
        fc.card,
        {
          backgroundColor: dark ? "#1e293b" : "#f8f9fb",
          borderColor: isBest ? "#f59e0b" : dark ? "#334155" : "#e2e8f0",
          borderWidth: isBest ? 1.5 : 1,
        },
      ]}
    >
      {isBest && (
        <View style={fc.bestBadge}>
          <Text style={fc.bestTx}>⭐ Bester Lernfreund</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar
          name={friend.displayName}
          color={friend.avatarColor}
          size={44}
        />
        <View style={{ flex: 1 }}>
          <Text style={[fc.name, { color: dark ? "#f1f5f9" : "#0f172a" }]}>
            {friend.displayName}
          </Text>
          <Text style={[fc.stats, { color: dark ? "#64748b" : "#94a3b8" }]}>
            {weekLabel}
          </Text>
          {friend.currentStreak > 0 && (
            <Text style={[fc.streak, { color: "#f59e0b" }]}>
              🔥 {friend.currentStreak} Tage Streak
            </Text>
          )}
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons
            name="person-remove-outline"
            size={18}
            color={dark ? "#475569" : "#94a3b8"}
          />
        </Pressable>
      </View>
      <View
        style={[fc.barTrack, { backgroundColor: dark ? "#0f172a" : "#e2e8f0" }]}
      >
        <View
          style={[
            fc.barFill,
            {
              width: `${Math.min(
                100,
                (friend.weekMinutes / 300) * 100
              )}%` as any,
              backgroundColor: friend.avatarColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const fc = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 10 },
  bestBadge: {
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  bestTx: { fontSize: 11, fontWeight: "700", color: "#92400e" },
  name: { fontSize: 15, fontWeight: "700" },
  stats: { fontSize: 12, marginTop: 2 },
  streak: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  barTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 3, borderRadius: 2 },
});

// ─── Haupt-Screen ─────────────────────────────────────────────────────────────
type Props = { visible: boolean; onClose: () => void };

export function SocialScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { name } = useUserStore();
  const focusStats = useFocusStore((s) => s.stats);
  const sessions = useFocusStore((s) => s.sessions);

  const {
    friends,
    leaderboard,
    incomingRequests,
    isLoading,
    loadFriends,
    loadLeaderboard,
    loadIncomingRequests,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    getBestStudyFriend,
    syncMyStats,
    setLeaderboardOptIn,
  } = useSocialStore();

  const [tab, setTab] = useState<Tab>("leaderboard");
  const [addUsername, setAddUsername] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Eigene Stats syncen
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekMinutes = sessions
      .filter((s) => s.startedAt >= weekStart.getTime())
      .reduce(
        (sum, s) =>
          sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
        0
      );

    syncMyStats({
      weekMinutes,
      totalHours: Math.floor(focusStats.totalMinutes / 60),
      currentStreak: focusStats.currentStreak,
      bestStreak: focusStats.bestStreak,
      displayName: name && name !== "_onboarded" ? name : "Anonym",
      avatarColor: "#3b8995",
    });

    loadLeaderboard();
    loadIncomingRequests();
  }, [visible]);

  async function handleSendRequest() {
    if (!addUsername.trim()) return;
    setAddLoading(true);
    setAddError("");
    setAddSuccess(false);
    const { error } = await sendFriendRequest(addUsername.trim());
    setAddLoading(false);
    if (error) {
      setAddError(error);
    } else {
      setAddSuccess(true);
      setAddUsername("");
      setTimeout(() => setAddSuccess(false), 3000);
    }
  }

  async function handleRemove(userId: string, name: string) {
    Alert.alert(
      "Freund entfernen",
      `${name} aus deiner Freundesliste entfernen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Entfernen",
          style: "destructive",
          onPress: () => removeFriend(userId),
        },
      ]
    );
  }

  async function handleOptIn(value: boolean) {
    setOptedIn(value);
    await setLeaderboardOptIn(value);
    if (value) loadLeaderboard();
  }

  const bestFriend = getBestStudyFriend();

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "leaderboard", label: "Rangliste", icon: "trophy-outline" },
    {
      id: "friends",
      label: "Freunde",
      icon: "people-outline",
      badge: friends.length,
    },
    {
      id: "requests",
      label: "Anfragen",
      icon: "person-add-outline",
      badge: incomingRequests.length || undefined,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={[
          ss.root,
          { backgroundColor: c.cardBg, paddingTop: insets.top + 8 },
        ]}
      >
        {/* Header */}
        <View style={ss.header}>
          <Text style={[ss.title, { color: c.textPrimary }]}>
            Freunde & Rangliste
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={c.textSecondary} />
          </Pressable>
        </View>

        {/* Tab Bar */}
        <View style={[ss.tabBar, { borderColor: c.borderDefault }]}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t.id);
              }}
              style={[
                ss.tab,
                tab === t.id && {
                  borderBottomColor: "#3b8995",
                  borderBottomWidth: 2,
                },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={tab === t.id ? "#3b8995" : c.textMuted}
                />
                <Text
                  style={[
                    ss.tabTx,
                    { color: tab === t.id ? "#3b8995" : c.textMuted },
                  ]}
                >
                  {t.label}
                </Text>
                {t.badge !== undefined && t.badge > 0 && (
                  <View style={ss.badge}>
                    <Text style={ss.badgeTx}>{t.badge}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            ss.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          {/* ── RANGLISTE ── */}
          {tab === "leaderboard" && (
            <View style={{ gap: 14 }}>
              {/* Opt-In Banner */}
              {!optedIn && (
                <View
                  style={[
                    ss.optInBox,
                    {
                      backgroundColor: c.dark ? "#0c2430" : "#f0fbfc",
                      borderColor: c.dark ? "#164e63" : "#a5e8ef",
                    },
                  ]}
                >
                  <Text style={[ss.optInTitle, { color: c.textPrimary }]}>
                    In der Rangliste erscheinen?
                  </Text>
                  <Text style={[ss.optInSub, { color: c.textMuted }]}>
                    Teile deine Wochenminuten mit Freunden. Deine Daten bleiben
                    bei dir.
                  </Text>
                  <Pressable
                    onPress={() => handleOptIn(true)}
                    style={ss.optInBtn}
                  >
                    <Text style={ss.optInBtnTx}>Ja, mitmachen</Text>
                  </Pressable>
                </View>
              )}

              {isLoading ? (
                <ActivityIndicator color="#3b8995" style={{ marginTop: 32 }} />
              ) : leaderboard.length === 0 ? (
                <View style={ss.empty}>
                  <Text style={{ fontSize: 32 }}>🏆</Text>
                  <Text style={[ss.emptyTitle, { color: c.textPrimary }]}>
                    Noch keine Rangliste
                  </Text>
                  <Text style={[ss.emptySub, { color: c.textMuted }]}>
                    Füge Freunde hinzu und aktiviere die Rangliste um euch zu
                    vergleichen.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text style={[ss.sectionLabel, { color: c.textMuted }]}>
                    DIESE WOCHE · FOKUS-MINUTEN
                  </Text>
                  {leaderboard.map((entry) => (
                    <LeaderboardRow
                      key={entry.userId}
                      entry={entry}
                      dark={c.dark}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── FREUNDE ── */}
          {tab === "friends" && (
            <View style={{ gap: 16 }}>
              {/* Freund hinzufügen */}
              <View
                style={[
                  ss.addBox,
                  {
                    backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                    borderColor: c.borderDefault,
                  },
                ]}
              >
                <Text style={[ss.sectionLabel, { color: c.textMuted }]}>
                  FREUND HINZUFÜGEN
                </Text>
                <Text style={[ss.addHint, { color: c.textMuted }]}>
                  Vigor-Nutzernamen eingeben
                </Text>
                <View style={ss.addRow}>
                  <TextInput
                    value={addUsername}
                    onChangeText={(t) => {
                      setAddUsername(t);
                      setAddError("");
                    }}
                    placeholder="@benutzername"
                    placeholderTextColor={c.textMuted}
                    style={[
                      ss.addInput,
                      {
                        color: c.textPrimary,
                        borderColor: addError ? "#ef4444" : c.borderDefault,
                        backgroundColor: c.dark ? "#0f172a" : "#fff",
                      },
                    ]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                  />
                  <Pressable
                    onPress={handleSendRequest}
                    disabled={addLoading || !addUsername.trim()}
                    style={[
                      ss.addBtn,
                      { opacity: addUsername.trim() ? 1 : 0.4 },
                    ]}
                  >
                    {addLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="person-add" size={18} color="#fff" />
                    )}
                  </Pressable>
                </View>
                {addError ? (
                  <Text style={ss.errorTx}>{addError}</Text>
                ) : addSuccess ? (
                  <Text style={ss.successTx}>✓ Anfrage gesendet!</Text>
                ) : null}
              </View>

              {/* Freundesliste */}
              {friends.length === 0 ? (
                <View style={ss.empty}>
                  <Text style={{ fontSize: 32 }}>👋</Text>
                  <Text style={[ss.emptyTitle, { color: c.textPrimary }]}>
                    Noch keine Freunde
                  </Text>
                  <Text style={[ss.emptySub, { color: c.textMuted }]}>
                    Füge Freunde per Username hinzu um gemeinsam Fortschritt zu
                    tracken.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={[ss.sectionLabel, { color: c.textMuted }]}>
                    FREUNDE ({friends.length})
                  </Text>
                  {friends.map((f) => (
                    <FriendCard
                      key={f.userId}
                      friend={f}
                      isBest={
                        bestFriend?.userId === f.userId && friends.length > 1
                      }
                      onRemove={() => handleRemove(f.userId, f.displayName)}
                      dark={c.dark}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── ANFRAGEN ── */}
          {tab === "requests" && (
            <View style={{ gap: 12 }}>
              {incomingRequests.length === 0 ? (
                <View style={ss.empty}>
                  <Text style={{ fontSize: 32 }}>📭</Text>
                  <Text style={[ss.emptyTitle, { color: c.textPrimary }]}>
                    Keine offenen Anfragen
                  </Text>
                  <Text style={[ss.emptySub, { color: c.textMuted }]}>
                    Wenn jemand deinen Username eingibt, erscheint die Anfrage
                    hier.
                  </Text>
                </View>
              ) : (
                incomingRequests.map((req) => (
                  <View
                    key={req.id}
                    style={[
                      ss.reqCard,
                      {
                        backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                        borderColor: c.borderDefault,
                      },
                    ]}
                  >
                    <View
                      style={[
                        av.circle,
                        {
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: "#3b8995",
                        },
                      ]}
                    >
                      <Text style={[av.initial, { fontSize: 16 }]}>
                        {req.fromName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ss.reqName, { color: c.textPrimary }]}>
                        {req.fromName}
                      </Text>
                      <Text style={[ss.reqSub, { color: c.textMuted }]}>
                        möchte dein Lernfreund sein
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          acceptRequest(req.id);
                        }}
                        style={[ss.reqBtn, { backgroundColor: "#3b8995" }]}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </Pressable>
                      <Pressable
                        onPress={() => declineRequest(req.id)}
                        style={[
                          ss.reqBtn,
                          { backgroundColor: c.dark ? "#334155" : "#e2e8f0" },
                        ]}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={c.textSecondary}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabTx: { fontSize: 13, fontWeight: "600" },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeTx: { color: "#fff", fontSize: 10, fontWeight: "700" },
  content: { padding: 20, gap: 0 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Opt-In
  optInBox: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 8 },
  optInTitle: { fontSize: 15, fontWeight: "700" },
  optInSub: { fontSize: 13, lineHeight: 18 },
  optInBtn: {
    backgroundColor: "#3b8995",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  optInBtnTx: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Add friend
  addBox: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  addHint: { fontSize: 12 },
  addRow: { flexDirection: "row", gap: 8 },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#3b8995",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTx: { color: "#ef4444", fontSize: 12 },
  successTx: { color: "#10b981", fontSize: 12, fontWeight: "600" },

  // Empty
  empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },

  // Request card
  reqCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  reqName: { fontSize: 14, fontWeight: "600" },
  reqSub: { fontSize: 12, marginTop: 2 },
  reqBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
