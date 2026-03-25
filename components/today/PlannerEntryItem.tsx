// components/today/PlannerEntryItem.tsx
import { getCategoryConfig } from "@/constants/categories";
import { useColorScheme } from "@/hooks/use-color-scheme";
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
  const dark = useColorScheme() === "dark";
  const isDone = !!entry.doneAt;
  const categoryConfig = getCategoryConfig(entry.category);
  const isAnytime = !entry.startTime;

  const timeLabel = entry.startTime
    ? `${entry.startTime}${entry.endTime ? ` – ${entry.endTime}` : ""}`
    : "Anytime";

  const d = dark; // shorthand

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        s.container,
        {
          backgroundColor: isDone
            ? d
              ? "#0d2e1e"
              : "#f0fdf8"
            : d
            ? "#1e293b"
            : "#ffffff",
          borderColor: isDone
            ? d
              ? "#166534"
              : "#bbf7d0"
            : d
            ? "#334155"
            : "#eef0f4",
        },
        pressed && s.pressed,
      ]}
    >
      {/* Category color bar */}
      <View
        style={[
          s.colorBar,
          { backgroundColor: isDone ? "#10b981" : categoryConfig.color },
        ]}
      />

      {/* Checkbox */}
      <View
        style={[
          s.checkbox,
          isDone ? s.checkboxDone : { borderColor: d ? "#475569" : "#cbd5e1" },
        ]}
      >
        {isDone && <Text style={s.checkmark}>✓</Text>}
      </View>

      {/* Content */}
      <View style={s.content}>
        <Text
          style={[
            s.title,
            { color: isDone ? "#10b981" : d ? "#f1f5f9" : "#0f172a" },
            isDone && s.titleDone,
          ]}
          numberOfLines={1}
        >
          {entry.title}
        </Text>

        <View style={s.meta}>
          {/* Time badge */}
          <View
            style={[
              s.timeBadge,
              isAnytime
                ? { backgroundColor: d ? "#451a03" : "#fef9c3" }
                : { backgroundColor: d ? "#0f172a" : "#f1f5f9" },
            ]}
          >
            <Text
              style={[
                s.timeText,
                isAnytime
                  ? { color: d ? "#fbbf24" : "#854d0e" }
                  : { color: d ? "#94a3b8" : "#475569" },
              ]}
            >
              {timeLabel}
            </Text>
          </View>

          {/* Category label */}
          {entry.category && (
            <Text style={[s.categoryText, { color: categoryConfig.color }]}>
              {categoryConfig.label}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pressed: { opacity: 0.75 },
  colorBar: { width: 4, alignSelf: "stretch" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    marginRight: 12,
  },
  checkboxDone: { borderColor: "#10b981", backgroundColor: "#10b981" },
  checkmark: { color: "white", fontSize: 12, fontWeight: "700" },
  content: { flex: 1, paddingVertical: 12, paddingRight: 14 },
  title: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  titleDone: { textDecorationLine: "line-through" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  timeText: { fontSize: 12, fontWeight: "500" },
  categoryText: { fontSize: 12, fontWeight: "500" },
});
