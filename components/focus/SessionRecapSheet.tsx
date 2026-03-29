// components/focus/SessionRecapSheet.tsx
// Der Moment nach einer Session — Celebration, Streak-Update, kurze Notiz.
// Wird nach jedem FocusScreen-Exit angezeigt.
// Dieser Screen ist der wichtigste Retention-Mechanismus der App.

import { useAppColors } from "@/hooks/useAppColors";
import { useFocusStore } from "@/store/focusStore";
import { useNoteStore } from "@/store/noteStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
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

// ─── Motivations-Text je nach Session-Dauer ──────────────────────────────────
function getMotivationText(
  minutes: number,
  streak: number
): { title: string; sub: string } {
  if (minutes < 5)
    return {
      title: "Angefangen zählt.",
      sub: "Der erste Schritt ist der schwerste.",
    };
  if (minutes < 15) return { title: "Gut gemacht.", sub: "Jede Minute zählt." };
  if (minutes < 30)
    return { title: "Solide Session.", sub: "Du baust Momentum auf." };
  if (minutes < 60)
    return {
      title: "Starke Leistung.",
      sub:
        streak > 3
          ? `${streak} Tage Streak. Mach weiter.`
          : "So wird ein Streak aufgebaut.",
    };
  if (minutes < 90)
    return { title: "Beeindruckend.", sub: "Über eine Stunde tiefer Fokus." };
  return { title: "Aussergewöhnlich.", sub: "Das ist Spitzenklasse." };
}

// ─── Stat-Kachel ──────────────────────────────────────────────────────────────
function StatKachel({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[k.kachel, { backgroundColor: bg }]}>
      <Ionicons
        name={icon as any}
        size={18}
        color={color}
        style={{ marginBottom: 6 }}
      />
      <Text style={[k.value, { color }]}>{value}</Text>
      <Text style={[k.label, { color }]}>{label}</Text>
    </View>
  );
}

const k = StyleSheet.create({
  kachel: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 2,
  },
  value: { fontSize: 20, fontWeight: "800" },
  label: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.75,
    textAlign: "center",
  },
});

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  durationSeconds: number;
  pomodoroCount: number;
  onClose: () => void;
};

