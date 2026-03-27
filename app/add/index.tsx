// app/add/index.tsx
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { SchedulePicker } from "@/components/habits/SchedulePicker";
import { CategorySelector } from "@/components/planner/CategorySelector";
import { getCategoryConfig } from "@/constants/categories";
import { useHabitStore } from "@/store/habitStore";
import { HabitSchedule, scheduleLabel } from "@/types/habit";
import { PlannerCategory } from "@/types/planner";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_SCHEDULE: HabitSchedule = {
  startDate: new Date().toISOString().split("T")[0],
  repeatUnit: "day",
  repeatEvery: 1,
};

export default function AddHabitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addHabit = useHabitStore((s) => s.addHabit);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerCategory>("other");
  const [kind, setKind] = useState<"boolean" | "count">("boolean");
  const [unit, setUnit] = useState("");
  const [dailyTarget, setDailyTarget] = useState("1");
  const [schedule, setSchedule] = useState<HabitSchedule>(DEFAULT_SCHEDULE);
  const [isSaving, setIsSaving] = useState(false);
  const cfg = getCategoryConfig(category);

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Titel fehlt", "Bitte gib einen Titel ein.");
      return;
    }
    if (kind === "count") {
      if (!unit.trim()) {
        Alert.alert("Einheit fehlt", "Bitte gib eine Einheit ein.");
        return;
      }
      if (!dailyTarget || Number(dailyTarget) <= 0) {
        Alert.alert("Tagesziel fehlt", "Bitte gib ein gültiges Tagesziel ein.");
        return;
      }
    }
    setIsSaving(true);
    addHabit(
      title.trim(),
      kind,
      category,
      kind === "count" ? unit.trim() : undefined,
      kind === "count" ? Number(dailyTarget) : undefined,
      schedule
    );
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f8f9fb" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          s.header,
          { paddingTop: insets.top + 14, backgroundColor: cfg.lightColor },
        ]}
      >
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={s.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.closeBtnText}>✕</Text>
          </Pressable>
          <View style={s.headerCenter}>
            <CategoryIcon category={category} size={20} containerSize={40} />
            <Text style={s.headerSub}>
              {title.length > 0 ? title : "Neues Habit"}
            </Text>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={!title.trim() || isSaving}
            style={[s.saveBtn, (!title.trim() || isSaving) && s.saveBtnOff]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={s.saveBtnText}>Erstellen</Text>
            )}
          </Pressable>
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <Text style={s.label}>Titel</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="z.B. Täglich lesen, 10.000 Schritte..."
            placeholderTextColor="#94a3b8"
            style={s.input}
            autoFocus
          />
        </View>
        <View style={s.card}>
          <Text style={s.label}>Art</Text>
          <View style={s.kindRow}>
            {(["boolean", "count"] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[
                  s.kindBtn,
                  kind === k && {
                    backgroundColor: cfg.color,
                    borderColor: cfg.color,
                  },
                ]}
              >
                <Text style={[s.kindText, kind === k && { color: "white" }]}>
                  {k === "boolean" ? "Ja / Nein" : "Zähler"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {kind === "count" && (
          <View style={s.card}>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Tagesziel</Text>
                <TextInput
                  value={dailyTarget}
                  onChangeText={setDailyTarget}
                  keyboardType="numeric"
                  style={s.input}
                  placeholderTextColor="#cbd5e1"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Einheit</Text>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="Seiten, Min..."
                  placeholderTextColor="#cbd5e1"
                  style={s.input}
                  maxLength={20}
                />
              </View>
            </View>
          </View>
        )}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.label}>Zeitplan</Text>
            <View style={[s.freqBadge, { backgroundColor: cfg.lightColor }]}>
              <Text style={[s.freqBadgeText, { color: cfg.color }]}>
                {scheduleLabel(schedule)}
              </Text>
            </View>
          </View>
          <SchedulePicker
            value={schedule}
            onChange={setSchedule}
            accentColor={cfg.color}
          />
        </View>
        <View style={s.card}>
          <Text style={s.label}>Kategorie</Text>
          <CategorySelector
            selected={category}
            onSelect={(cat) => setCategory(cat ?? "other")}
            horizontal={false}
          />
        </View>
        <View style={[s.preview, { borderLeftColor: cfg.color }]}>
          <CategoryIcon category={category} size={18} containerSize={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitle} numberOfLines={1}>
              {title || "Habit Titel"}
            </Text>
            <Text style={s.previewSub}>
              {cfg.label}
              {kind === "count" && dailyTarget && unit
                ? ` · ${dailyTarget} ${unit}`
                : ""}
              {" · "}
              {scheduleLabel(schedule)}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: cfg.lightColor }]}>
            <Text style={[s.badgeText, { color: cfg.color }]}>
              {kind === "count" ? "Zähler" : "Check"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: { fontSize: 15, color: "#475569", fontWeight: "600" },
  headerCenter: { alignItems: "center", gap: 6 },
  headerSub: { fontSize: 13, color: "#475569", fontWeight: "600" },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#3b8995",
    borderRadius: 20,
  },
  saveBtnOff: { backgroundColor: "#e2e8f0" },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f8f9fb",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
  },
  kindRow: { flexDirection: "row", gap: 8 },
  kindBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
    alignItems: "center",
  },
  kindText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  row2: { flexDirection: "row", gap: 12 },
  freqBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  freqBadgeText: { fontSize: 12, fontWeight: "600" },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  previewSub: { fontSize: 12, color: "#64748b" },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700" },
});
