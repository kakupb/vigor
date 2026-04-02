// app/habit/edit/[id].tsx
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { SchedulePicker } from "@/components/habits/SchedulePicker";
import { getCategoryConfig, PLANNER_CATEGORIES } from "@/constants/categories";
import { useHabit } from "@/hooks/useHabits";
import { useHabitStore } from "@/store/habitStore";
import { HabitSchedule, scheduleLabel } from "@/types/habit";
import { PlannerCategory } from "@/types/planner";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function HabitEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { habit } = useHabit(id);
  const updateHabit = useHabitStore((s) => s.updateHabit);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerCategory>("other");
  const [kind, setKind] = useState<"boolean" | "count">("boolean");
  const [unit, setUnit] = useState("");
  const [dailyTarget, setDailyTarget] = useState("1");
  const [schedule, setSchedule] = useState<HabitSchedule>({
    repeatUnit: "day",
    repeatEvery: 1,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (habit) {
      setTitle(habit.title ?? "");
      setCategory(habit.category ?? "other");
      setKind(habit.kind ?? "boolean");
      setUnit(habit.unit ?? "");
      setDailyTarget(String(habit.dailyTarget ?? 1));
      setSchedule(habit.schedule ?? { repeatUnit: "day", repeatEvery: 1 });
    }
  }, [habit]);

  if (!habit) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3b8995" />
      </View>
    );
  }

  const cfg = getCategoryConfig(category);

  const hasChanges =
    title.trim() !== habit.title ||
    category !== (habit.category ?? "other") ||
    kind !== habit.kind ||
    unit !== (habit.unit ?? "") ||
    dailyTarget !== String(habit.dailyTarget ?? 1) ||
    JSON.stringify(schedule) !==
      JSON.stringify(habit.schedule ?? { repeatUnit: "day", repeatEvery: 1 });

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Titel fehlt", "Bitte gib einen Titel ein.");
      return;
    }
    setIsSaving(true);
    try {
      updateHabit(id, {
        title: title.trim(),
        category,
        kind,
        unit: kind === "count" ? unit.trim() || undefined : undefined,
        dailyTarget: kind === "count" ? Number(dailyTarget) || 1 : undefined,
        schedule,
      });
      router.back();
    } catch {
      Alert.alert("Fehler", "Konnte nicht gespeichert werden.");
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (hasChanges) {
      Alert.alert("Änderungen verwerfen?", "", [
        { text: "Weiter bearbeiten", style: "cancel" },
        {
          text: "Verwerfen",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]);
    } else {
      router.back();
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f8f9fb" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* HEADER */}
      <View
        style={[
          s.header,
          { paddingTop: insets.top + 14, backgroundColor: cfg.lightColor },
        ]}
      >
        <View style={s.headerRow}>
          <Pressable
            onPress={handleBack}
            style={s.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.closeBtnText}>✕</Text>
          </Pressable>
          <View style={s.headerCenter}>
            <CategoryIcon category={category} size={20} containerSize={40} />
            <Text style={s.headerSub}>Bearbeiten</Text>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            style={[s.saveBtn, (!hasChanges || isSaving) && s.saveBtnOff]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={s.saveBtnText}>Speichern</Text>
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
        {/* TITEL */}
        <View style={s.card}>
          <Text style={s.label}>Titel</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Habit benennen..."
            placeholderTextColor="#cbd5e1"
            style={s.titleInput}
            maxLength={60}
            autoFocus
          />
        </View>

        {/* TYP */}
        <View style={s.card}>
          <Text style={s.label}>Typ</Text>
          <View style={s.row}>
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
                <Text style={[s.kindIcon, kind === k && { color: "white" }]}>
                  {k === "boolean" ? "✓" : "123"}
                </Text>
                <Text style={[s.kindTitle, kind === k && { color: "white" }]}>
                  {k === "boolean" ? "Abhaken" : "Menge"}
                </Text>
                <Text
                  style={[
                    s.kindSub,
                    kind === k && { color: "rgba(255,255,255,0.75)" },
                  ]}
                >
                  {k === "boolean" ? "Täglich erledigen" : "Ziel verfolgen"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* TAGESZIEL */}
        {kind === "count" && (
          <View style={s.card}>
            <Text style={s.label}>Tagesziel</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.sublabel}>Menge</Text>
                <TextInput
                  value={dailyTarget}
                  onChangeText={(v) => setDailyTarget(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  style={s.input}
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={s.sublabel}>Einheit</Text>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="z.B. Liter, Seiten..."
                  placeholderTextColor="#cbd5e1"
                  style={s.input}
                  maxLength={20}
                />
              </View>
            </View>
          </View>
        )}

        {/* ZEITPLAN */}
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

        {/* KATEGORIE */}
        <View style={s.card}>
          <Text style={s.label}>Kategorie</Text>
          <View style={s.catGrid}>
            {PLANNER_CATEGORIES.map((cat) => {
              const c = getCategoryConfig(cat.id);
              const sel = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    s.chip,
                    sel && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                >
                  <CategoryIcon
                    category={cat.id}
                    customCategoryId={habit.customCategoryId}
                    size={13}
                    containerSize={26}
                  />
                  <Text style={[s.chipText, sel && { color: "white" }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* VORSCHAU */}
        <View style={[s.preview, { borderLeftColor: cfg.color }]}>
          <CategoryIcon
            category={category}
            customCategoryId={habit.customCategoryId}
            size={18}
            containerSize={40}
          />
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
              {kind === "count" ? "Menge" : "Check"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
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
  closeBtnText: { fontSize: 15, color: "#0f172a", fontWeight: "600" },
  headerCenter: { alignItems: "center", gap: 4 },
  headerSub: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: "#3b8995",
    borderRadius: 20,
  },
  saveBtnOff: { backgroundColor: "#cbd5e1" },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  sublabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 6,
  },
  freqBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  freqBadgeText: { fontSize: 12, fontWeight: "600" },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  row: { flexDirection: "row", gap: 10 },
  kindBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    gap: 3,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  kindIcon: { fontSize: 18, color: "#64748b" },
  kindTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  kindSub: { fontSize: 11, color: "#94a3b8", textAlign: "center" },
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
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
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
