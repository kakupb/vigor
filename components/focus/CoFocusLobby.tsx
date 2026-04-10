// components/focus/CoFocusLobby.tsx
// Raum erstellen oder beitreten.
// Teilnehmerliste, Bereit-Status, Notiz-Modus-Einstellung.
// Host-only: Start-Button, Notiz-Modus wählen.

import { useAppColors } from "@/hooks/useAppColors";
import { useCoFocusStore } from "@/store/coFocusStore";
import { useFocusStore } from "@/store/focusStore";
import { NoteMode } from "@/types/coFocus";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Note Mode Picker ─────────────────────────────────────────────────────────
const NOTE_MODES: { id: NoteMode; label: string; sub: string; icon: string }[] =
  [
    {
      id: "individual",
      label: "Jeder für sich",
      sub: "Eigene Notizen, nach Session optional teilen",
      icon: "person-outline",
    },
    {
      id: "shared",
      label: "Gemeinsames Dokument",
      sub: "Alle schreiben in eine Notiz",
      icon: "people-outline",
    },
    {
      id: "private",
      label: "Komplett privat",
      sub: "Niemand sieht die Notizen der anderen",
      icon: "lock-closed-outline",
    },
  ];

function NoteModePicker({
  selected,
  onChange,
  dark,
  isHost,
}: {
  selected: NoteMode;
  onChange: (m: NoteMode) => void;
  dark: boolean;
  isHost: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      {NOTE_MODES.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => {
            if (!isHost) return;
            Haptics.selectionAsync();
            onChange(m.id);
          }}
          style={[
            nm.row,
            {
              backgroundColor:
                selected === m.id
                  ? dark
                    ? "#0c2430"
                    : "#f0fbfc"
                  : dark
                  ? "#1e293b"
                  : "#f8f9fb",
              borderColor:
                selected === m.id ? "#3b8995" : dark ? "#334155" : "#e2e8f0",
              opacity: !isHost && selected !== m.id ? 0.45 : 1,
            },
          ]}
        >
          <Ionicons
            name={m.icon as any}
            size={18}
            color={selected === m.id ? "#3b8995" : dark ? "#64748b" : "#94a3b8"}
          />
          <View style={{ flex: 1 }}>
            <Text style={[nm.label, { color: dark ? "#f1f5f9" : "#0f172a" }]}>
              {m.label}
            </Text>
            <Text style={[nm.sub, { color: dark ? "#475569" : "#94a3b8" }]}>
              {m.sub}
            </Text>
          </View>
          {selected === m.id && (
            <Ionicons name="checkmark-circle" size={18} color="#3b8995" />
          )}
        </Pressable>
      ))}
      {!isHost && (
        <Text
          style={{
            fontSize: 11,
            color: dark ? "#334155" : "#cbd5e1",
            fontStyle: "italic",
          }}
        >
          Nur der Host kann den Notiz-Modus ändern.
        </Text>
      )}
    </View>
  );
}

const nm = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: { fontSize: 14, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 1 },
});

// ─── Teilnehmer-Chip ──────────────────────────────────────────────────────────
function ParticipantChip({
  name,
  isReady,
  isHost,
  isMe,
  dark,
}: {
  name: string;
  isReady: boolean;
  isHost: boolean;
  isMe: boolean;
  dark: boolean;
}) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View
      style={[
        pc.chip,
        {
          backgroundColor: isReady
            ? dark
              ? "#0d2e1e"
              : "#f0fdf4"
            : dark
            ? "#1e293b"
            : "#f8f9fb",
          borderColor: isReady
            ? dark
              ? "#166534"
              : "#bbf7d0"
            : dark
            ? "#334155"
            : "#e2e8f0",
        },
      ]}
    >
      <View
        style={[
          pc.avatar,
          { backgroundColor: isReady ? "#10b981" : "#94a3b8" },
        ]}
      >
        <Text style={pc.avatarTx}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[pc.name, { color: dark ? "#f1f5f9" : "#0f172a" }]}>
          {name}
          {isMe ? " (du)" : ""}
          {isHost ? " 👑" : ""}
        </Text>
        <Text
          style={[
            pc.status,
            { color: isReady ? "#10b981" : dark ? "#475569" : "#94a3b8" },
          ]}
        >
          {isReady ? "Bereit" : "Wartet…"}
        </Text>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTx: { color: "#fff", fontSize: 14, fontWeight: "700" },
  name: { fontSize: 13, fontWeight: "600" },
  status: { fontSize: 11, marginTop: 1 },
});

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onSessionStart: () => void; // FocusScreen öffnen
  onClose: () => void;
};

type LobbyView = "home" | "create" | "join" | "lobby";

