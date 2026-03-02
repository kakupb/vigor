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
  if (entries.length === 0) return null;

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
        Anytime
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 10 }}
      >
        {entries.map((e) => {
          const done = !!e.doneAt;
          return (
            <Pressable
              key={e.id}
              onPress={() => onLongPressEntry?.(e)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: done ? "#d1fae5" : "#f3f4f6",
                borderWidth: 1,
                borderColor: done ? "#86efac" : "#e5e7eb",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  textDecorationLine: done ? "line-through" : "none",
                }}
              >
                {e.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
