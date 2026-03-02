// components/planner/PlannerWeekView.tsx
import { usePlannerStore } from "@/store/plannerStore";
import { dateToLocalString } from "@/utils/dateUtils";
import { sortEntriesByTime } from "@/utils/entryUtils";
import {
  formatWeekLabel,
  getNextWeek,
  getPrevWeek,
  getWeekDays,
  isThisWeek,
  isToday,
} from "@/utils/weekUtils";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type PlannerWeekViewProps = {
  onDaySelect: (date: string) => void;
  onContentTouch?: () => void;
};

export default function PlannerWeekView({
  onDaySelect,
  onContentTouch,
}: PlannerWeekViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  const entries = usePlannerStore((s) => s.entries);
  const loadEntries = usePlannerStore((s) => s.loadEntries);

  useEffect(() => {
    loadEntries();
  }, []);

  const weekDays = useMemo(() => getWeekDays(selectedWeek), [selectedWeek]);
  const weekLabel = formatWeekLabel(selectedWeek);
  const isCurrentWeek = isThisWeek(selectedWeek);

  function getEntriesForDate(date: Date) {
    const dateString = dateToLocalString(date);
    return entries.filter((e) => e.date === dateString);
  }

  function handleDayPress(date: Date) {
    const dateString = dateToLocalString(date);
    onDaySelect(dateString);
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Pressable
          onPress={() => setSelectedWeek(getPrevWeek(selectedWeek))}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 24, color: "#666" }}>←</Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>{weekLabel}</Text>
        </View>

        <Pressable
          onPress={() => setSelectedWeek(getNextWeek(selectedWeek))}
          style={{ padding: 8 }}
        >
          <Text style={{ fontSize: 24, color: "#666" }}>→</Text>
        </Pressable>
      </View>

      {!isCurrentWeek && (
        <Pressable
          onPress={() => setSelectedWeek(new Date())}
          style={{
            alignSelf: "center",
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: "#f3f4f6",
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 12, color: "#666", fontWeight: "600" }}>
            Diese Woche
          </Text>
        </Pressable>
      )}

      {/* ✅ Neue Wochenübersicht */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        onStartShouldSetResponderCapture={() => {
          onContentTouch?.();
          return false;
        }}
      >
        <View style={{ gap: 8 }}>
          {weekDays.map((day, index) => {
            const dayEntries = getEntriesForDate(day);
            const isTodayDay = isToday(day);
            const dayName = day.toLocaleDateString("de-DE", {
              weekday: "short",
            });
            const dayNumber = day.getDate();
            const monthName = day.toLocaleDateString("de-DE", {
              month: "short",
            });

            // Sortiere: Timed zuerst (nach Zeit), dann Anytime
            const sortedEntries = sortEntriesByTime(dayEntries);

            return (
              <Pressable
                key={index}
                onPress={() => handleDayPress(day)}
                style={{
                  backgroundColor: isTodayDay ? "#e0f2f7" : "#f9fafb",
                  borderRadius: 12,
                  borderWidth: isTodayDay ? 2 : 1,
                  borderColor: isTodayDay ? "#3b8995" : "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                {/* ✅ Header mit Tag & Datum */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    backgroundColor: isTodayDay ? "#3b8995" : "#f3f4f6",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: isTodayDay ? "white" : "#111",
                      }}
                    >
                      {dayNumber}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isTodayDay ? "rgba(255,255,255,0.9)" : "#6b7280",
                      }}
                    >
                      {dayName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: isTodayDay ? "rgba(255,255,255,0.7)" : "#9ca3af",
                      }}
                    >
                      {monthName}
                    </Text>
                  </View>

                  {dayEntries.length > 0 && (
                    <View
                      style={{
                        backgroundColor: isTodayDay
                          ? "rgba(255,255,255,0.2)"
                          : "#e5e7eb",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: isTodayDay ? "white" : "#6b7280",
                        }}
                      >
                        {dayEntries.length}
                      </Text>
                    </View>
                  )}
                </View>

                {/* ✅ Einträge anzeigen */}
                {dayEntries.length > 0 ? (
                  <View style={{ padding: 12, gap: 6 }}>
                    {sortedEntries.slice(0, 5).map((entry) => {
                      const bgColor = entry.color || "#3b8995";

                      return (
                        <View
                          key={entry.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            opacity: entry.doneAt ? 0.5 : 1,
                          }}
                        >
                          {/* ✅ Farbindikator */}
                          <View
                            style={{
                              width: 4,
                              height: 24,
                              backgroundColor: bgColor,
                              borderRadius: 2,
                            }}
                          />

                          {/* ✅ Zeit (falls vorhanden) */}
                          {entry.startTime && (
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: "#6b7280",
                                width: 40,
                              }}
                            >
                              {entry.startTime}
                            </Text>
                          )}

                          {/* ✅ Titel */}
                          <Text
                            numberOfLines={1}
                            style={{
                              flex: 1,
                              fontSize: 13,
                              color: "#111",
                              textDecorationLine: entry.doneAt
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {entry.title}
                          </Text>

                          {/* ✅ Done-Indikator */}
                          {entry.doneAt && (
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                backgroundColor: "#10b981",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ color: "white", fontSize: 10 }}>
                                ✓
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {/* ✅ Mehr Einträge */}
                    {dayEntries.length > 5 && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          textAlign: "center",
                          marginTop: 4,
                        }}
                      >
                        +{dayEntries.length - 5} weitere
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={{ padding: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 13, color: "#d1d5db" }}>
                      Keine Einträge
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
