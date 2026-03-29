// components/planner/MonthDayCell.tsx
import { getCategoryConfig } from "@/constants/categories";
import { THEME } from "@/constants/theme";
import { PlannerEntry } from "@/types/planner";
import { Pressable, StyleSheet, Text, View } from "react-native";

type MonthDayCellProps = {
  date: Date;
  entries: PlannerEntry[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onPress: () => void;
};

const MAX_VISIBLE_ENTRIES = 3;

/**
 * Einzelne Tag-Zelle im Monatskalender
 * Zeigt Datum und bis zu 4 Einträge an
 */
export function MonthDayCell({
  date,
  entries,
  isToday,
  isCurrentMonth,
  onPress,
}: MonthDayCellProps) {
  const dayNumber = date.getDate();

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View
        style={[
          styles.cell,
          isToday && styles.cellToday,
          isCurrentMonth && styles.cellCurrentMonth,
          !isCurrentMonth && styles.cellOtherMonth,
        ]}
      >
        {/* Datum-Header */}
        <View style={[styles.dateCircle, isToday && styles.dateCircleToday]}>
          <Text
            style={[
              styles.dateText,
              isToday && styles.dateTextToday,
              isCurrentMonth && styles.dateTextCurrentMonth,
              !isCurrentMonth && styles.dateTextOtherMonth,
            ]}
          >
            {dayNumber}
          </Text>
        </View>

        {/* Einträge */}
        <View style={styles.entriesContainer}>
          {entries.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.entryBadge,
                {
                  backgroundColor:
                    entry.color ?? getCategoryConfig(entry.category).color,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.entryText,
                  !!entry.doneAt && styles.entryTextDone,
                ]}
              >
                {entry.title}
              </Text>
            </View>
          ))}

          {/* Indikator für mehr Einträge */}
          {entries.length > MAX_VISIBLE_ENTRIES && (
            <Text style={styles.moreEntriesText}>
              +{entries.length - MAX_VISIBLE_ENTRIES}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 80, // ✅ Quadratisch! Verhindert unterschiedliche Breiten
  },
  cell: {
    flex: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: THEME.colors.gray[300],
    overflow: "hidden",
    // ✅ KEIN minHeight! Das verursacht unterschiedliche Höhen
  },
  cellToday: {
    backgroundColor: THEME.colors.gray[100],
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  cellCurrentMonth: {
    backgroundColor: THEME.colors.gray[100],
  },
  cellOtherMonth: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  // Datum-Kreis
  dateCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 2,
  },
  dateCircleToday: {
    backgroundColor: THEME.colors.primary,
  },

  // Datum-Text
  dateText: {
    fontSize: 10,
    fontWeight: "400",
  },
  dateTextToday: {
    color: "white",
    fontWeight: "700",
  },
  dateTextCurrentMonth: {
    color: THEME.colors.gray[700],
  },
  dateTextOtherMonth: {
    color: THEME.colors.gray[400],
  },

  // Einträge
  entriesContainer: {
    gap: 1,
    flex: 1, // ✅ Nimmt verfügbaren Platz
    width: "100%",
    paddingHorizontal: 2,
    overflow: "hidden",
  },
  entryBadge: {
    borderRadius: 1,
    paddingHorizontal: 2,
    paddingVertical: 1,
    minHeight: 7, // ✅ Mindesthöhe pro Entry-Badge
  },
  entryText: {
    fontSize: 8,
    color: "white",
    fontWeight: "500",
  },
  entryTextDone: {
    textDecorationLine: "line-through",
  },
  moreEntriesText: {
    fontSize: 7,
    color: THEME.colors.gray[500],
    textAlign: "center",
    marginTop: 2,
  },
});
