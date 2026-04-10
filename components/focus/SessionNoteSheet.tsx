// components/focus/SessionNoteSheet.tsx
// Strukturierte Reflexion nach einer Session.
// Ersetzt die einfache Notiz im SessionRecapSheet komplett.
//
// Flow: SessionRecapSheet "Fertig" → SessionNoteSheet (optional, 1 Tap weg)
// Inhalt: Score 1-10 → Smart-Fragen → Freitext → Nächste Schritte

import { useAppColors } from "@/hooks/useAppColors";
import { useSessionNoteStore } from "@/store/sessionNoteStore";
import { getSmartQuestions, NextStep, SessionNote } from "@/types/sessionNote";
import { Ionicons } from "@expo/vector-icons";
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

// ─── Score-Picker (1–10) ──────────────────────────────────────────────────────
function ScorePicker({
  value,
  onChange,
  dark,
}: {
  value: number;
  onChange: (v: number) => void;
  dark: boolean;
}) {
  const colors = {
    1: "#ef4444",
    2: "#f97316",
    3: "#f97316",
    4: "#f59e0b",
    5: "#f59e0b",
    6: "#84cc16",
    7: "#10b981",
    8: "#10b981",
    9: "#3b8995",
    10: "#4b60af",
  };
  const labels: Record<number, string> = {
    1: "Kaum konzentriert",
    5: "Solide",
    10: "Perfekte Session",
  };

  return (
    <View style={sp.container}>
      <View style={sp.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = n === value;
          const col = colors[n as keyof typeof colors];
          return (
            <Pressable
              key={n}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(n);
              }}
              style={[
                sp.dot,
                {
                  backgroundColor: active ? col : dark ? "#1e293b" : "#f1f5f9",
                  borderColor: active ? col : dark ? "#334155" : "#e2e8f0",
                  transform: [{ scale: active ? 1.15 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  sp.dotTx,
                  { color: active ? "#fff" : dark ? "#64748b" : "#94a3b8" },
                ]}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value > 0 && (
        <Text
          style={[sp.label, { color: colors[value as keyof typeof colors] }]}
        >
          {value}/10
          {labels[value] ? ` · ${labels[value]}` : ""}
        </Text>
      )}
    </View>
  );
}

const sp = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", gap: 6 },
  dot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 34,
  },
  dotTx: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});

// ─── Next Step Zeile ──────────────────────────────────────────────────────────
function NextStepRow({
  step,
  onToggle,
  onDelete,
  dark,
}: {
  step: NextStep;
  onToggle: () => void;
  onDelete: () => void;
  dark: boolean;
}) {
  return (
    <View style={[ns.row, { borderColor: dark ? "#334155" : "#e2e8f0" }]}>
      <Pressable onPress={onToggle} style={ns.check}>
        <Ionicons
          name={step.done ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={step.done ? "#10b981" : dark ? "#475569" : "#cbd5e1"}
        />
      </Pressable>
      <Text
        style={[
          ns.text,
          { color: dark ? "#f1f5f9" : "#0f172a" },
          step.done && ns.done,
        ]}
      >
        {step.text}
      </Text>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="close" size={16} color={dark ? "#475569" : "#cbd5e1"} />
      </Pressable>
    </View>
  );
}

const ns = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  check: { flexShrink: 0 },
  text: { flex: 1, fontSize: 14, fontWeight: "500" },
  done: { textDecorationLine: "line-through", opacity: 0.5 },
});

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  sessionId: string;
  sessionMinutes: number;
  projectId?: string;
  projectTitle?: string;
  date: string; // YYYY-MM-DD
  onClose: () => void;
};

