// components/planner/AnytimeStrip.tsx
import { getCategoryConfig } from "@/constants/categories";
import { PlannerEntry } from "@/types/planner";
import { Pressable, ScrollView, Text, View } from "react-native";

type AnytimeStripProps = {
  entries: PlannerEntry[];
  onPressEntry?: (entry: PlannerEntry) => void;
  onLongPressEntry?: (entry: PlannerEntry) => void;
};

export function AnytimeStrip({
  entries,
  onPressEntry,
  onLongPressEntry,
}: AnytimeStripProps) {
  // Wenn keine Entries, zeige nichts
  if (entries.length === 0) return null;

  return (
    <View style={{ marginTop: 20, marginBottom: 12 }}>
      {/* Label */}
      <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
        Anytime
      </Text>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 10 }}
      >
        {entries.map((entry) => {
          const done = !!entry.doneAt;

          return (
            <Pressable
              key={entry.id}
              onPress={() => onPressEntry?.(entry)}
              onLongPress={() => onLongPressEntry?.(entry)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 999, // Pill-Shape
                backgroundColor: done ? "#d1fae5" : "#f3f4f6",
                borderWidth: 3,
                borderColor: getCategoryConfig(entry.category).color,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: done ? "#059669" : "#111",
                  textDecorationLine: done ? "line-through" : "none",
                }}
              >
                {entry.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
