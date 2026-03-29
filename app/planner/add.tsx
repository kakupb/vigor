// app/planner/add.tsx
import { CategorySelector } from "@/components/planner/CategorySelector";
import { DateTimeField } from "@/components/planner/DateTimeField";
import { getCategoryConfig } from "@/constants/categories";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
import { usePlannerStore } from "@/store/plannerStore";
import { PlannerCategory } from "@/types/planner";
import { dateToLocalString, minutesToTime } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

function getNextHalfHour() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.ceil(minutes / 30) * 30;
}

export default function PlannerAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addEntry = usePlannerStore((s) => s.addEntry);
  const params = useLocalSearchParams();

  const initialDate =
    typeof params.date === "string"
      ? params.date
      : dateToLocalString(new Date());
  const initialStartTime =
    typeof params.startTime === "string" ? params.startTime : undefined;
  const initialEndTime =
    typeof params.endTime === "string" ? params.endTime : undefined;

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<PlannerCategory | undefined>(
    undefined
  );
  const [customCategoryId, setCustomCategoryId] = useState<
    string | undefined
  >(); // ← VOR Verwendung

  // Jetzt erst:
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

  const [selectedStartDate, setSelectedStartDate] = useState(initialDate);
  const [startMinutes, setStartMinutes] = useState(() => {
    if (initialStartTime) {
      const [h, m] = initialStartTime.split(":").map(Number);
      return h * 60 + m;
    }
    return getNextHalfHour();
  });
  const [selectedEndDate, setSelectedEndDate] = useState(initialDate);
  const [endMinutes, setEndMinutes] = useState(() => {
    if (initialEndTime) {
      const [h, m] = initialEndTime.split(":").map(Number);
      return h * 60 + m;
    }
    return getNextHalfHour() + 30;
  });
  const [durationMinutes, setDurationMinutes] = useState(() => {
    if (initialStartTime && initialEndTime) {
      const [sh, sm] = initialStartTime.split(":").map(Number);
      const [eh, em] = initialEndTime.split(":").map(Number);
      return eh * 60 + em - (sh * 60 + sm);
    }
    return 30;
  });

  type TimeSource = "start" | "duration" | "end";
  const [lastChanged, setLastChanged] = useState<TimeSource>("start");

  useEffect(() => {
    syncEndFromStart(selectedStartDate, startMinutes, durationMinutes);
  }, []);

  function syncEndFromStart(date: string, start: number, dur: number) {
    const total = start + dur;
    const dayOffset = Math.floor(total / 1440);
    const em = total % 1440;
    const d = new Date(date);
    d.setDate(d.getDate() + dayOffset);
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
    const dur = Math.max(15, Math.round((endMs - startMs) / 60000));
    setDurationMinutes(dur);
  }

  const color = effectiveConfig.color;
  const canSave = title.trim().length > 0;

  function handleSave() {
    if (!canSave) {
      Alert.alert("Titel fehlt", "Bitte gib einen Titel ein.");
      return;
    }
    addEntry({
      title: title.trim(),
      color,
      date: selectedStartDate,
      startTime: allDay ? undefined : minutesToTime(startMinutes),
      endTime: allDay ? undefined : minutesToTime(endMinutes),
      endDate: allDay ? undefined : selectedEndDate,
      durationMinute: allDay ? undefined : durationMinutes,
      note: note.trim() || undefined,
      category,
      customCategoryId, // ← NEU
    });
    router.back();
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
          <Ionicons name="close" size={20} color="#64748b" />
        </Pressable>
        <Text style={s.headerTitle}>Neuer Eintrag</Text>
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
            autoFocus
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f9fb" },
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
  noteInput: {
    fontSize: 15,
    color: "#0f172a",
    minHeight: 80,
    paddingTop: 4,
  },
});