export function SessionNoteSheet({
  visible,
  sessionId,
  sessionMinutes,
  projectId,
  projectTitle,
  date,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { addNote } = useSessionNoteStore();

  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [newStep, setNewStep] = useState("");
  const [saved, setSaved] = useState(false);

  const hour = new Date().getHours();
  const questions = getSmartQuestions(sessionMinutes, hour);

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setSaved(false);
      setScore(0);
      setAnswers({});
      setFreeText("");
      setNextSteps([]);
      setNewStep("");
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [visible]);

  function addNextStep() {
    if (!newStep.trim()) return;
    setNextSteps((prev) => [
      ...prev,
      { id: Crypto.randomUUID(), text: newStep.trim(), done: false },
    ]);
    setNewStep("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function toggleStep(id: string) {
    setNextSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
    Haptics.selectionAsync();
  }

  function deleteStep(id: string) {
    setNextSteps((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSave() {
    Keyboard.dismiss();
    const note: SessionNote = {
      id: sessionId,
      sessionId,
      projectId,
      date,
      score: score || 5, // Fallback wenn kein Score gesetzt
      answers,
      freeText: freeText.trim(),
      nextSteps,
      createdAt: Date.now(),
    };
    await addNote(note);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => onClose(), 800);
  }

  function handleSkip() {
    Keyboard.dismiss();
    onClose();
  }

  const hasContent =
    score > 0 ||
    Object.values(answers).some((a) => a.trim()) ||
    freeText.trim() ||
    nextSteps.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop */}
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.5)" },
          ]}
          onPress={handleSkip}
        />

        {/* Sheet */}
        <Animated.View
          style={[
            s.sheet,
            { backgroundColor: c.cardBg, paddingBottom: insets.bottom + 20 },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: c.borderDefault }]} />

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: c.textPrimary }]}>
                Session-Reflexion
              </Text>
              {projectTitle ? (
                <Text style={[s.subtitle, { color: c.textMuted }]}>
                  {projectTitle}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={handleSkip} hitSlop={8}>
              <Text style={[s.skipTx, { color: c.textSecondary }]}>
                {hasContent ? "Speichern" : "Überspringen"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {/* ── Produktivitäts-Score ── */}
            <View style={[s.section, { borderColor: c.borderDefault }]}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>
                Wie produktiv war diese Session?
              </Text>
              <ScorePicker value={score} onChange={setScore} dark={c.dark} />
            </View>

            {/* ── Smart-Fragen ── */}
            {questions.map((q) => (
              <View
                key={q.id}
                style={[s.section, { borderColor: c.borderDefault }]}
              >
                <Text style={[s.sectionLabel, { color: c.textMuted }]}>
                  {q.text}
                </Text>
                <TextInput
                  value={answers[q.id] ?? ""}
                  onChangeText={(t) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: t }))
                  }
                  placeholder={q.placeholder}
                  placeholderTextColor={c.textDisabled}
                  style={[
                    s.input,
                    {
                      color: c.textPrimary,
                      backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                      borderColor: answers[q.id]?.trim()
                        ? "#3b8995"
                        : c.borderDefault,
                    },
                  ]}
                  multiline
                  maxLength={200}
                />
              </View>
            ))}

            {/* ── Freier Text ── */}
            <View style={[s.section, { borderColor: c.borderDefault }]}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>
                Notizen (optional)
              </Text>
              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                placeholder="Alles was dir wichtig erscheint…"
                placeholderTextColor={c.textDisabled}
                style={[
                  s.input,
                  s.inputLarge,
                  {
                    color: c.textPrimary,
                    backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                    borderColor: freeText.trim() ? "#3b8995" : c.borderDefault,
                  },
                ]}
                multiline
                maxLength={500}
              />
            </View>

            {/* ── Nächste Schritte ── */}
            <View style={[s.section, { borderColor: c.borderDefault }]}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>
                Nächste Schritte
              </Text>

              {nextSteps.map((step) => (
                <NextStepRow
                  key={step.id}
                  step={step}
                  onToggle={() => toggleStep(step.id)}
                  onDelete={() => deleteStep(step.id)}
                  dark={c.dark}
                />
              ))}

              <View style={s.addStepRow}>
                <TextInput
                  value={newStep}
                  onChangeText={setNewStep}
                  placeholder="Nächsten Schritt eingeben…"
                  placeholderTextColor={c.textDisabled}
                  style={[
                    s.stepInput,
                    {
                      color: c.textPrimary,
                      backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                      borderColor: c.borderDefault,
                    },
                  ]}
                  returnKeyType="done"
                  onSubmitEditing={addNextStep}
                  maxLength={120}
                />
                <Pressable
                  onPress={addNextStep}
                  disabled={!newStep.trim()}
                  style={[s.addBtn, { opacity: newStep.trim() ? 1 : 0.3 }]}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>

            {/* ── Speichern ── */}
            {saved ? (
              <View
                style={[
                  s.savedBadge,
                  { backgroundColor: c.dark ? "#0d2e1e" : "#f0fdf4" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={s.savedTx}>Reflexion gespeichert</Text>
              </View>
            ) : (
              <Pressable
                onPress={hasContent ? handleSave : handleSkip}
                style={[
                  s.saveBtn,
                  {
                    backgroundColor: hasContent
                      ? "#3b8995"
                      : c.dark
                      ? "#1e293b"
                      : "#f1f5f9",
                  },
                ]}
              >
                <Text
                  style={[
                    s.saveTx,
                    { color: hasContent ? "#fff" : c.textSecondary },
                  ]}
                >
                  {hasContent
                    ? "Reflexion speichern"
                    : "Ohne Reflexion schließen"}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  skipTx: { fontSize: 14, fontWeight: "600" },
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },

  section: { gap: 10, paddingBottom: 16, borderBottomWidth: 1 },
  sectionLabel: { fontSize: 13, fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  inputLarge: { minHeight: 80 },

  addStepRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  stepInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
  },

  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    justifyContent: "center",
  },
  savedTx: { color: "#10b981", fontWeight: "700", fontSize: 14 },

  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveTx: { fontSize: 15, fontWeight: "700" },
});
