// components/progress/WeekComparisonBanner.tsx
// Zeigt: Diese Woche vs. letzte Woche — Fokusminuten + Habit-Rate.
// "Diese Woche: 5h 20min — +40 Min mehr als letzte Woche ▲"
//
// Psychologisch: Vergleich mit sich selbst ist stärker als absolute Zahlen.
// Niemanden interessiert "1.240 Minuten gesamt". Jeder versteht "+40min".

import { useFocusStore } from "@/store/focusStore";
import { wasScheduledOn } from "@/utils/scheduleUtils";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  dark: boolean;
  habits?: { habit: any; completed: boolean; streak: number }[];
};

// ─── Formatierung ─────────────────────────────────────────────────────────────
function formatMinutes(m: number): string {
  if (m === 0) return "–";
  if (m < 60) return `${m}Min`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min > 0 ? `${h}h ${min}Min` : `${h}h`;
}

function formatDelta(delta: number): {
  label: string;
  color: string;
  icon: "trending-up" | "trending-down" | "remove";
} {
  if (delta === 0)
    return {
      label: "Gleich wie letzte Woche",
      color: "#94a3b8",
      icon: "remove",
    };
  if (delta > 0)
    return {
      label: `+${formatMinutes(delta)} mehr`,
      color: "#10b981",
      icon: "trending-up",
    };
  return {
    label: `${formatMinutes(Math.abs(delta))} weniger`,
    color: "#ef4444",
    icon: "trending-down",
  };
}

// ─── Vergleichs-Spalte ────────────────────────────────────────────────────────
function Col({
  label,
  value,
  isThis,
  dark,
}: {
  label: string;
  value: string;
  isThis: boolean;
  dark: boolean;
}) {
  return (
    <View style={col.wrap}>
      <Text style={[col.label, { color: dark ? "#475569" : "#94a3b8" }]}>
        {label}
      </Text>
      <Text
        style={[
          col.value,
          {
            color: isThis
              ? dark
                ? "#f1f5f9"
                : "#0f172a"
              : dark
              ? "#334155"
              : "#cbd5e1",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const col = StyleSheet.create({
  wrap: { flex: 1, gap: 4 },
  label: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
});

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export function WeekComparisonBanner({ dark, habits = [] }: Props) {
  const sessions = useFocusStore((s) => s.sessions);

  const {
    thisWeekMin,
    lastWeekMin,
    focusDelta,
    habitThis,
    habitLast,
    habitDelta,
  } = useMemo(() => {
    // Wochen-Grenzen berechnen
    const now = new Date();
    const thisStart = new Date(now);
    thisStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Montag
    thisStart.setHours(0, 0, 0, 0);
    const thisStartTs = thisStart.getTime();

    const lastStartTs = thisStartTs - 7 * 86_400_000;
    const lastEndTs = thisStartTs;

    // Fokus-Minuten
    const sumMins = (from: number, to: number) =>
      sessions
        .filter((s) => s.startedAt >= from && s.startedAt < to)
        .reduce(
          (sum, s) =>
            sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
          0
        );

    const thisWeekMin = sumMins(thisStartTs, Date.now());
    const lastWeekMin = sumMins(lastStartTs, lastEndTs);

    // Habit-Rate dieser und letzter Woche
    // Nur wenn Habits vorhanden
    let habitThis = -1;
    let habitLast = -1;

    if (habits.length > 0) {
      const computeHabitRate = (weekStartTs: number, weekEndTs: number) => {
        let done = 0,
          total = 0;
        for (let day = 0; day < 7; day++) {
          const dayTs = weekStartTs + day * 86_400_000;
          if (dayTs >= weekEndTs) break;
          for (const { habit } of habits) {
            if (wasScheduledOn(dayTs, habit.schedule)) {
              total++;
              if (habit.completedDates.includes(dayTs)) done++;
            }
          }
        }
        return total > 0 ? Math.round((done / total) * 100) : -1;
      };
      habitThis = computeHabitRate(thisStartTs, Date.now());
      habitLast = computeHabitRate(lastStartTs, lastEndTs);
    }

    return {
      thisWeekMin,
      lastWeekMin,
      focusDelta: thisWeekMin - lastWeekMin,
      habitThis,
      habitLast,
      habitDelta:
        habitThis >= 0 && habitLast >= 0 ? habitThis - habitLast : null,
    };
  }, [sessions, habits]);

  // Kein Vergleich möglich wenn letzte Woche keine Daten
  const noLastWeekData = lastWeekMin === 0;

  const focus = formatDelta(focusDelta);

  return (
    <View style={wb.container}>
      {/* Titel */}
      <Text style={[wb.title, { color: dark ? "#64748b" : "#94a3b8" }]}>
        WOCHENVERGLEICH
      </Text>

      {/* Fokus-Vergleich */}
      <View style={wb.row}>
        <Col
          label="Diese Woche"
          value={formatMinutes(thisWeekMin)}
          isThis
          dark={dark}
        />
        <View
          style={[
            wb.divider,
            { backgroundColor: dark ? "#334155" : "#e2e8f0" },
          ]}
        />
        <Col
          label="Letzte Woche"
          value={formatMinutes(lastWeekMin)}
          isThis={false}
          dark={dark}
        />
      </View>

      {/* Delta */}
      {!noLastWeekData ? (
        <View
          style={[
            wb.deltaRow,
            {
              backgroundColor: dark ? "#0f172a" : "#f8f9fb",
              borderColor: dark ? "#1e293b" : "#f1f5f9",
            },
          ]}
        >
          <Ionicons name={focus.icon} size={14} color={focus.color} />
          <Text style={[wb.deltaText, { color: focus.color }]}>
            Fokus: {focus.label}
          </Text>
          {habitDelta !== null && (
            <Text
              style={[wb.habitDelta, { color: dark ? "#475569" : "#94a3b8" }]}
            >
              · Habits: {habitDelta > 0 ? "+" : ""}
              {habitDelta}%
            </Text>
          )}
        </View>
      ) : (
        <Text style={[wb.noData, { color: dark ? "#334155" : "#e2e8f0" }]}>
          Noch kein Vergleich verfügbar — komm nächste Woche wieder
        </Text>
      )}
    </View>
  );
}

const wb = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 0 },
  divider: { width: 1, height: 40, marginHorizontal: 16, alignSelf: "center" },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  deltaText: { fontSize: 13, fontWeight: "700" },
  habitDelta: { fontSize: 12, fontWeight: "500" },
  noData: { fontSize: 12, fontStyle: "italic" },
});
