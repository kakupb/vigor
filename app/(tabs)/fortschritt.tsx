// app/(tabs)/fortschritt.tsx
// Der Fortschritts-Screen — Warum der User täglich zurückkommt.
// Zeigt: Fokus-Wochenstunden, Streak-Heatmap, Habit-Streaks, Bestzeiten.

import { WeeklyReviewSheet } from "@/components/weekly/WeeklyReviewSheet";
import { getCategoryConfig } from "@/constants/categories";
import { useAppColors } from "@/hooks/useAppColors";
import { useHabits } from "@/hooks/useHabits";
import { useFocusStore } from "@/store/focusStore";
import { useUserStore } from "@/store/userStore";
import { getTodayTimestamp } from "@/utils/dateUtils";
import { getCompletionRate } from "@/utils/getStreak";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_W = Dimensions.get("window").width;

// ─── Wochen-Balken (Fokus-Minuten) ────────────────────────────────────────────
function WeekMinutesBar({
  sessions,
  dark,
}: {
  sessions: any[];
  dark: boolean;
}) {
  const today = new Date();
  const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const bars = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const daySessions = sessions.filter((s) => {
        const t = s.startedAt;
        return t >= d.getTime() && t < nextDay.getTime();
      });
      const minutes = daySessions.reduce(
        (sum, s) => sum + Math.floor(s.durationSeconds / 60),
        0
      );
      const isToday = d.toDateString() === today.toDateString();

      return {
        label: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1],
        minutes,
        isToday,
      };
    });
  }, [sessions]);

  const maxMinutes = Math.max(...bars.map((b) => b.minutes), 30);
  const maxH = 56;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingTop: 8,
      }}
    >
      {bars.map((b, i) => (
        <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <Text
            style={{
              fontSize: 9,
              color: dark ? "#475569" : "#94a3b8",
              fontWeight: "500",
            }}
          >
            {b.minutes > 0 ? `${b.minutes}m` : ""}
          </Text>
          <View
            style={{
              width: "70%",
              height: maxH,
              backgroundColor: dark ? "#1e293b" : "#f1f5f9",
              borderRadius: 6,
              justifyContent: "flex-end",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: Math.max(
                  (b.minutes / maxMinutes) * maxH,
                  b.minutes > 0 ? 4 : 0
                ),
                backgroundColor: b.isToday
                  ? "#3b8995"
                  : b.minutes >= 60
                  ? "#10b981"
                  : "#3b8995",
                opacity: b.isToday ? 1 : 0.65,
                borderRadius: 6,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 11,
              color: b.isToday ? "#3b8995" : dark ? "#475569" : "#94a3b8",
              fontWeight: b.isToday ? "700" : "500",
            }}
          >
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Heatmap (Fokus-Tage) ─────────────────────────────────────────────────────
function FocusHeatmap({ sessions, dark }: { sessions: any[]; dark: boolean }) {
  const COLS = 13;
  const ROWS = 7;
  const cellSize = Math.floor((SCREEN_W - 48) / COLS) - 2;

  const weeks = useMemo(() => {
    const sessionDays = new Set(
      sessions.map((s) => {
        const d = new Date(s.startedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    const today = getTodayTimestamp();
    const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
      const ts = today - (COLS * ROWS - 1 - i) * 86_400_000;
      return { ts, active: sessionDays.has(ts) };
    });

    const result = [];
    for (let w = 0; w < COLS; w++) {
      result.push(cells.slice(w * ROWS, w * ROWS + ROWS));
    }
    return result;
  }, [sessions]);

  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: "column", gap: 2 }}>
          {week.map((cell, di) => (
            <View
              key={di}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 3,
                backgroundColor: cell.active
                  ? "#3b8995"
                  : dark
                  ? "#1e293b"
                  : "#f1f5f9",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Habit-Streak-Reihe ───────────────────────────────────────────────────────
function HabitStreakRow({
  title,
  streak,
  rate30,
  color,
  dark,
}: {
  title: string;
  streak: number;
  rate30: number;
  color: string;
  dark: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginTop: 1,
          flexShrink: 0,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: dark ? "#e2e8f0" : "#0f172a",
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              flex: 1,
              height: 4,
              backgroundColor: dark ? "#1e293b" : "#f1f5f9",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${rate30}%`,
                height: 4,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 11,
              color: dark ? "#64748b" : "#94a3b8",
              minWidth: 32,
              textAlign: "right",
            }}
          >
            {rate30}%
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <MaterialCommunityIcons name="fire" size={13} color="#f59e0b" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: dark ? "#e2e8f0" : "#0f172a",
            }}
          >
            {streak}
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: dark ? "#475569" : "#94a3b8" }}>
          Tage
        </Text>
      </View>
    </View>
  );
}

// ─── Stat-Karte ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  bg,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
  icon: string;
}) {
  return (
    <View
      style={{ flex: 1, backgroundColor: bg, borderRadius: 14, padding: 14 }}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={color}
        style={{ marginBottom: 6 }}
      />
      <Text style={{ fontSize: 22, fontWeight: "800", color, marginBottom: 2 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color, opacity: 0.7, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
// ─── Hauptscreen ──────────────────────────────────────────────────────────────
export default function FortschrittScreen() {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { habits } = useHabits();

  const focusStats = useFocusStore((s) => s.stats);
  const sessions = useFocusStore((s) => s.sessions);
  const loadStats = useFocusStore((s) => s.loadStats);
  const prefs = useUserStore((s) => s.prefs);

  const [reviewVisible, setReviewVisible] = useState(false);

  useEffect(() => {
    loadStats();
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const isEvening = now.getHours() >= 17;
    const lastReviewKey = "last_weekly_review";

    AsyncStorage.getItem(lastReviewKey).then((last) => {
      const thisWeek = `${now.getFullYear()}-W${getWeekNumber(now)}`;
      if (isSunday && isEvening && last !== thisWeek) {
        setReviewVisible(true);
        AsyncStorage.setItem(lastReviewKey, thisWeek);
      }
    });
  }, []);

  const streak = focusStats.currentStreak;
  const totalHours = Math.floor(focusStats.totalMinutes / 60);
  const totalMins = focusStats.totalMinutes % 60;

  // Diese Woche Fokus-Minuten
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekMinutes = useMemo(
    () =>
      sessions
        .filter((s) => s.startedAt >= weekStart.getTime())
        .reduce((sum, s) => sum + Math.floor(s.durationSeconds / 60), 0),
    [sessions]
  );
  const weekHours = (weekMinutes / 60).toFixed(1);

  // Habits sortiert nach Streak
  const sortedHabits = useMemo(
    () =>
      [...habits].sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0)).slice(0, 6),
    [habits]
  );

  function makeStyles(c: ReturnType<typeof useAppColors>) {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: c.pageBg },
      header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: c.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
      },
      headerTitle: {
        fontSize: 26,
        fontWeight: "700",
        color: c.textPrimary,
        letterSpacing: -0.4,
      },
      headerSub: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
      content: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 40,
        gap: 14,
      },
      card: {
        backgroundColor: c.cardBg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: c.borderDefault,
      },
      cardTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: c.textPrimary,
        marginBottom: 12,
      },
      statRow: { flexDirection: "row", gap: 10 },
      divider: {
        height: 1,
        backgroundColor: c.borderDefault,
        marginVertical: 10,
      },
      heatmapLegend: { flexDirection: "row", alignItems: "center", gap: 6 },
      heatmapDot: { width: 10, height: 10, borderRadius: 2 },
      emptyText: {
        fontSize: 13,
        color: c.textMuted,
        textAlign: "center",
        paddingVertical: 12,
      },
      habitList: { gap: 14 },
      cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      },
    });
  }

  const styles = makeStyles(c);

  return (
    // Im JSX — Header-Bereich:
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Fortschritt</Text>
        <Text style={styles.headerSub}>Dein Wachstum auf einen Blick</Text>
      </View>
      <Pressable
        onPress={() => setReviewVisible(true)}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: c.dark ? "#2d1a00" : "#fffbeb",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
      </Pressable>

      {/* Sheet außerhalb des Headers, direkt im root View */}
      <WeeklyReviewSheet
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ── Stat-Karten ── */}
          <View style={styles.statRow}>
            <StatCard
              label="Tage Streak"
              value={streak}
              color={streak > 0 ? "#f59e0b" : "#94a3b8"}
              bg={
                streak > 0
                  ? c.dark
                    ? "#2d1a00"
                    : "#fffbeb"
                  : c.dark
                  ? "#1e293b"
                  : "#f8f9fb"
              }
              icon="flame-outline"
            />
            <StatCard
              label="Diese Woche"
              value={`${weekHours}h`}
              color="#3b8995"
              bg={c.dark ? "#0c2430" : "#f0fbfc"}
              icon="timer-outline"
            />
            <StatCard
              label="Gesamt"
              value={
                totalHours > 0
                  ? `${totalHours}h`
                  : `${focusStats.totalMinutes}m`
              }
              color="#8b5cf6"
              bg={c.dark ? "#1e1040" : "#f5f3ff"}
              icon="bar-chart-outline"
            />
          </View>

          {/* ── Tagesziel ── */}
          {prefs.dailyFocusMinutes > 0 &&
            (() => {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const todayMinutes = sessions
                .filter((s) => s.startedAt >= todayStart.getTime())
                .reduce(
                  (sum, s) => sum + Math.floor(s.durationSeconds / 60),
                  0
                );
              const pct = Math.min(
                100,
                Math.round((todayMinutes / prefs.dailyFocusMinutes) * 100)
              );
              const goalH = Math.floor(prefs.dailyFocusMinutes / 60);
              const goalM = prefs.dailyFocusMinutes % 60;
              const goalLabel =
                goalH > 0
                  ? `${goalH}h${goalM > 0 ? ` ${goalM}min` : ""}`
                  : `${goalM}min`;
              const doneH = Math.floor(todayMinutes / 60);
              const doneM = todayMinutes % 60;
              const doneLabel =
                doneH > 0 ? `${doneH}h ${doneM}min` : `${doneM}min`;
              return (
                <View style={styles.card}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={styles.cardTitle}>Tagesziel</Text>
                    <Text style={{ fontSize: 12, color: c.textMuted }}>
                      {doneLabel} von {goalLabel}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: 8,
                        backgroundColor: pct >= 100 ? "#10b981" : "#3b8995",
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: pct >= 100 ? "#10b981" : c.textMuted,
                      marginTop: 6,
                      textAlign: "right",
                    }}
                  >
                    {pct >= 100 ? "Tagesziel erreicht! 🎉" : `${pct}% erreicht`}
                  </Text>
                </View>
              );
            })()}

          {/* ── Wochenbars ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Diese Woche · Fokus-Minuten</Text>
            <WeekMinutesBar sessions={sessions} dark={c.dark} />
          </View>

          {/* ── Heatmap ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Aktivität · 13 Wochen</Text>
              <View style={styles.heatmapLegend}>
                <View
                  style={[
                    styles.heatmapDot,
                    { backgroundColor: c.dark ? "#1e293b" : "#f1f5f9" },
                  ]}
                />
                <View
                  style={[styles.heatmapDot, { backgroundColor: "#3b8995" }]}
                />
              </View>
            </View>
            <FocusHeatmap sessions={sessions} dark={c.dark} />
            {sessions.length === 0 && (
              <Text style={[styles.emptyText, { marginTop: 8 }]}>
                Starte deine erste Session um die Heatmap zu füllen
              </Text>
            )}
          </View>

          {/* ── Pomodoros ── */}
          {focusStats.pomodorosCompleted > 0 && (
            <View
              style={[
                styles.card,
                { flexDirection: "row", alignItems: "center", gap: 12 },
              ]}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: c.dark ? "#2d1a00" : "#fef3c7",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="circle-slice-8"
                  size={22}
                  color="#f59e0b"
                />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: c.textMuted }}>
                  Pomodoros abgeschlossen
                </Text>
                <Text
                  style={{ fontSize: 20, fontWeight: "700", color: "#f59e0b" }}
                >
                  {focusStats.pomodorosCompleted}
                </Text>
              </View>
              <View style={{ marginLeft: "auto" as any }}>
                <Text style={{ fontSize: 12, color: c.textMuted }}>
                  Beste Session
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: c.textPrimary,
                  }}
                >
                  {focusStats.longestSessionMinutes}m
                </Text>
              </View>
            </View>
          )}

          {/* ── Habit-Streaks ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Habit-Streaks</Text>
            {sortedHabits.length === 0 ? (
              <Text style={styles.emptyText}>
                Noch keine Habits — erstelle dein erstes
              </Text>
            ) : (
              <View style={styles.habitList}>
                {sortedHabits.map(({ habit, streak: hStreak }) => {
                  const cfg = getCategoryConfig(habit.category);
                  const rate30 = getCompletionRate(habit, 30);
                  return (
                    <HabitStreakRow
                      key={habit.id}
                      title={habit.title}
                      streak={hStreak ?? 0}
                      rate30={rate30}
                      color={cfg.color}
                      dark={c.dark}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
