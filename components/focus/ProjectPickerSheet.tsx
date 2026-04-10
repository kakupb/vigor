// components/focus/ProjectPickerSheet.tsx
// Bottom Sheet — erscheint wenn der Nutzer "Session starten" tippt.
// Auswahl: Projekt wählen oder ohne Projekt starten.
// Neue Projekte können inline angelegt werden.
//
// Ziel: max 2 Taps bis zur Session. Nicht blockierend.

import { useAppColors } from "@/hooks/useAppColors";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_COLORS as _PROJECT_COLORS, Project } from "@/types/project";
import { Ionicons } from "@expo/vector-icons";
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

// Guard: falls types/project.ts noch nicht ins Projekt liegt, nie crashen
const PROJECT_COLORS: string[] =
  Array.isArray(_PROJECT_COLORS) && _PROJECT_COLORS.length > 0
    ? _PROJECT_COLORS
    : [
        "#3b8995",
        "#4b60af",
        "#8b5cf6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#ec4899",
        "#06b6d4",
        "#84cc16",
        "#f97316",
      ];

type Props = {
  visible: boolean;
  onSelectProject: (project: Project | null) => void; // null = ohne Projekt
  onClose: () => void;
};

// ─── Farb-Picker ──────────────────────────────────────────────────────────────
function ColorDots({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <View style={cd.row}>
      {PROJECT_COLORS.map((color) => (
        <Pressable
          key={color}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(color);
          }}
          style={[
            cd.dot,
            { backgroundColor: color },
            selected === color && cd.dotSelected,
          ]}
        >
          {selected === color && (
            <Ionicons name="checkmark" size={12} color="#fff" />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const cd = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  dotSelected: { transform: [{ scale: 1.2 }] },
});

// ─── Projekt-Zeile ────────────────────────────────────────────────────────────
function ProjectRow({
  project,
  sessionMinutes,
  onPress,
  dark,
}: {
  project: Project;
  sessionMinutes: number;
  onPress: () => void;
  dark: boolean;
}) {
  const hoursLabel =
    sessionMinutes >= 60
      ? `${Math.floor(sessionMinutes / 60)}h ${
          sessionMinutes % 60 > 0 ? `${sessionMinutes % 60}m` : ""
        } gesamt`
      : sessionMinutes > 0
      ? `${sessionMinutes}min gesamt`
      : "Noch keine Sessions";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        pr.row,
        {
          backgroundColor: dark ? "#1e293b" : "#f8f9fb",
          borderColor: dark ? "#334155" : "#e2e8f0",
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      {/* Farb-Dot */}
      <View style={[pr.colorDot, { backgroundColor: project.color }]} />

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {project.emoji ? (
            <Text style={{ fontSize: 14 }}>{project.emoji}</Text>
          ) : null}
          <Text
            style={[pr.title, { color: dark ? "#f1f5f9" : "#0f172a" }]}
            numberOfLines={1}
          >
            {project.title}
          </Text>
        </View>
        <Text style={[pr.sub, { color: dark ? "#475569" : "#94a3b8" }]}>
          {hoursLabel}
          {project.goalHours ? ` · Ziel: ${project.goalHours}h` : ""}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={dark ? "#475569" : "#cbd5e1"}
      />
    </Pressable>
  );
}

const pr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  title: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 2 },
});

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export function ProjectPickerSheet({
  visible,
  onSelectProject,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { projects, addProject, getActiveProjects } = useProjectStore();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [newEmoji, setNewEmoji] = useState("");
  const [newGoalHours, setNewGoalHours] = useState("");

  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowNewForm(false);
      setNewTitle("");
      setNewColor(PROJECT_COLORS[0]);
      setNewEmoji("");
      setNewGoalHours("");
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  // Fokusminuten pro Projekt aus dem focusStore berechnen
  // Lazy require vermeidet circular dependency
  function getSessionMinutes(projectId: string): number {
    try {
      const { useFocusStore } = require("@/store/focusStore");
      const sessions = useFocusStore.getState().sessions;
      return sessions
        .filter((s: any) => s.projectId === projectId)
        .reduce(
          (sum: number, s: any) =>
            sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
          0
        );
    } catch {
      return 0;
    }
  }

  function handleSelect(project: Project | null) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectProject(project);
  }

  function handleSaveNewProject() {
    if (!newTitle.trim()) return;
    const created = addProject(
      newTitle.trim(),
      newColor,
      newEmoji.trim() || undefined,
      newGoalHours ? Number(newGoalHours) : undefined
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleSelect(created);
  }

  const activeProjects = getActiveProjects();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.45)", opacity: opacityAnim },
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            ps.sheet,
            { backgroundColor: c.cardBg, paddingBottom: insets.bottom + 16 },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={[ps.handle, { backgroundColor: c.borderDefault }]} />

          {/* Header */}
          <View style={ps.header}>
            <Text style={[ps.title, { color: c.textPrimary }]}>
              {showNewForm ? "Neues Projekt" : "Für welches Projekt?"}
            </Text>
            {!showNewForm && (
              <Pressable
                onPress={() => setShowNewForm(true)}
                style={[
                  ps.newBtn,
                  { backgroundColor: c.dark ? "#1e293b" : "#f1f5f9" },
                ]}
                hitSlop={8}
              >
                <Ionicons name="add" size={16} color="#3b8995" />
                <Text style={ps.newBtnTx}>Neu</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={ps.content}
          >
            {/* ── Neues Projekt Formular ── */}
            {showNewForm ? (
              <View style={ps.formBox}>
                {/* Emoji + Titel */}
                <View style={ps.titleRow}>
                  <TextInput
                    value={newEmoji}
                    onChangeText={setNewEmoji}
                    placeholder="🎯"
                    style={[
                      ps.emojiInput,
                      { color: c.textPrimary, borderColor: c.borderDefault },
                    ]}
                    maxLength={2}
                    textAlign="center"
                  />
                  <TextInput
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="Projektname"
                    placeholderTextColor={c.textMuted}
                    style={[
                      ps.titleInput,
                      {
                        flex: 1,
                        color: c.textPrimary,
                        borderColor: c.borderDefault,
                        backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                      },
                    ]}
                    autoFocus
                    maxLength={40}
                    returnKeyType="next"
                  />
                </View>

                {/* Ziel-Stunden (optional) */}
                <View style={ps.goalRow}>
                  <Ionicons name="flag-outline" size={14} color={c.textMuted} />
                  <Text style={[ps.goalLabel, { color: c.textMuted }]}>
                    Ziel
                  </Text>
                  <TextInput
                    value={newGoalHours}
                    onChangeText={setNewGoalHours}
                    placeholder="z.B. 80"
                    placeholderTextColor={c.textMuted}
                    style={[
                      ps.goalInput,
                      {
                        color: c.textPrimary,
                        borderColor: c.borderDefault,
                        backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                      },
                    ]}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={[ps.goalLabel, { color: c.textMuted }]}>
                    Stunden (optional)
                  </Text>
                </View>

                {/* Farbe */}
                <ColorDots selected={newColor} onSelect={setNewColor} />

                {/* Vorschau + Speichern */}
                <View style={ps.formActions}>
                  <Pressable
                    onPress={() => {
                      setShowNewForm(false);
                      Keyboard.dismiss();
                    }}
                    style={[ps.cancelBtn, { borderColor: c.borderDefault }]}
                  >
                    <Text style={[ps.cancelTx, { color: c.textSecondary }]}>
                      Abbrechen
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveNewProject}
                    disabled={!newTitle.trim()}
                    style={[ps.saveBtn, { opacity: newTitle.trim() ? 1 : 0.4 }]}
                  >
                    <Text style={ps.saveTx}>Erstellen & starten</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                {/* ── Projektliste ── */}
                {activeProjects.length === 0 ? (
                  <View style={ps.emptyBox}>
                    <Text style={[ps.emptyIcon]}>🎯</Text>
                    <Text style={[ps.emptyTitle, { color: c.textPrimary }]}>
                      Noch keine Projekte
                    </Text>
                    <Text style={[ps.emptySub, { color: c.textMuted }]}>
                      Erstelle ein Projekt um deine Fokuszeit einem Ziel
                      zuzuordnen.
                    </Text>
                    <Pressable
                      onPress={() => setShowNewForm(true)}
                      style={ps.createFirstBtn}
                    >
                      <Text style={ps.createFirstTx}>
                        Erstes Projekt erstellen
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {activeProjects.map((p) => (
                      <ProjectRow
                        key={p.id}
                        project={p}
                        sessionMinutes={getSessionMinutes(p.id)}
                        onPress={() => handleSelect(p)}
                        dark={c.dark}
                      />
                    ))}
                  </View>
                )}

                {/* ── Ohne Projekt starten ── */}
                <Pressable
                  onPress={() => handleSelect(null)}
                  style={({ pressed }) => [
                    ps.skipBtn,
                    { borderColor: c.borderDefault },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[ps.skipTx, { color: c.textSecondary }]}>
                    Ohne Projekt starten
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 18, fontWeight: "700" },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  newBtnTx: { fontSize: 13, fontWeight: "600", color: "#3b8995" },
  content: { paddingHorizontal: 20, paddingBottom: 8, gap: 0 },

  // Form
  formBox: { gap: 14 },
  titleRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  emojiInput: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 22,
    textAlign: "center",
  },
  titleInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalLabel: { fontSize: 13, fontWeight: "500" },
  goalInput: {
    width: 64,
    height: 36,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: "center",
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelTx: { fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
  },
  saveTx: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Empty state
  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  createFirstBtn: {
    marginTop: 8,
    backgroundColor: "#3b8995",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createFirstTx: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Skip
  skipBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  skipTx: { fontSize: 15, fontWeight: "600" },
});
