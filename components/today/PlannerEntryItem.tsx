// components/today/PlannerEntryItem.tsx
import { getCategoryConfig } from "@/constants/categories";
import { PlannerEntry } from "@/types/planner";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PlannerEntryItemProps = {
  entry: PlannerEntry;
  onPress: () => void;
  onLongPress: () => void;
};

export function PlannerEntryItem({
  entry,
  onPress,
  onLongPress,
}: PlannerEntryItemProps) {
  const isDone = !!entry.doneAt;
  const categoryConfig = getCategoryConfig(entry.category);

  const timeLabel = entry.startTime
    ? `${entry.startTime}${entry.endTime ? ` – ${entry.endTime}` : ""}`
    : "Anytime";

  const isAnytime = !entry.startTime;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        isDone && styles.containerDone,
        pressed && styles.containerPressed,
      ]}
    >
      {/* Category color bar */}
      <View
        style={[
          styles.colorBar,
          {
            backgroundColor: isDone ? "#10b981" : categoryConfig.color,
          },
        ]}
      />

      {/* Checkbox */}
      <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
        {isDone && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          numberOfLines={1}
        >
          {entry.title}
        </Text>

        <View style={styles.meta}>
          {/* Time badge */}
          <View
            style={[styles.timeBadge, isAnytime && styles.timeBadgeAnytime]}
          >
            <Text
              style={[styles.timeText, isAnytime && styles.timeTextAnytime]}
            >
              {timeLabel}
            </Text>
          </View>

          {/* Category label */}
          {entry.category && (
            <Text
              style={[styles.categoryText, { color: categoryConfig.color }]}
            >
              {categoryConfig.label}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eef0f4",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  containerDone: {
    backgroundColor: "#f0fdf8",
    borderColor: "#bbf7d0",
  },
  containerPressed: {
    opacity: 0.75,
  },

  // Left color bar
  colorBar: {
    width: 4,
    alignSelf: "stretch",
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    marginRight: 12,
  },
  checkboxDone: {
    borderColor: "#10b981",
    backgroundColor: "#10b981",
  },
  checkmark: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },

  // Content
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  titleDone: {
    color: "#10b981",
    textDecorationLine: "line-through",
  },

  // Meta row
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
  },
  timeBadgeAnytime: {
    backgroundColor: "#fef9c3",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  timeTextAnytime: {
    color: "#854d0e",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
