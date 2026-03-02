// app/planner/edit/[id].tsx - FIXED VERSION
import { CategorySelector } from "@/components/planner/CategorySelector";
import { DateTimeField } from "@/components/planner/DateTimeField";
import { usePlannerStore } from "@/store/plannerStore";
import { PlannerCategory } from "@/types/planner";
import {
  dateToLocalString,
  getTodayTimestamp,
  minutesToTime,
  timeToMinutes,
} from "@/utils/dateUtils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function PlannerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const entry = usePlannerStore((s) => s.entries.find((e) => e.id === id));
  const updateEntry = usePlannerStore((s) => s.updateEntry);
  const deleteEntry = usePlannerStore((s) => s.deleteEntry);

  const [title, setTitle] = useState(entry?.title || "");
  const [note, setNote] = useState(entry?.note || "");
  const [allDay, setAllDay] = useState(!entry?.startTime);
  const [category, setCategory] = useState<PlannerCategory | undefined>(
    entry?.category
  );

  const [selectedStartDate, setSelectedStartDate] = useState(
    entry?.date || dateToLocalString(new Date())
  );

  const [startMinutes, setStartMinutes] = useState(
    entry?.startTime ? timeToMinutes(entry.startTime) : 540
  );

  const [selectedEndDate, setSelectedEndDate] = useState(
    entry?.endDate || entry?.date || dateToLocalString(new Date())
  );

  const [endMinutes, setEndMinutes] = useState(() => {
    if (entry?.endTime) return timeToMinutes(entry.endTime);
    const start = entry?.startTime ? timeToMinutes(entry.startTime) : 540;
    return start + (entry?.durationMinute || 30);
  });

  const [durationMinutes, setDurationMinutes] = useState(
    entry?.durationMinute || 30
  );

  type TimeSource = "start" | "duration" | "end";
  const [lastChanged, setLastChanged] = useState<TimeSource>("start");

  // ✅ SYNC LOGIC - wie in add.tsx
  useEffect(() => {
    if (!allDay && lastChanged !== "end") {
      syncEndFromStartAndDuration(
        selectedStartDate,
        startMinutes,
        durationMinutes
      );
    }
  }, [selectedStartDate, startMinutes, durationMinutes, lastChanged, allDay]);

  if (!entry) {
    return (
      <View
        style={{
          flex: 1,
          padding: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 18, color: "#666" }}>
          Eintrag nicht gefunden
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: "#111", fontSize: 16 }}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  // ✅ HELPER FUNCTIONS - kopiert von add.tsx
  function computeEndFromStartAndDuration(
    date: string,
    startMinutes: number,
    duration: number
  ) {
    const total = startMinutes + duration;
    const dayOffset = Math.floor(total / 1440);
    const endMinutes = total % 1440;

    const d = new Date(date);
    d.setDate(d.getDate() + dayOffset);

    return {
      selectedEndDate: dateToLocalString(d),
      endMinutes,
    };
  }

  function computeDurationFromStartAndEnd(
    startDate: string,
    startMinutes: number,
    endDate: string,
    endMinutes: number
  ) {
    const dayDiff =
      (getTodayTimestamp(endDate) - getTodayTimestamp(startDate)) /
      (1000 * 60 * 60 * 24);

    return dayDiff * 1440 + (endMinutes - startMinutes);
  }

  function syncEndFromStartAndDuration(
    date: string,
    startMinutes: number,
    duration: number
  ) {
    const { selectedEndDate, endMinutes } = computeEndFromStartAndDuration(
      date,
      startMinutes,
      duration
    );

    setSelectedEndDate(selectedEndDate);
    setEndMinutes(endMinutes);
  }

  function syncDurationFromStartAndEnd(
    startDate: string,
    startMinutes: number,
    endDate: string,
    endMinutes: number
  ) {
    const d = computeDurationFromStartAndEnd(
      startDate,
      startMinutes,
      endDate,
      endMinutes
    );

    setDurationMinutes(d);
  }

  function handleSave() {
    if (!entry) return;
    if (!title.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Titel ein");
      return;
    }

    updateEntry(entry.id, {
      title: title.trim(),
      date: selectedStartDate,
      startTime: allDay ? undefined : minutesToTime(startMinutes),
      durationMinute: allDay ? undefined : durationMinutes,
      endDate: allDay ? undefined : selectedEndDate,
      endTime: allDay ? undefined : minutesToTime(endMinutes),
      note: note.trim(),
      category: category,
    });

    router.back();
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert("Löschen?", `"${entry.title}" wirklich löschen?`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => {
          deleteEntry(entry.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "600" }}>
          Eintrag bearbeiten
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: "#666" }}>Abbrechen</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Titel */}
        <TextInput
          placeholder="Titel"
          value={title}
          onChangeText={setTitle}
          style={{
            borderWidth: 1,
            borderColor: "#999",
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            fontSize: 16,
          }}
        />

        {/* Category */}
        <View style={{ marginBottom: 16 }}>
          <CategorySelector selected={category} onSelect={setCategory} />
        </View>

        {/* Ganztägig Toggle */}
        <Pressable
          onPress={() => setAllDay((v) => !v)}
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#999",
            backgroundColor: allDay ? "#888" : "transparent",
            width: 100,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: allDay ? "white" : "#777",
              fontWeight: "600",
              fontSize: 12,
            }}
          >
            Ganztägig
          </Text>
        </Pressable>

        {/* Timed Fields */}
        {!allDay && (
          <>
            {/* Start */}
            <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Start
            </Text>
            <DateTimeField
              date={selectedStartDate}
              startMinutes={startMinutes}
              allDay={allDay}
              onChangeDate={(d) => {
                setSelectedStartDate(d);
                setLastChanged("start");
              }}
              onChangeTime={(m) => {
                setStartMinutes(m);
                setLastChanged("start");
              }}
            />

            {/* Duration Shortcuts */}
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginBottom: 6,
                marginTop: 16,
              }}
            >
              Dauer
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[15, 30, 45, 60, 90, 120].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    setDurationMinutes(d);
                    setLastChanged("duration");
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: durationMinutes === d ? "#111" : "#ccc",
                    backgroundColor:
                      durationMinutes === d ? "#f3f4f6" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12 }}>
                    {d < 60 ? `${d}min` : `${d / 60}h`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* End */}
            <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Ende
            </Text>
            <DateTimeField
              date={selectedEndDate}
              startMinutes={endMinutes}
              allDay={allDay}
              onChangeDate={(d) => {
                setSelectedEndDate(d);
                setLastChanged("end");
                syncDurationFromStartAndEnd(
                  selectedStartDate,
                  startMinutes,
                  d,
                  endMinutes
                );
              }}
              onChangeTime={(m) => {
                setEndMinutes(m);
                setLastChanged("end");
                syncDurationFromStartAndEnd(
                  selectedStartDate,
                  startMinutes,
                  selectedEndDate,
                  m
                );
              }}
            />
          </>
        )}

        {/* Notizen */}
        <Text
          style={{
            fontSize: 12,
            color: "#666",
            marginBottom: 6,
            marginTop: 30,
          }}
        >
          Notizen
        </Text>
        <TextInput
          placeholder="Notizen..."
          value={note}
          onChangeText={setNote}
          multiline
          style={{
            minHeight: 120,
            padding: 12,
            borderWidth: 1,
            borderRadius: 8,
            borderColor: "#999",
            marginBottom: 20,
            textAlignVertical: "top",
          }}
        />

        {/* Delete Button */}
        <Pressable
          onPress={handleDelete}
          style={{
            padding: 16,
            backgroundColor: "#fee2e2",
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <Text
            style={{ color: "#dc2626", textAlign: "center", fontWeight: "600" }}
          >
            Eintrag löschen
          </Text>
        </Pressable>
      </ScrollView>

      {/* Save Button */}
      <View style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
        <Pressable
          onPress={handleSave}
          style={{
            padding: 18,
            backgroundColor: "#111",
            borderRadius: 10,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            Speichern
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
