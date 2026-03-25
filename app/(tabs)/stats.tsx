// app/(tabs)/stats.tsx
// ÄNDERUNGEN gegenüber Original:
//
// 1. useMemo-Import hinzugefügt
// 2. WeekBars: bars-Berechnung in useMemo, wasScheduledOn statt nur startDate-Check
// 3. HabitHeatmap: cells + weeks in useMemo
// 4. StatsScreen: todayHabits, allCompletedDates, sortedByStreak in useMemo
//
import { HealthSection } from "@/components/stats/HealthSection";
import { StatsEmptyState } from "@/components/stats/StatsEmptyState";
import { getCategoryConfig } from "@/constants/categories";
import { useHabits } from "@/hooks/useHabits";
import { usePlannerStore } from "@/store/plannerStore";
import { dateToLocalString, getTodayTimestamp } from "@/utils/dateUtils";
import { getCompletionRate } from "@/utils/getStreak";
import { isScheduledForToday, wasScheduledOn } from "@/utils/scheduleUtils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Ring Progress ─────────────────────────────────────────────────────────────
// (unverändert)
function RingProgress({
  size = 100,
  strokeWidth = 10,
  progress,
  color,
  bgColor = "#f1f5f9",
  children,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color: string;
  bgColor?: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(progress, 1);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {children}
    </View>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function HabitHeatmap({ completedDates }: { completedDates: number[] }) {
  const COLS = 13;
  const ROWS = 7;
  const cellSize = Math.floor((SCREEN_W - 48) / COLS) - 2;

  // ✅ useMemo: nur neu berechnen wenn completedDates sich ändert
  const weeks = useMemo(() => {
    const completed = new Set(completedDates);
    const today = getTodayTimestamp();
    const cells: { ts: number; level: number }[] = [];

    for (let i = COLS * ROWS - 1; i >= 0; i--) {
      const ts = today - i * 86_400_000;
      cells.push({ ts, level: completed.has(ts) ? 1 : 0 });
    }

    const result: (typeof cells)[] = [];
    for (let w = 0; w < COLS; w++) {
      result.push(cells.slice(w * ROWS, w * ROWS + ROWS));
    }
    return result;
  }, [completedDates]);

  return (
    <View style={hm.container}>
      {weeks.map((week, wi) => (
        <View key={wi} style={hm.col}>
          {week.map((cell, di) => (
            <View
              key={di}
              style={[
                hm.cell,
                { width: cellSize, height: cellSize },
                cell.level > 0 ? hm.cellActive : hm.cellEmpty,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const hm = StyleSheet.create({
  container: { flexDirection: "row", gap: 2 },
  col: { flexDirection: "column", gap: 2 },
  cell: { borderRadius: 3 },
  cellEmpty: { backgroundColor: "#f1f5f9" },
  cellActive: { backgroundColor: "#3b8995" },
});

// ─── WeekBars ─────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function WeekBars({
  habits: allHabits,
}: {
  habits: ReturnType<typeof useHabits>["habits"];
}) {
  // ✅ useMemo: nur neu berechnen wenn habits sich ändern
  const bars = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = getTodayTimestamp();

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const ts = d.getTime();
      const dateStr = d.toISOString().split("T")[0];

      // ✅ Bug fix: wasScheduledOn statt nur startDate-Check
      // Berücksichtigt jetzt korrekt Wochentage, Intervalle, Start/Enddatum
      const scheduled = allHabits.filter(({ habit }) =>
        wasScheduledOn(ts, habit.schedule)
      );
      const done = scheduled.filter(({ habit }) =>
        habit.completedDates.includes(ts)
      );

      const rate = scheduled.length > 0 ? done.length / scheduled.length : 0;
      const isToday = ts === todayTs;

      return {
        label: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1],
        rate,
        isToday,
        done: done.length,
        total: scheduled.length,
      };
    });
  }, [allHabits]);

  const maxH = 64;

  return (
    <View style={wb.container}>
      {bars.map((b, i) => (
        <View key={i} style={wb.barGroup}>
          <Text style={wb.barValue}>
            {b.done}/{b.total}
          </Text>
          <View style={[wb.barTrack, { height: maxH }]}>
            <View
              style={[
                wb.barFill,
                {
                  height: Math.max(b.rate * maxH, b.total > 0 ? 4 : 0),
                  backgroundColor: b.isToday
                    ? "#3b8995"
                    : b.rate >= 1
                    ? "#10b981"
                    : "#94a3b8",
                  opacity: b.isToday ? 1 : 0.7,
                },
              ]}
            />
          </View>
          <Text
            style={[
              wb.barLabel,
              b.isToday && { color: "#3b8995", fontWeight: "700" },
            ]}
          >
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const wb = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 8,
  },
  barGroup: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 9, color: "#94a3b8", fontWeight: "500" },
  barTrack: {
    width: "70%",
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { borderRadius: 6, width: "100%" },
  barLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { habits } = useHabits();
  const entries = usePlannerStore((s) => s.entries);
  const loadEntries = usePlannerStore((s) => s.loadEntries);

  useEffect(() => {
    loadEntries();
  }, []);

  const today = dateToLocalString(new Date());

  // ✅ useMemo für alle abgeleiteten Werte
  const todayHabits = useMemo(
    () => habits.filter(({ habit }) => isScheduledForToday(habit.schedule)),
    [habits]
  );

  const completedToday = useMemo(
    () => todayHabits.filter((h) => h.completed).length,
    [todayHabits]
  );

  const habitRateToday =
    todayHabits.length > 0 ? completedToday / todayHabits.length : 0;

  const bestStreak = useMemo(
    () => habits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0),
    [habits]
  );

  const bestStreakHabit = useMemo(
    () => habits.find((h) => (h.streak ?? 0) === bestStreak),
    [habits, bestStreak]
  );

  const todayEntries = useMemo(
    () => entries.filter((e) => e.date === today),
    [entries, today]
  );

  const todayPlannerDone = useMemo(
    () => todayEntries.filter((e) => e.doneAt).length,
    [todayEntries]
  );

  const plannerRate =
    todayEntries.length > 0 ? todayPlannerDone / todayEntries.length : 0;

  const { weekDone, weekEntries } = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEntries = entries.filter((e) => new Date(e.date) >= weekStart);
    const weekDone = weekEntries.filter((e) => e.doneAt).length;
    return { weekDone, weekEntries };
  }, [entries]);

  const weekRate = weekEntries.length > 0 ? weekDone / weekEntries.length : 0;

  // ✅ useMemo: flatMap + sort sind O(n) — unnötig bei jedem Render
  const allCompletedDates = useMemo(
    () => habits.flatMap(({ habit }) => habit.completedDates),
    [habits]
  );

  const sortedByStreak = useMemo(
    () => [...habits].sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0)),
    [habits]
  );

  const hasAnyData = habits.length > 0 || entries.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.header, { paddingTop: insets.top + 20 }]}>
        <Text style={s.headerTitle}>Statistiken</Text>
        <Text style={s.headerSub}>Dein Fortschritt auf einen Blick</Text>
      </View>

      {!hasAnyData ? (
        <StatsEmptyState />
      ) : (
        <View style={s.content}>
          {/* ── TODAY RINGS ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Heute</Text>
            <View style={s.ringsRow}>
              <View style={s.ringItem}>
                <RingProgress
                  size={88}
                  strokeWidth={9}
                  progress={habitRateToday}
                  color="#4b60af"
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={[s.ringValue, { color: "#4b60af" }]}>
                      {Math.round(habitRateToday * 100)}%
                    </Text>
                  </View>
                </RingProgress>
                <Text style={s.ringLabel}>Habits</Text>
                <Text style={s.ringSub}>
                  {completedToday}/{todayHabits.length}
                </Text>
              </View>
              <View style={s.ringDivider} />
              <View style={s.ringItem}>
                <RingProgress
                  size={88}
                  strokeWidth={9}
                  progress={plannerRate}
                  color="#3b8995"
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={[s.ringValue, { color: "#3b8995" }]}>
                      {Math.round(plannerRate * 100)}%
                    </Text>
                  </View>
                </RingProgress>
                <Text style={s.ringLabel}>Planner</Text>
                <Text style={s.ringSub}>
                  {todayPlannerDone}/{todayEntries.length}
                </Text>
              </View>
              <View style={s.ringDivider} />
              <View style={s.ringItem}>
                <RingProgress
                  size={88}
                  strokeWidth={9}
                  progress={weekRate}
                  color="#f59e0b"
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={[s.ringValue, { color: "#f59e0b" }]}>
                      {Math.round(weekRate * 100)}%
                    </Text>
                  </View>
                </RingProgress>
                <Text style={s.ringLabel}>Woche</Text>
                <Text style={s.ringSub}>
                  {weekDone}/{weekEntries.length}
                </Text>
              </View>
            </View>
          </View>

          {/* ── STREAK HERO ── */}
          {bestStreak > 0 && (
            <View style={s.streakHero}>
              <View style={s.streakHeroLeft}>
                <Text style={s.streakHeroEmoji}>
                  <MaterialCommunityIcons
                    name="fire"
                    size={14}
                    color="#F74920"
                  />
                </Text>
                <View>
                  <Text style={s.streakHeroLabel}>Längster aktiver Streak</Text>
                  <Text style={s.streakHeroHabit} numberOfLines={1}>
                    {bestStreakHabit?.habit.title ?? ""}
                  </Text>
                </View>
              </View>
              <View style={s.streakHeroBadge}>
                <Text style={s.streakHeroValue}>{bestStreak}</Text>
                <Text style={s.streakHeroUnit}>Tage</Text>
              </View>
            </View>
          )}

          {/* ── WOCHENBARS ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Diese Woche · Habits</Text>
            <WeekBars habits={habits} />
          </View>

          {/* ── HEATMAP ── */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>Aktivität · 13 Wochen</Text>
              <View style={s.heatmapLegend}>
                <View style={[s.heatmapDot, { backgroundColor: "#f1f5f9" }]} />
                <View style={[s.heatmapDot, { backgroundColor: "#3b8995" }]} />
              </View>
            </View>
            <HabitHeatmap completedDates={allCompletedDates} />
          </View>

          {/* ── HABIT STREAKS ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Streaks</Text>
            <View style={s.streakList}>
              {sortedByStreak.map(({ habit, streak, longestStreak }) => {
                const cfg = getCategoryConfig(habit.category);
                const rate30 = getCompletionRate(habit, 30);
                return (
                  <View key={habit.id} style={s.streakRow}>
                    <View
                      style={[s.streakDot, { backgroundColor: cfg.color }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.streakHabitName} numberOfLines={1}>
                        {habit.title}
                      </Text>
                      <View style={s.streakBarTrack}>
                        <View
                          style={[
                            s.streakBarFill,
                            { width: `${rate30}%`, backgroundColor: cfg.color },
                          ]}
                        />
                      </View>
                      <Text style={s.streakRate}>{rate30}% letzte 30 Tage</Text>
                    </View>
                    <View style={s.streakNums}>
                      <View style={s.streakNumItem}>
                        <Text style={s.streakNumValue}>
                          <MaterialCommunityIcons
                            name="fire"
                            size={14}
                            color="#F74920"
                          />{" "}
                          {streak ?? 0}
                        </Text>
                        <Text style={s.streakNumLabel}>aktuell</Text>
                      </View>
                      <View style={s.streakNumItem}>
                        <Text style={[s.streakNumValue, { color: "#8b5cf6" }]}>
                          {longestStreak ?? 0}
                        </Text>
                        <Text style={s.streakNumLabel}>best</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              {habits.length === 0 && (
                <Text style={s.emptyText}>Noch keine Habits angelegt</Text>
              )}
            </View>
          </View>

          <HealthSection />

          {/* ── GESAMT ÜBERSICHT ── */}
          <View style={s.summaryGrid}>
            {[
              {
                label: "Habits gesamt",
                value: habits.length,
                color: "#4b60af",
                bg: "#f0f4ff",
              },
              {
                label: "Heute geplant",
                value: todayHabits.length,
                color: "#3b8995",
                bg: "#f0fbfc",
              },
              {
                label: "Längste Streak",
                value: bestStreak,
                color: "#f59e0b",
                bg: "#fffbeb",
              },
              {
                label: "Woche erledigt",
                value: weekDone,
                color: "#10b981",
                bg: "#f0fdf4",
              },
            ].map(({ label, value, color, bg }) => (
              <View
                key={label}
                style={[s.summaryCard, { backgroundColor: bg }]}
              >
                <Text style={[s.summaryValue, { color }]}>{value}</Text>
                <Text style={s.summaryLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles (unverändert aus Original) ────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 14, color: "#94a3b8", marginTop: 2 },
  content: { paddingHorizontal: 16, gap: 12 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  ringDivider: { width: 1, height: 60, backgroundColor: "#f1f5f9" },
  ringItem: { alignItems: "center", gap: 4 },
  ringValue: { fontSize: 16, fontWeight: "700" },
  ringLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  ringSub: { fontSize: 11, color: "#94a3b8" },

  streakHero: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  streakHeroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  streakHeroEmoji: { fontSize: 24 },
  streakHeroLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  streakHeroHabit: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  streakHeroBadge: { alignItems: "center" },
  streakHeroValue: { fontSize: 32, fontWeight: "800", color: "#f59e0b" },
  streakHeroUnit: { fontSize: 11, color: "#94a3b8" },

  heatmapLegend: { flexDirection: "row", gap: 4 },
  heatmapDot: { width: 10, height: 10, borderRadius: 2 },

  streakList: { gap: 12 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  streakDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  streakHabitName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  streakBarTrack: {
    height: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 2,
  },
  streakBarFill: { height: 4, borderRadius: 2 },
  streakRate: { fontSize: 11, color: "#94a3b8" },
  streakNums: { alignItems: "flex-end", gap: 4 },
  streakNumItem: { alignItems: "center" },
  streakNumValue: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  streakNumLabel: { fontSize: 10, color: "#94a3b8" },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  summaryCard: { width: "47%", borderRadius: 14, padding: 14 },
  summaryValue: { fontSize: 26, fontWeight: "800", marginBottom: 2 },
  summaryLabel: { fontSize: 12, color: "#64748b", fontWeight: "500" },

  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    padding: 12,
  },
});
