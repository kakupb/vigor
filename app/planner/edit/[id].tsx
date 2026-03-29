// app/planner/edit/[id].tsx
import { CategorySelector } from "@/components/planner/CategorySelector";
import { DateTimeField } from "@/components/planner/DateTimeField";
import { getCategoryConfig } from "@/constants/categories";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
import { usePlannerStore } from "@/store/plannerStore";
import { PlannerCategory } from "@/types/planner";
import {
  dateToLocalString,
  minutesToTime,
  timeToMinutes,
} from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
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

const DURATION_SHORTCUTS = [15, 30, 45, 60, 90, 120];

export default function PlannerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const entry = usePlannerStore((s) => s.entries.find((e) => e.id === id));
  const updateEntry = usePlannerStore((s) => s.updateEntry);
  const deleteEntry = usePlannerStore((s) => s.deleteEntry);

  const [title, setTitle] = useState(entry?.title ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [allDay, setAllDay] = useState(!entry?.startTime);
  const [category, setCategory] = useState<PlannerCategory | undefined>(
    entry?.category
  );
  const [customCategoryId, setCustomCategoryId] = useState<string | undefined>(
    entry?.customCategoryId // ← VOR Verwendung, mit initialem Wert aus Entry
  );

  // Jetzt erst verwenden:
  const customCats = useCustomCategoryStore((s) => s.categories);
  const customCat = customCats.find((c) => c.id === customCategoryId);
  const effectiveConfig = customCat
    ? {
        ...getCategoryConfig("other"),
        color: customCat.color,
        label: customCat.label,
        lightColor: customCat.color + "20",
      }
    : getCategoryConfig(category);

  const [selectedStartDate, setSelectedStartDate] = useState(
    entry?.date ?? dateToLocalString(new Date())
  );
  const [startMinutes, setStartMinutes] = useState(
    entry?.startTime ? timeToMinutes(entry.startTime) : 540
  );
  const [selectedEndDate, setSelectedEndDate] = useState(
    entry?.endDate ?? entry?.date ?? dateToLocalString(new Date())
  );
  const [endMinutes, setEndMinutes] = useState(() => {
    if (entry?.endTime) return timeToMinutes(entry.endTime);
    const start = entry?.startTime ? timeToMinutes(entry.startTime) : 540;
    return start + (entry?.durationMinute ?? 30);
  });
  const [durationMinutes, setDurationMinutes] = useState(
    entry?.durationMinute ?? 30
  );
  type TimeSource = "start" | "duration" | "end";
  const [lastChanged, setLastChanged] = useState<TimeSource>("start");

  if (!entry) {
    return (
      <View style={s.center}>
        <Text style={s.centerText}>Eintrag nicht gefunden</Text>
        <Pressable onPress={() => router.back()} style={s.centerBtn}>
          <Text style={s.centerBtnText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  function syncEndFromStart(date: string, start: number, dur: number) {
    const total = start + dur;
    const em = total % 1440;
    const d = new Date(date);
    d.setDate(d.getDate() + Math.floor(total / 1440));
    setSelectedEndDate(dateToLocalString(d));
    setEndMinutes(em);
  }

  function syncDurationFromEnd(
    startDate: string,
    start: number,
    endDate: string,
    end: number
  ) {
    const startMs = new Date(startDate).getTime() + start * 60000;
    const endMs = new Date(endDate).getTime() + end * 60000;
    setDurationMinutes(Math.max(15, Math.round((endMs - startMs) / 60000)));
  }

  const canSave = title.trim().length > 0;

  // handleSave:
  function handleSave() {
    if (!canSave) {
      Alert.alert("Titel fehlt", "Bitte gib einen Titel ein.");
      return;
    }
    updateEntry(id, {
      title: title.trim(),
      date: selectedStartDate ?? dateToLocalString(new Date()), // ← Fallback
      startTime: allDay ? undefined : minutesToTime(startMinutes),
      endTime: allDay ? undefined : minutesToTime(endMinutes),
      endDate: allDay ? undefined : selectedEndDate,
      durationMinute: allDay ? undefined : durationMinutes,
      note: note.trim() || undefined,
      category,
      customCategoryId,
    });
    router.back();
  }

  function handleDelete() {
    Alert.alert(
      "Eintrag löschen?",
      "Diese Aktion kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => {
            deleteEntry(id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={s.headerBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color="#64748b" />
        </Pressable>
        <Text style={s.headerTitle}>Bearbeiten</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[s.saveBtn, !canSave && s.saveBtnOff]}
        >
          <Text style={[s.saveBtnText, !canSave && s.saveBtnTextOff]}>
            Speichern
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Titel */}
        <View style={s.card}>
          <TextInput
            style={s.titleInput}
            placeholder="Titel"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            maxLength={80}
          />
        </View>

        {/* Kategorie */}
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

        {/* Zeit */}
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.label}>Zeit</Text>
            <Pressable
              onPress={() => setAllDay((v) => !v)}
              style={[s.pill, allDay && s.pillActive]}
            >
              <Text style={[s.pillText, allDay && s.pillTextActive]}>
                Ganztägig
              </Text>
            </Pressable>
          </View>

          {!allDay && (
            <>
              <Text style={s.sublabel}>Start</Text>
              <DateTimeField
                date={selectedStartDate}
                startMinutes={startMinutes}
                allDay={false}
                onChangeDate={(d) => {
                  setSelectedStartDate(d);
                  setLastChanged("start");
                  syncEndFromStart(d, startMinutes, durationMinutes);
                }}
                onChangeTime={(m) => {
                  setStartMinutes(m);
                  setLastChanged("start");
                  syncEndFromStart(selectedStartDate, m, durationMinutes);
                }}
              />

              <Text style={[s.sublabel, { marginTop: 14 }]}>Dauer</Text>
              <View style={s.durationRow}>
                {DURATION_SHORTCUTS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => {
                      setDurationMinutes(d);
                      setLastChanged("duration");
                      syncEndFromStart(selectedStartDate, startMinutes, d);
                    }}
                    style={[
                      s.durationChip,
                      durationMinutes === d && s.durationChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.durationChipText,
                        durationMinutes === d && s.durationChipTextActive,
                      ]}
                    >
                      {d < 60 ? `${d}m` : `${d / 60}h`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[s.sublabel, { marginTop: 14 }]}>Ende</Text>
              <DateTimeField
                date={selectedEndDate}
                startMinutes={endMinutes}
                allDay={false}
                onChangeDate={(d) => {
                  setSelectedEndDate(d);
                  setLastChanged("end");
                  syncDurationFromEnd(
                    selectedStartDate,
                    startMinutes,
                    d,
                    endMinutes
                  );
                }}
                onChangeTime={(m) => {
                  setEndMinutes(m);
                  setLastChanged("end");
                  syncDurationFromEnd(
                    selectedStartDate,
                    startMinutes,
                    selectedEndDate,
                    m
                  );
                }}
              />
            </>
          )}
        </View>

        {/* Notiz */}
        <View style={s.card}>
          <Text style={s.label}>Notiz</Text>
          <TextInput
            style={s.noteInput}
            placeholder="Optionale Notiz…"
            placeholderTextColor="#94a3b8"
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Löschen */}
        <Pressable onPress={handleDelete} style={s.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={s.deleteBtnText}>Eintrag löschen</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f9fb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  centerText: { fontSize: 16, color: "#64748b" },
  centerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  centerBtnText: { fontWeight: "600", color: "#0f172a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#3b8995",
    borderRadius: 20,
  },
  saveBtnOff: { backgroundColor: "#e2e8f0" },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  saveBtnTextOff: { color: "#94a3b8" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sublabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    paddingVertical: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  pillActive: { backgroundColor: "#3b8995", borderColor: "#3b8995" },
  pillText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  pillTextActive: { color: "white" },
  durationRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  durationChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  durationChipActive: { borderColor: "#3b8995", backgroundColor: "#f0fbfc" },
  durationChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  durationChipTextActive: { color: "#3b8995" },
  noteInput: { fontSize: 15, color: "#0f172a", minHeight: 80, paddingTop: 4 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    paddingVertical: 14,
  },
  deleteBtnText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
});
