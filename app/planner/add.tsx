///Users/yakupadar/code_projects/HabitTracker/app/planner/add.tsx
import { CategorySelector } from "@/components/planner/CategorySelector";
import { DateTimeField } from "@/components/planner/DateTimeField";
import { getCategoryConfig } from "@/constants/categories";
import { usePlannerStore } from "@/store/plannerStore";
import { PlannerCategory } from "@/types/planner";
import {
  dateToLocalString,
  getTodayTimestamp,
  minutesToTime,
} from "@/utils/dateUtils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function PlannerAddScreen() {
  const router = useRouter();
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
  const color = getCategoryConfig(category).color;

  const [selectedStartDate, setSelectedStartDate] = useState(initialDate);
  const [startMinutes, setStartMinutes] = useState(() => {
    if (initialStartTime) {
      const [hours, mins] = initialStartTime.split(":").map(Number);
      return hours * 60 + mins;
    }
    return getNextHalfHour();
  });

  const [selectedEndDate, setSelectedEndDate] = useState(initialDate);
  const [endMinutes, setEndMinutes] = useState(() => {
    if (initialEndTime) {
      const [hours, mins] = initialEndTime.split(":").map(Number);
      return hours * 60 + mins;
    }
    return startMinutes + 30;
  });
  const [durationMinutes, setDurationMinutes] = useState(() => {
    if (initialStartTime && initialEndTime) {
      const [startH, startM] = initialStartTime.split(":").map(Number);
      const [endH, endM] = initialEndTime.split(":").map(Number);
      return endH * 60 + endM - (startH * 60 + startM);
    }
    return 30;
  });
  type TimeSource = "start" | "duration" | "end";
  const [lastChanged, setLastChanged] = useState<TimeSource>("start");

  useEffect(() => {
    syncEndFromStartAndDuration(
      selectedStartDate,
      startMinutes,
      durationMinutes
    );
  }, []);

  function getNextHalfHour() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return Math.ceil(minutes / 30) * 30;
  }

  function handleSave() {
    if (!title.trim()) return;

    addEntry({
      title: title.trim(),
      color: color,
      date: selectedStartDate,
      startTime: allDay ? undefined : minutesToTime(startMinutes),
      durationMinute: allDay ? undefined : durationMinutes,
      note: note.trim(),
      category: category, // ✅ This is here
    });

    router.back();
  }

  // Anzeigelogik End-Zeit
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
    selectedEndDate: string,
    endMinutes: number
  ) {
    const dayDiff =
      (getTodayTimestamp(selectedEndDate) - getTodayTimestamp(startDate)) /
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

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20 }}>
        Neuer Eintrag
      </Text>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingBottom: 120,
          justifyContent: "space-between",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <>
          <TextInput
            placeholder="Titel"
            value={title}
            onChangeText={setTitle}
            style={{
              borderWidth: 1,
              borderColor: "#999",
              borderRadius: 8,
              padding: 12,
              marginBottom: 30,
            }}
          />
          <View style={{ marginBottom: 16 }}>
            <CategorySelector selected={category} onSelect={setCategory} />
          </View>
          <Pressable
            onPress={() => setAllDay((v) => !v)}
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#999",
              backgroundColor: allDay ? "#888" : "transparent",
              width: 95,
              marginBottom: 10,
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
              if (lastChanged !== "end") {
                syncEndFromStartAndDuration(d, startMinutes, durationMinutes);
              }
            }}
            onChangeTime={(m) => {
              setStartMinutes(m);
              setLastChanged("start");
              if (lastChanged !== "end") {
                syncEndFromStartAndDuration(
                  selectedStartDate,
                  m,
                  durationMinutes
                );
              }
            }}
          />

          {!allDay && (
            <>
              <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                Dauer
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                {[30, 45, 60].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => {
                      setDurationMinutes(d);
                      setLastChanged("duration");
                      syncEndFromStartAndDuration(
                        selectedStartDate,
                        startMinutes,
                        d
                      );
                    }}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: durationMinutes === d ? "#111" : "#ccc",
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{d} min</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Ende */}
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
          <TextInput
            placeholder="Notizen"
            value={note}
            onChangeText={setNote}
            multiline
            style={{
              minHeight: 140,
              padding: 12,
              borderWidth: 1,
              borderRadius: 8,
              borderColor: "#999",
              marginTop: 50,
            }}
          />
        </>
      </ScrollView>
      <Pressable
        onPress={handleSave}
        style={{
          padding: 18,
          backgroundColor: "#111",
          borderRadius: 10,
          marginBottom: 30,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>Speichern</Text>
      </Pressable>
    </View>
  );
}
