// components/planner/MonthStatsCard.tsx
import { THEME } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

type MonthStatsCardProps = {
  monthLabel: string;
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
};

/**
 * Karte mit Monats-Statistiken
 * Zeigt Gesamt-, Erledigte- und Offene-Einträge mit Fortschrittsbalken
 */
export function MonthStatsCard({
  monthLabel,
  total,
  completed,
  pending,
  completionRate,
}: MonthStatsCardProps) {
  if (total === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{monthLabel} Übersicht</Text>

      <View style={styles.statsRow}>
        <StatItem label="Gesamt" value={total} color={THEME.colors.primary} />
        <StatItem
          label="Erledigt"
          value={completed}
          color={THEME.colors.success}
        />
        <StatItem label="Offen" value={pending} color={THEME.colors.warning} />
      </View>

      {/* Fortschrittsbalken */}
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBarFill, { width: `${completionRate}%` }]}
        />
      </View>

      <Text style={styles.completionText}>{completionRate}% abgeschlossen</Text>
    </View>
  );
}

type StatItemProps = {
  label: string;
  value: number;
  color: string;
};

function StatItem({ label, value, color }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: THEME.spacing.xl,
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.gray[100],
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
  },
  title: {
    fontSize: THEME.fontSize.md,
    fontWeight: "600",
    marginBottom: THEME.spacing.md,
    color: THEME.colors.gray[800],
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.gray[500],
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },

  // Progress Bar
  progressBarContainer: {
    height: 8,
    backgroundColor: THEME.colors.gray[300],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
  },

  // Completion Text
  completionText: {
    fontSize: 11,
    color: THEME.colors.gray[500],
    marginTop: 4,
    textAlign: "center",
  },
});
