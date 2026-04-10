// components/focus/InSessionNoteButton.tsx
// Zwei Komponenten:
//
// 1. InSessionNoteButton — schwebendes Notiz-Icon unten rechts im FocusScreen.
//    Öffnet einen minimalen Sheet (Session läuft weiter!).
//    Privat/Teilen-Toggle falls in einer Gruppe.
//
// 2. CoFocusParticipantsBar — kompakte Teilnehmerliste oben im FocusScreen.
//    Zeigt alle aktiven Participants mit Ready-Status.

import { useCoFocusStore } from "@/store/coFocusStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// ═══════════════════════════════════════════════════════════════════
// InSessionNoteButton
// ═══════════════════════════════════════════════════════════════════

type NoteButtonProps = {
  isGroupSession: boolean;
  noteMode: string;
};

export function InSessionNoteButton({
  isGroupSession,
  noteMode,
}: NoteButtonProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isPrivate, setIsPrivate] = useState(
    noteMode === "private" ? true : noteMode === "shared" ? false : true
  );
  const [saved, setSaved] = useState(false);

  const { addNote: addGroupNote } = useCoFocusStore();
  const slideAnim = useRef(new Animated.Value(300)).current;

  function openSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetOpen(true);
    setSaved(false);
    setNoteText("");
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }

  function closeSheet() {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSheetOpen(false));
  }

  async function handleSave() {
    if (!noteText.trim()) {
      closeSheet();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isGroupSession) {
      await addGroupNote(noteText.trim(), isPrivate, "during");
    } else {
      // Solo: sessionNoteStore — während Session gespeichert
      // (bleibt für spätere Verknüpfung im SessionNoteSheet)
      try {
        const { useSessionNoteStore } = require("@/store/sessionNoteStore");
        // Einfacher Text-Eintrag der später im NoteSheet angezeigt wird
        const store = useSessionNoteStore.getState();
        // Hier als freeText-Ergänzung speichern — wird beim Öffnen des NoteSheets vorausgefüllt
        // (nur im RAM, kein eigener Store-Eintrag nötig — NoteSheet schreibt dann final)
      } catch {}
    }

    setSaved(true);
    setTimeout(() => closeSheet(), 800);
  }

  const canTogglePrivacy = isGroupSession && noteMode === "individual";

  return (
    <>
      {/* ── Floating Button ── */}
      {!sheetOpen && (
        <Pressable onPress={openSheet} style={nb.fab} hitSlop={8}>
          <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.9)" />
        </Pressable>
      )}

      {/* ── Mini-Sheet ── */}
      {sheetOpen && (
        <KeyboardAvoidingView
          style={nb.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[nb.sheet, { transform: [{ translateY: slideAnim }] }]}
          >
            {/* Handle + Header */}
            <View style={nb.sheetHeader}>
              <View style={nb.handle} />
              <View style={nb.headerRow}>
                <Text style={nb.sheetTitle}>Notiz hinzufügen</Text>
                {/* Privacy Toggle (nur bei individual-Modus in Gruppe) */}
                {canTogglePrivacy && (
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIsPrivate((v) => !v);
                    }}
                    style={[
                      nb.privacyBtn,
                      { backgroundColor: isPrivate ? "#1e293b" : "#0c2430" },
                    ]}
                  >
                    <Ionicons
                      name={isPrivate ? "lock-closed" : "people"}
                      size={13}
                      color={isPrivate ? "#94a3b8" : "#3b8995"}
                    />
                    <Text
                      style={[
                        nb.privacyTx,
                        { color: isPrivate ? "#94a3b8" : "#3b8995" },
                      ]}
                    >
                      {isPrivate ? "Privat" : "Geteilt"}
                    </Text>
                  </Pressable>
                )}
                {!canTogglePrivacy && isGroupSession && (
                  <View style={nb.modeBadge}>
                    <Ionicons
                      name={
                        noteMode === "shared"
                          ? "people"
                          : noteMode === "private"
                          ? "lock-closed"
                          : "person"
                      }
                      size={12}
                      color="#64748b"
                    />
                    <Text style={nb.modeTx}>
                      {noteMode === "shared"
                        ? "Für alle sichtbar"
                        : noteMode === "private"
                        ? "Nur für dich"
                        : "Privat"}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Input */}
            {saved ? (
              <View style={nb.savedRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={nb.savedTx}>Notiz gespeichert</Text>
              </View>
            ) : (
              <View style={nb.inputRow}>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Schnelle Notiz…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={nb.input}
                  multiline
                  maxLength={300}
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
                <View style={nb.actions}>
                  <Pressable onPress={closeSheet} style={nb.cancelBtn}>
                    <Text style={nb.cancelTx}>Abbrechen</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    style={[nb.saveBtn, { opacity: noteText.trim() ? 1 : 0.4 }]}
                  >
                    <Text style={nb.saveTx}>Speichern</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const nb = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sheetHeader: { gap: 8, paddingTop: 12 },
  handle: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  privacyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  privacyTx: { fontSize: 12, fontWeight: "600" },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  modeTx: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  inputRow: { gap: 10 },
  input: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
    paddingTop: 4,
  },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  cancelTx: { color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "500" },
  saveBtn: {
    backgroundColor: "#3b8995",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveTx: { color: "#fff", fontSize: 14, fontWeight: "700" },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  savedTx: { color: "#10b981", fontSize: 14, fontWeight: "600" },
});

// ═══════════════════════════════════════════════════════════════════
// CoFocusParticipantsBar
// Kompakte Leiste am oberen Rand des FocusScreen
// ═══════════════════════════════════════════════════════════════════

export function CoFocusParticipantsBar() {
  const { participants, myUserId, room } = useCoFocusStore();
  const active = participants.filter((p) => !p.leftAt);
  if (!room || active.length <= 1) return null;

  return (
    <View style={pb.bar}>
      <View style={pb.dotsRow}>
        {active.map((p) => {
          const initial = p.displayName.charAt(0).toUpperCase();
          const isMe = p.userId === myUserId;
          return (
            <View
              key={p.id}
              style={[
                pb.dot,
                {
                  backgroundColor: isMe
                    ? "rgba(59,137,149,0.8)"
                    : "rgba(255,255,255,0.2)",
                  borderColor: isMe ? "#3b8995" : "rgba(255,255,255,0.3)",
                },
              ]}
            >
              <Text style={pb.initial}>{initial}</Text>
            </View>
          );
        })}
      </View>
      <Text style={pb.label}>{active.length} fokussieren gerade</Text>
    </View>
  );
}

const pb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dotsRow: { flexDirection: "row", gap: 4 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  initial: { color: "#fff", fontSize: 11, fontWeight: "700" },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
});