export function SessionRecapSheet({
  visible,
  durationSeconds,
  pomodoroCount,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const stats = useFocusStore((s) => s.stats);
  const addNote = useNoteStore((s) => s.addNote);

  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const streak = stats.currentStreak;
  const motivation = getMotivationText(minutes, streak);

  // Eingangs-Animation
  useEffect(() => {
    if (visible) {
      setNoteText("");
      setNoteSaved(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  function handleSaveNote() {
    if (!noteText.trim()) return;
    const today = new Date().toISOString().split("T")[0];
    const blocks = [
      {
        id: Crypto.randomUUID(),
        type: "text" as const,
        content: noteText.trim(),
      },
    ];
    addNote(blocks, today, `Session — ${formatDuration()}`, ["fokus"]);
    setNoteSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  function formatDuration(): string {
    if (minutes === 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes} Min`;
    return `${minutes}:${String(seconds).padStart(2, "0")} Min`;
  }

  const durationLabel = formatDuration();
  const isNewStreakDay = streak > 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop */}
        <Pressable style={s.backdrop} onPress={handleClose} />

        {/* Sheet */}
        <Animated.View
          style={[
            s.sheet,
            { backgroundColor: c.cardBg, paddingBottom: insets.bottom + 24 },
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: c.borderDefault }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {/* ── Celebration ── */}
            <View style={s.celebrationRow}>
              <Text style={s.checkEmoji}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.motivTitle, { color: c.textPrimary }]}>
                  {motivation.title}
                </Text>
                <Text style={[s.motivSub, { color: c.textMuted }]}>
                  {motivation.sub}
                </Text>
              </View>
            </View>

            {/* ── Stat-Kacheln ── */}
            <View style={s.kachelRow}>
              <StatKachel
                icon="timer-outline"
                value={durationLabel}
                label="Fokussiert"
                color="#3b8995"
                bg={c.dark ? "#0c2430" : "#f0fbfc"}
              />
              <StatKachel
                icon="flame-outline"
                value={streak > 0 ? `${streak}` : "–"}
                label={streak === 1 ? "Tag Fokus" : "Tage Fokus-Streak"}
                color={streak > 0 ? "#f59e0b" : c.dark ? "#475569" : "#94a3b8"}
                bg={
                  streak > 0
                    ? c.dark
                      ? "#2d1a00"
                      : "#fffbeb"
                    : c.dark
                    ? "#1e293b"
                    : "#f8f9fb"
                }
              />
              {pomodoroCount > 0 && (
                <StatKachel
                  icon="cafe-outline"
                  value={`${pomodoroCount}`}
                  label={pomodoroCount === 1 ? "Pomodoro" : "Pomodoros"}
                  color="#8b5cf6"
                  bg={c.dark ? "#1e1040" : "#f5f3ff"}
                />
              )}
            </View>

            {/* ── Streak-Badge (neu) ── */}
            {isNewStreakDay && (
              <View
                style={[
                  s.streakBanner,
                  {
                    backgroundColor: c.dark ? "#2d1a00" : "#fffbeb",
                    borderColor: c.dark ? "#78350f" : "#fde68a",
                  },
                ]}
              >
                <MaterialCommunityIcons name="fire" size={18} color="#f59e0b" />
                <Text
                  style={[
                    s.streakBannerText,
                    { color: c.dark ? "#fcd34d" : "#92400e" },
                  ]}
                >
                  {streak === 1
                    ? "Erster Tag! Komm morgen wieder."
                    : `${streak} Tage in Folge. Brich den Streak nicht.`}
                </Text>
              </View>
            )}

            {/* ── Schnelle Notiz ── */}
            <View style={[s.noteSection, { borderColor: c.borderDefault }]}>
              <View style={s.noteLabelRow}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={c.textMuted}
                />
                <Text style={[s.noteLabel, { color: c.textMuted }]}>
                  Was hast du heute gelernt?
                </Text>
                <Text style={[s.noteOptional, { color: c.textMuted }]}>
                  Optional
                </Text>
              </View>

              {noteSaved ? (
                <View
                  style={[
                    s.noteSavedBadge,
                    { backgroundColor: c.dark ? "#0d2e1e" : "#f0fdf4" },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={s.noteSavedText}>Notiz gespeichert</Text>
                </View>
              ) : (
                <>
                  <TextInput
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="z.B. Heute das Kapitel über Algorithms fertig..."
                    placeholderTextColor={c.textDisabled}
                    style={[
                      s.noteInput,
                      {
                        color: c.textPrimary,
                        backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                        borderColor:
                          noteText.length > 0 ? "#3b8995" : c.borderDefault,
                      },
                    ]}
                    multiline
                    maxLength={280}
                    returnKeyType="done"
                    blurOnSubmit
                  />
                  {noteText.trim().length > 0 && (
                    <Pressable
                      onPress={handleSaveNote}
                      style={({ pressed }) => [
                        s.noteSaveBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Ionicons name="checkmark" size={15} color="#fff" />
                      <Text style={s.noteSaveBtnText}>Notiz speichern</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>

            {/* ── Weiter-Button ── */}
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                s.closeBtn,
                { borderColor: c.borderMuted },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[s.closeBtnText, { color: c.textSecondary }]}>
                Fertig
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 14 },

  // Celebration
  celebrationRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  checkEmoji: { fontSize: 40, color: "#10b981" },
  motivTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  motivSub: { fontSize: 14, marginTop: 2 },

  // Kacheln
  kachelRow: { flexDirection: "row", gap: 10 },

  // Streak Banner
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  streakBannerText: { fontSize: 13, fontWeight: "600", flex: 1 },

  // Notiz
  noteSection: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  noteLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteLabel: { fontSize: 13, fontWeight: "600", flex: 1 },
  noteOptional: { fontSize: 11 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: "top",
  },
  noteSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3b8995",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-end",
  },
  noteSaveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  noteSavedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    padding: 12,
  },
  noteSavedText: { color: "#10b981", fontWeight: "600", fontSize: 14 },

  // Close
  closeBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  closeBtnText: { fontSize: 15, fontWeight: "600" },
});