export function CoFocusLobby({ visible, onSessionStart, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const pomodoroConfig = useFocusStore((s) => s.pomodoroConfig);

  const {
    room,
    participants,
    isHost,
    myUserId,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startSession,
    updateNoteMode,
  } = useCoFocusStore();

  const [view, setView] = useState<LobbyView>("home");
  const [joinCode, setJoinCode] = useState("");
  const [noteMode, setNoteMode] = useState<NoteMode>("individual");
  const [copied, setCopied] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    } else {
      slideAnim.setValue(800);
      setView("home");
      setJoinCode("");
    }
  }, [visible]);

  // Sobald Raum running → FocusScreen öffnen
  useEffect(() => {
    if (room?.status === "running") {
      onSessionStart();
    }
  }, [room?.status]);

  async function handleCreate() {
    const result = await createRoom({
      ...pomodoroConfig,
      noteMode,
    });
    if (result) setView("lobby");
  }

  async function handleJoin() {
    if (joinCode.length < 6) return;
    const ok = await joinRoom(joinCode);
    if (ok) setView("lobby");
  }

  async function handleCopyCode() {
    if (!room) return;
    await Clipboard.setStringAsync(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    await leaveRoom();
    setView("home");
    onClose();
  }

  const activeParticipants = participants.filter((p) => !p.leftAt);
  const allReady =
    activeParticipants.length > 1 && activeParticipants.every((p) => p.isReady);
  const myParticipant = participants.find((p) => p.userId === myUserId);
  const amReady = myParticipant?.isReady ?? false;

  // ── Home ────────────────────────────────────────────────────────────────────
  const HomeView = (
    <View style={lv.section}>
      <Text style={[lv.title, { color: c.textPrimary }]}>
        Gemeinsam fokussieren
      </Text>
      <Text style={[lv.sub, { color: c.textMuted }]}>
        Starte eine geteilte Session oder tritt einer bei.
      </Text>
      <Pressable
        onPress={() => setView("create")}
        style={[lv.btn, { backgroundColor: "#3b8995" }]}
      >
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={lv.btnTx}>Neue Session erstellen</Text>
      </Pressable>
      <Pressable
        onPress={() => setView("join")}
        style={[
          lv.btn,
          {
            backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
            borderWidth: 1,
            borderColor: c.borderDefault,
          },
        ]}
      >
        <Ionicons name="enter-outline" size={18} color={c.textSecondary} />
        <Text style={[lv.btnTx, { color: c.textSecondary }]}>
          Mit Code beitreten
        </Text>
      </Pressable>
    </View>
  );

  // ── Erstellen ───────────────────────────────────────────────────────────────
  const CreateView = (
    <View style={lv.section}>
      <Pressable onPress={() => setView("home")} style={lv.backRow}>
        <Ionicons name="chevron-back" size={16} color="#3b8995" />
        <Text style={{ color: "#3b8995", fontSize: 14, fontWeight: "600" }}>
          Zurück
        </Text>
      </Pressable>
      <Text style={[lv.title, { color: c.textPrimary }]}>Neue Gruppe</Text>
      <Text style={[lv.sectionLabel, { color: c.textMuted }]}>NOTIZ-MODUS</Text>
      <NoteModePicker
        selected={noteMode}
        onChange={setNoteMode}
        dark={c.dark}
        isHost
      />
      {error && <Text style={{ color: "#ef4444", fontSize: 13 }}>{error}</Text>}
      <Pressable
        onPress={handleCreate}
        disabled={isLoading}
        style={[
          lv.btn,
          { backgroundColor: "#3b8995", opacity: isLoading ? 0.6 : 1 },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="people" size={18} color="#fff" />
            <Text style={lv.btnTx}>Raum erstellen</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  // ── Beitreten ────────────────────────────────────────────────────────────────
  const JoinView = (
    <View style={lv.section}>
      <Pressable onPress={() => setView("home")} style={lv.backRow}>
        <Ionicons name="chevron-back" size={16} color="#3b8995" />
        <Text style={{ color: "#3b8995", fontSize: 14, fontWeight: "600" }}>
          Zurück
        </Text>
      </Pressable>
      <Text style={[lv.title, { color: c.textPrimary }]}>Code eingeben</Text>
      <TextInput
        value={joinCode}
        onChangeText={(t) => setJoinCode(t.toUpperCase())}
        placeholder="ABC123"
        placeholderTextColor={c.textMuted}
        autoCapitalize="characters"
        maxLength={6}
        style={[
          lv.codeInput,
          {
            color: c.textPrimary,
            borderColor: joinCode.length === 6 ? "#3b8995" : c.borderDefault,
            backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
          },
        ]}
        autoFocus
      />
      {error && <Text style={{ color: "#ef4444", fontSize: 13 }}>{error}</Text>}
      <Pressable
        onPress={handleJoin}
        disabled={joinCode.length < 6 || isLoading}
        style={[
          lv.btn,
          {
            backgroundColor: "#3b8995",
            opacity: joinCode.length === 6 ? 1 : 0.4,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={lv.btnTx}>Beitreten</Text>
        )}
      </Pressable>
    </View>
  );

  // ── Lobby ────────────────────────────────────────────────────────────────────
  const LobbyView = room ? (
    <View style={lv.section}>
      {/* Code + kopieren */}
      <View style={lv.codeRow}>
        <View>
          <Text style={[lv.sectionLabel, { color: c.textMuted }]}>
            RAUM-CODE
          </Text>
          <Text style={[lv.codeDisplay, { color: c.textPrimary }]}>
            {room.code}
          </Text>
        </View>
        <Pressable
          onPress={handleCopyCode}
          style={[
            lv.copyBtn,
            { backgroundColor: c.dark ? "#1e293b" : "#f1f5f9" },
          ]}
        >
          <Ionicons
            name={copied ? "checkmark" : "copy-outline"}
            size={16}
            color={copied ? "#10b981" : c.textSecondary}
          />
          <Text
            style={[lv.copyTx, { color: copied ? "#10b981" : c.textSecondary }]}
          >
            {copied ? "Kopiert!" : "Teilen"}
          </Text>
        </Pressable>
      </View>

      {/* Teilnehmer */}
      <Text style={[lv.sectionLabel, { color: c.textMuted }]}>
        TEILNEHMER ({activeParticipants.length})
      </Text>
      <View style={{ gap: 6 }}>
        {activeParticipants.map((p) => (
          <ParticipantChip
            key={p.id}
            name={p.displayName}
            isReady={p.isReady}
            isHost={p.userId === room.hostId}
            isMe={p.userId === myUserId}
            dark={c.dark}
          />
        ))}
      </View>

      {/* Notiz-Modus */}
      <Text style={[lv.sectionLabel, { color: c.textMuted }]}>NOTIZ-MODUS</Text>
      <NoteModePicker
        selected={room.noteMode}
        onChange={updateNoteMode}
        dark={c.dark}
        isHost={isHost}
      />

      {/* Aktionen */}
      {isHost ? (
        <Pressable
          onPress={startSession}
          disabled={!allReady}
          style={[
            lv.btn,
            {
              backgroundColor: allReady
                ? "#3b8995"
                : c.dark
                ? "#1e293b"
                : "#e2e8f0",
              opacity: allReady ? 1 : 0.6,
            },
          ]}
        >
          <Ionicons
            name="play"
            size={18}
            color={allReady ? "#fff" : c.textMuted}
          />
          <Text style={[lv.btnTx, { color: allReady ? "#fff" : c.textMuted }]}>
            {allReady
              ? "Session starten"
              : `Warte auf alle (${
                  activeParticipants.filter((p) => p.isReady).length
                }/${activeParticipants.length})`}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setReady(!amReady)}
          style={[
            lv.btn,
            {
              backgroundColor: amReady ? "#10b981" : "#3b8995",
            },
          ]}
        >
          <Ionicons
            name={amReady ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color="#fff"
          />
          <Text style={lv.btnTx}>{amReady ? "Bereit ✓" : "Bereit melden"}</Text>
        </Pressable>
      )}

      <Pressable onPress={handleLeave} style={lv.leaveBtn}>
        <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "600" }}>
          Raum verlassen
        </Text>
      </Pressable>
    </View>
  ) : null;

  const currentView =
    room && view !== "create" && view !== "join"
      ? LobbyView
      : view === "create"
      ? CreateView
      : view === "join"
      ? JoinView
      : HomeView;

  return (
    <Modal visible={visible} animationType="none" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[lv.root, { backgroundColor: c.cardBg }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={[lv.header, { paddingTop: insets.top + 8 }]}>
          <Text style={[lv.headerTitle, { color: c.textPrimary }]}>
            Co-Focus
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={c.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            lv.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          {currentView}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const lv = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  content: { paddingHorizontal: 20 },
  section: { gap: 14 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 14, lineHeight: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  btnTx: { fontSize: 15, fontWeight: "700", color: "#fff" },
  codeInput: {
    height: 64,
    borderWidth: 1.5,
    borderRadius: 16,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeDisplay: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 6,
    marginTop: 4,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  copyTx: { fontSize: 13, fontWeight: "600" },
  leaveBtn: { alignItems: "center", paddingVertical: 12 },
});
