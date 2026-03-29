// components/planner/AnytimeStrip.tsx
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCategoryConfig } from "@/hooks/useCategoryConfig";
import { PlannerEntry } from "@/types/planner";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  if (entries.length === 0) return null;

  return (
    <View style={s.wrap}>
      <Text style={[s.label, dark && s.labelDark]}>Anytime</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {entries.map((entry) => {
          const done = !!entry.doneAt;
          const cfg = useCategoryConfig(entry.category, entry.customCategoryId);
          const categoryColor = cfg.color;

          return (
            <Pressable
              key={entry.id}
              onPress={() => onPressEntry?.(entry)}
              onLongPress={() => onLongPressEntry?.(entry)}
              style={[
                s.pill,
                {
                  backgroundColor: done
                    ? dark
                      ? "#064e3b"
                      : "#d1fae5"
                    : dark
                    ? "#1e293b"
                    : "#f1f5f9",
                  borderColor: categoryColor,
                },
              ]}
            >
              <Text
                style={[
                  s.pillText,
                  {
                    color: done
                      ? dark
                        ? "#6ee7b7"
                        : "#059669"
                      : dark
                      ? "#e2e8f0"
                      : "#0f172a",
                    textDecorationLine: done ? "line-through" : "none",
                  },
                ]}
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

const s = StyleSheet.create({
  wrap: { marginTop: 20, marginBottom: 12 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#0f172a",
  },
  labelDark: {
    color: "#e2e8f0",
  },
  row: { gap: 10, paddingRight: 10 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
