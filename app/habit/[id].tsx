// app/habit/edit/[id].tsx
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { SchedulePicker } from "@/components/habits/SchedulePicker";
import { CategorySelector } from "@/components/planner/CategorySelector";
import { getCategoryConfig } from "@/constants/categories";
import { useHabit } from "@/hooks/useHabits";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
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
  const customCats = useCustomCategoryStore((s) => s.categories);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerCategory>("other");
  const [customCategoryId, setCustomCategoryId] = useState<
    string | undefined
  >();
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
      setCustomCategoryId(habit.customCategoryId);
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

  // Effektive Config — Custom-Kategorie hat Vorrang
  const customCat = customCats.find((c) => c.id === customCategoryId);
  const cfg = customCat
    ? {
        ...getCategoryConfig("other"),
        color: customCat.color,
        label: customCat.label,
        lightColor: customCat.color + "20",
      }
    : getCategoryConfig(category);

  const hasChanges =
    title.trim() !== habit.title ||
    category !== (habit.category ?? "other") ||
    customCategoryId !== habit.customCategoryId ||
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
        customCategoryId,
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
            <CategoryIcon
              category={category}
              customCategoryId={habit.customCategoryId}
              size={20}
              containerSize={40}
            />
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
            placeholder="Habit Titel"
            placeholderTextColor="#94a3b8"
            style={s.input}
            autoFocus={false}
          />
        </View>

        {/* ART */}
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

        {/* ZÄHLER-OPTIONEN */}
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
          <CategorySelector
            selected={customCategoryId ?? category}
            onSelect={(cat, customId) => {
              setCategory(cat ?? "other");
              setCustomCategoryId(customId);
            }}
            horizontal={false}
          />
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
});
