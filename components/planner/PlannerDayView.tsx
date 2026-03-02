import { AnytimeStrip } from "@/components/planner/AnytimeStrip";
import DayTimeline from "@/components/planner/DayTimeline";
import { usePlannerDay } from "@/hooks/planner/usePlanner";
import { dateToLocalString, formatDayLabel } from "@/utils/dateUtils";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

type PlannerDayViewProps = {
  date: string;
  onDateChange?: (date: string) => void;
};

export default function PlannerDayView({
  date,
  onDateChange,
}: PlannerDayViewProps) {
  const router = useRouter();

  const { selectedDate, entries, stats, actions, navigation } = usePlannerDay(
    date,
    onDateChange
  ); // ✅ Pass through

  const displayDate = new Date(selectedDate);
  const isToday = selectedDate === dateToLocalString(new Date());
  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        {/* Navigation zwischen Tagen */}
        <Pressable onPress={navigation.goToPrevDay} style={{ padding: 8 }}>
          <Text style={{ fontSize: 24, color: "#666" }}>←</Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "600" }}>
            {formatDayLabel(displayDate)}
          </Text>
        </View>

        <Pressable onPress={navigation.goToNextDay} style={{ padding: 8 }}>
          <Text style={{ fontSize: 24, color: "#666" }}>→</Text>
        </Pressable>
      </View>
      {!isToday && (
        <Pressable
          onPress={navigation.goToToday}
          style={{
            alignSelf: "center",
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: "#f3f4f6",
            borderRadius: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: "#666", fontWeight: "600" }}>
            zurück zu Heute
          </Text>
        </Pressable>
      )}

      <View
        style={{
          flexDirection: "row",
          alignContent: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <Text> </Text>
        {/* Stats (optional - zeigt Completion Rate) */}
        {stats.total > 0 && (
          <Text style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
            {stats.completed} / {stats.total} erledigt ({stats.completionRate}
            %)
          </Text>
        )}
        {/* Add Button */}
        <Pressable onPress={() => router.push("/planner/add")} style={{}}>
          <Text style={{ fontSize: 30, fontWeight: "300" }}>+</Text>
        </Pressable>
      </View>
      {/* Anytime Tasks */}
      <AnytimeStrip
        entries={entries.anytime}
        onPressEntry={(entry) => actions.toggleDone(entry.id)}
        onLongPressEntry={(entry) => router.push(`/planner/edit/${entry.id}`)}
      />

      {/* Timeline */}
      {entries.timed.length === 0 && entries.anytime.length === 0 && (
        <Text style={{ color: "#888", marginTop: 20 }}>
          Keine Einträge geplant
        </Text>
      )}
      <View style={{ flex: 1 }}>
        <DayTimeline
          entries={entries.timed}
          onPressEntry={(entry) => actions.toggleDone(entry.id)}
          onLongPressEntry={(entry) => router.push(`/planner/edit/${entry.id}`)}
          onLongPressBackground={(startTime, endTime) => {
            router.push({
              pathname: "/planner/add",
              params: {
                date: selectedDate,
                ...(startTime && { startTime }),
                ...(endTime && { endTime }),
              },
            });
          }}
        />
      </View>
    </View>
  );
}
