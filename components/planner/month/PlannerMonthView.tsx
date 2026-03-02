// components/planner/PlannerMonthView.tsx
import { THEME } from "@/constants/theme";
import { useMonthStats } from "@/hooks/planner/usePlannerStats";
import { usePlannerStore } from "@/store/plannerStore";
import {
  getCalendarDays,
  groupIntoWeeks,
  isCurrentMonth,
  isDateInMonth,
} from "@/utils/calendarUtils";
import { dateToLocalString } from "@/utils/dateUtils";
import { sortEntriesByTime } from "@/utils/entryUtils";
import { isToday as isTodayUtil } from "@/utils/weekUtils";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MonthDayCell } from "./MonthDayCell";
import { MonthStatsCard } from "./MonthStatsCard";

type PlannerMonthViewProps = {
  onDaySelect: (date: string) => void;
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

/**
 * Monatsansicht des Planners
 * Zeigt einen Kalender mit allen Einträgen und Monats-Statistiken
 */
export default function PlannerMonthView({
  onDaySelect,
}: PlannerMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const entries = usePlannerStore((s) => s.entries);
  const loadEntries = usePlannerStore((s) => s.loadEntries);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Kalender-Tage berechnen
  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const weeks = useMemo(() => groupIntoWeeks(calendarDays), [calendarDays]);

  // Monats-Statistiken
  const stats = useMonthStats(
    entries,
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  // UI-State
  const monthLabel = currentMonth.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  const isThisMonth = isCurrentMonth(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  // Navigation
  function goToPrevMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }

  function goToNextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }

  function goToToday() {
    setCurrentMonth(new Date());
  }

  // Helper: Entries für ein Datum holen
  function getEntriesForDate(date: Date) {
    const dateString = dateToLocalString(date);
    const dayEntries = entries.filter((e) => e.date === dateString);
    return sortEntriesByTime(dayEntries);
  }

  function handleDayPress(date: Date) {
    onDaySelect(dateToLocalString(date));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </Pressable>

        <Text style={styles.monthLabel}>{monthLabel}</Text>

        <Pressable onPress={goToNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>→</Text>
        </Pressable>
      </View>

      {/* "Dieser Monat" Button */}
      {!isThisMonth && (
        <Pressable onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Dieser Monat</Text>
        </Pressable>
      )}

      {/* Wochentag-Labels */}
      <View style={styles.weekdayLabels}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayLabelCell}>
            <Text style={styles.weekdayLabelText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Kalender-Grid */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((date, dayIndex) => {
              const dayEntries = getEntriesForDate(date);
              const isTodayDay = isTodayUtil(date);
              const inCurrentMonth = isDateInMonth(
                date,
                currentMonth.getMonth()
              );

              return (
                <MonthDayCell
                  key={dayIndex}
                  date={date}
                  entries={dayEntries}
                  isToday={isTodayDay}
                  isCurrentMonth={inCurrentMonth}
                  onPress={() => handleDayPress(date)}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Monats-Statistik */}
      <MonthStatsCard
        monthLabel={monthLabel}
        total={stats.total}
        completed={stats.completed}
        pending={stats.pending}
        completionRate={stats.completionRate}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: THEME.spacing.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: THEME.spacing.xl,
  },
  navButton: {
    padding: THEME.spacing.sm,
  },
  navButtonText: {
    fontSize: THEME.fontSize.xxxl,
    color: THEME.colors.gray[600],
  },
  monthLabel: {
    fontSize: THEME.fontSize.xl,
    fontWeight: "600",
    color: THEME.colors.gray[800],
  },

  // Today Button
  todayButton: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.gray[200],
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.xl,
  },
  todayButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.gray[600],
    fontWeight: "600",
  },

  // Weekday Labels
  weekdayLabels: {
    flexDirection: "row",
    marginBottom: THEME.spacing.sm,
  },
  weekdayLabelCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: THEME.spacing.sm,
  },
  weekdayLabelText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
    color: THEME.colors.gray[500],
  },

  // Calendar Grid
  calendarGrid: {
    gap: 4,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
});
