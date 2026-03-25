// app/(tabs)/stats.tsx
import { HealthSection } from "@/components/stats/HealthSection";
import { getCategoryConfig } from "@/constants/categories";
import { useHabits } from "@/hooks/useHabits";
import { usePlannerStore } from "@/store/plannerStore";
import { dateToLocalString, getTodayTimestamp } from "@/utils/dateUtils";
import { getCompletionRate } from "@/utils/getStreak";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Ring Progress ────────────────────────────────────────────────────────────
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
  progress: number; // 0-1
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

// ─── Heatmap (letzten 63 Tage = 9 Wochen) ────────────────────────────────────
function HabitHeatmap({ completedDates }: { completedDates: number[] }) {
  const completed = new Set(completedDates);
  const today = getTodayTimestamp();
  const COLS = 13; // Wochen
  const ROWS = 7; // Tage

  const cells: { ts: number; level: number }[] = [];
  for (let i = COLS * ROWS - 1; i >= 0; i--) {
    const ts = today - i * 86_400_000;
    const isCompleted = completed.has(ts);
    cells.push({ ts, level: isCompleted ? 1 : 0 });
  }

  const cellSize = Math.floor((SCREEN_W - 48) / COLS) - 2;

  // Group by week columns
  const weeks: (typeof cells)[] = [];
  for (let w = 0; w < COLS; w++) {
    weeks.push(cells.slice(w * ROWS, w * ROWS + ROWS));
  }

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

// ─── Bar Chart (Woche) ────────────────────────────────────────────────────────
function WeekBars({
  habits: allHabits,
}: {
  habits: ReturnType<typeof useHabits>["habits"];
}) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const bars = days.map((d) => {
    const ts = d.getTime();
    const scheduled = allHabits.filter(({ habit }) => {
      // very rough: just check if habit exists on that day
      const start = habit.schedule?.startDate;
      if (start && start > d.toISOString().split("T")[0]) return false;
      return true;
    });
    const done = scheduled.filter(({ habit }) =>
      habit.completedDates.includes(ts)
    );
    const rate = scheduled.length > 0 ? done.length / scheduled.length : 0;
    const isToday = ts === getTodayTimestamp();
    return {
      label: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1],
      rate,
      isToday,
      done: done.length,
      total: scheduled.length,
    };
  });

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

  // Today
  const todayHabits = habits.filter(({ habit }) =>
    isScheduledForToday(habit.schedule)
  );
  const completedToday = todayHabits.filter((h) => h.completed).length;
  const habitRateToday =
    todayHabits.length > 0 ? completedToday / todayHabits.length : 0;

  // Best streak overall
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
  const bestStreakHabit = habits.find((h) => (h.streak ?? 0) === bestStreak);

  // Planner today
  const today = dateToLocalString(new Date());
  const todayEntries = entries.filter((e) => e.date === today);
  const todayPlannerDone = todayEntries.filter((e) => e.doneAt).length;
  const plannerRate =
    todayEntries.length > 0 ? todayPlannerDone / todayEntries.length : 0;

  // Weekly planner
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEntries = entries.filter((e) => new Date(e.date) >= weekStart);
  const weekDone = weekEntries.filter((e) => e.doneAt).length;
  const weekRate = weekEntries.length > 0 ? weekDone / weekEntries.length : 0;

  // All completedDates combined for heatmap
  const allCompletedDates = habits.flatMap(({ habit }) => habit.completedDates);

  // Sort habits by streak descending
  const sortedByStreak = [...habits].sort(
    (a, b) => (b.streak ?? 0) - (a.streak ?? 0)
  );

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 20 }]}>
        <Text style={s.headerTitle}>Statistiken</Text>
        <Text style={s.headerSub}>Dein Fortschritt auf einen Blick</Text>
      </View>

      <View style={s.content}>
        {/* ── TODAY RINGS ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Heute</Text>
          <View style={s.ringsRow}>
            {/* Habits Ring */}
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

            {/* Divider */}
            <View style={s.ringDivider} />

            {/* Planner Ring */}
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

            {/* Divider */}
            <View style={s.ringDivider} />

            {/* Woche Ring */}
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
                <MaterialCommunityIcons name="fire" size={14} color="#F74920" />
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
                  <View style={[s.streakDot, { backgroundColor: cfg.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.streakHabitName} numberOfLines={1}>
                      {habit.title}
                    </Text>
                    <View style={s.streakBarTrack}>
                      <View
                        style={[
                          s.streakBarFill,
                          {
                            width: `${rate30}%`,
                            backgroundColor: cfg.color,
                          },
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
              value: (
                <>
                  <Text>{bestStreak}</Text>
                  <MaterialCommunityIcons
                    name="fire"
                    size={24}
                    color="#F74920"
                  />
                </>
              ),
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
            <View key={label} style={[s.summaryCard, { backgroundColor: bg }]}>
              <Text style={[s.summaryValue, { color }]}>{value}</Text>
              <Text style={s.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSub: { fontSize: 14, color: "#94a3b8" },

  content: { padding: 16, gap: 14 },

  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  // Rings
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  ringItem: { alignItems: "center", gap: 6 },
  ringValue: { fontSize: 16, fontWeight: "800" },
  ringLabel: { fontSize: 13, fontWeight: "600", color: "#334155" },
  ringSub: { fontSize: 11, color: "#94a3b8" },
  ringDivider: { width: 1, height: 70, backgroundColor: "#f1f5f9" },

  // Streak Hero
  streakHero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  streakHeroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  streakHeroEmoji: { fontSize: 32 },
  streakHeroLabel: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  streakHeroHabit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#78350f",
    marginTop: 2,
    maxWidth: 180,
  },
  streakHeroBadge: { alignItems: "center" },
  streakHeroValue: {
    fontSize: 40,
    fontWeight: "800",
    color: "#f59e0b",
    lineHeight: 44,
  },
  streakHeroUnit: { fontSize: 12, color: "#92400e", fontWeight: "600" },

  // Heatmap legend
  heatmapLegend: { flexDirection: "row", gap: 4 },
  heatmapDot: { width: 12, height: 12, borderRadius: 3 },

  // Streak list
  streakList: { gap: 14 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  streakDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  streakHabitName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 6,
  },
  streakBarTrack: {
    height: 5,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  streakBarFill: { height: "100%", borderRadius: 3 },
  streakRate: { fontSize: 11, color: "#94a3b8" },
  streakNums: { flexDirection: "row", gap: 12 },
  streakNumItem: { alignItems: "center" },
  streakNumValue: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  streakNumLabel: { fontSize: 10, color: "#94a3b8" },

  // Summary grid
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    width: (SCREEN_W - 32 - 10) / 2 - 5,
    borderRadius: 16,
    padding: 16,
  },
  summaryValue: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: "#64748b", fontWeight: "500" },

  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    paddingVertical: 16,
  },
});
