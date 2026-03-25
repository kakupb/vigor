// components/planner/PlannerEntryCard.tsx - NEU ✅
import { PlannerEntry } from "@/types/planner";
import { Pressable, Text, View } from "react-native";

type PlannerEntryCardProps = {
  entry: PlannerEntry;
  onPress?: () => void;
  onLongPress?: () => void;
  showTime?: boolean;
};

export function PlannerEntryCard({
  entry,
  onPress,
  onLongPress,
  showTime = true,
}: PlannerEntryCardProps) {
  const isDone = !!entry.doneAt;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: isDone ? "#d1fae5" : "#ffffff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDone ? "#86efac" : "#e5e7eb",
      }}
    >
      {/* Checkbox */}
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: isDone ? "#16a34a" : "#d1d5db",
          backgroundColor: isDone ? "#16a34a" : "transparent",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        {isDone && (
          <Text
            style={{
              color: "white",
              fontSize: 14,
              fontWeight: "bold",
            }}
          >
            ✓
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: isDone ? "#059669" : "#111",
            textDecorationLine: isDone ? "line-through" : "none",
          }}
        >
          {entry.title}
        </Text>

        {showTime && (
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginTop: 2,
            }}
          >
            {entry.startTime && entry.endTime
              ? `${entry.startTime} - ${entry.endTime}`
              : "• Anytime"}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
