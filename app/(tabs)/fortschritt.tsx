// app/(tabs)/fortschritt.tsx
// FIXES:
// 1. JSX-Struktur: container → header + WeeklyReviewSheet + ScrollView (waren alle falsch geschachtelt)
// 2. header style: flexDirection "row" + alignItems "center" — Trophy-Button sitzt neben dem Titel
// 3. FocusHeatmap: cellSize auf SCREEN_W - 64 korrigiert (war zu groß, letzte Reihe überfloss)
import { ProjectsCard } from "@/components/progress/ProjectsCard";
import { SocialScreen } from "@/components/social/SocialScreen";
import { WeeklyReviewSheet } from "@/components/weekly/WeeklyReviewSheet";
import { getCategoryConfig } from "@/constants/categories";
import { useAppColors } from "@/hooks/useAppColors";
import { useHabits } from "@/hooks/useHabits";
import { useFocusStore } from "@/store/focusStore";
import { dateToLocalString, getTodayTimestamp } from "@/utils/dateUtils";
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

      const minutes = sessions
        .filter((s) => {
          const t = s.startedAt;
          return t >= d.getTime() && t < nextDay.getTime();
        })
        .reduce((sum, s) => sum + Math.floor(s.durationSeconds / 60), 0);

      return {
        label: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1],
        minutes,
        isToday: d.toDateString() === today.toDateString(),
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
                backgroundColor: b.isToday ? "#3b8995" : "#3b8995",
                opacity: b.isToday ? 1 : 0.55,
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
// FIX: cellSize nutzt SCREEN_W - 64 (32 content-padding + 32 card-padding)
// + Gap zwischen Zellen berücksichtigt → kein Overflow mehr
function FocusHeatmap({ sessions, dark }: { sessions: any[]; dark: boolean }) {
  const COLS = 13;
  const ROWS = 7;
  const GAP = 2;
  // Verfügbare Breite: Bildschirm - 2×16 content-padding - 2×16 card-padding = -64
  const availableWidth = SCREEN_W - 64;
  const totalGap = (COLS - 1) * GAP;
  const cellSize = Math.floor((availableWidth - totalGap) / COLS);

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
    <View style={{ flexDirection: "row", gap: GAP }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: "column", gap: GAP }}>
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

// ─── Habit-Streak Zeile ───────────────────────────────────────────────────────
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
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flex: 1,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
            }}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: dark ? "#f1f5f9" : "#0f172a",
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#f59e0b" }}>
              {streak}
            </Text>
            <Text style={{ fontSize: 9, color: dark ? "#475569" : "#94a3b8" }}>
              aktuell
            </Text>
          </View>
        </View>
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: dark ? "#1e293b" : "#e2e8f0",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 4,
            width: `${rate30}%` as any,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </View>
      <Text style={{ fontSize: 10, color: dark ? "#475569" : "#94a3b8" }}>
        {rate30}% letzte 30 Tage
      </Text>
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

  const [reviewVisible, setReviewVisible] = useState(false);
  const [socialVisible, setSocialVisible] = useState(false);

  useEffect(() => {
    loadStats();
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const isEvening = now.getHours() >= 17;
    AsyncStorage.getItem("last_weekly_review").then((last) => {
      const thisWeek = `${now.getFullYear()}-W${getWeekNumber(now)}`;
      if (isSunday && isEvening && last !== thisWeek) {
        setReviewVisible(true);
        AsyncStorage.setItem("last_weekly_review", thisWeek);
      }
    });
  }, []);

  // ── Streak: effectiveStreak (gleiche Logik wie fokus.tsx) ─────────────────
  const streak = focusStats.currentStreak;
  const lastFocusDate = focusStats.lastFocusDate;
  const todayStr = dateToLocalString(new Date());
  const yesterdayStr = dateToLocalString(new Date(Date.now() - 86_400_000));
  const isStreakActive =
    lastFocusDate === todayStr || lastFocusDate === yesterdayStr;
  const effectiveStreak = isStreakActive ? streak : 0;

  const totalHours = Math.floor(focusStats.totalMinutes / 60);
  const totalMins = focusStats.totalMinutes % 60;

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

  const sortedHabits = useMemo(
    () =>
      [...habits].sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0)).slice(0, 6),
    [habits]
  );

  function makeStyles(c: ReturnType<typeof useAppColors>) {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: c.pageBg },
      // FIX: flexDirection row + alignItems center → Trophy-Button sitzt rechts neben Titel
      header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: c.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
      },
      headerText: { flex: 1 },
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
      cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      },
      emptyText: {
        fontSize: 13,
        color: c.textMuted,
        textAlign: "center",
        paddingVertical: 12,
      },
      habitList: { gap: 14 },
    });
  }

  const styles = makeStyles(c);

  // Heute-Fortschritt — todayMinutes MUSS vor pct stehen
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMinutes = useMemo(
    () =>
      sessions
        .filter((s) => s.startedAt >= todayStart.getTime())
        .reduce(
          (sum, s) =>
            sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
          0
        ),
    [sessions]
  );

  const dailyGoalMinutes = 90;
  // Guard: 0 wenn keine Sessions — verhindert NaN / voller Balken bei 0 Minuten
  const pct =
    todayMinutes > 0
      ? Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100)
      : 0;

  return (
    // FIX: Korrekter Root-Container — header, modal und scrollview sind Geschwister
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header (FIX: flexDirection row) ── */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Fortschritt</Text>
          <Text style={styles.headerSub}>Dein Wachstum auf einen Blick</Text>
        </View>

        <Pressable
          onPress={() => setSocialVisible(true)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 8,
          }}
          hitSlop={8}
        >
          <Ionicons name="people-outline" size={20} color="#3b8995" />
        </Pressable>

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
          hitSlop={8}
        >
          <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
        </Pressable>
      </View>

      {/* FIX: WeeklyReviewSheet direkt unter Header, NICHT im Header verschachtelt */}
      <WeeklyReviewSheet
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
      />
      <SocialScreen
        visible={socialVisible}
        onClose={() => setSocialVisible(false)}
      />

      {/* ── Content ── */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ── Projekte ── */}
          <View style={styles.card}>
            <ProjectsCard dark={c.dark} />
          </View>
          {/* ── Stat-Karten ── */}
          <View style={styles.statRow}>
            <StatCard
              label="Tage Streak"
              value={effectiveStreak}
              color={effectiveStreak > 0 ? "#f59e0b" : "#94a3b8"}
              bg={
                effectiveStreak > 0
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
              color="#4b60af"
              bg={c.dark ? "#0f1433" : "#f0f4ff"}
              icon="trending-up-outline"
            />
          </View>

          {/* ── Heute-Fortschritt ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Heute</Text>
              <Text
                style={{
                  fontSize: 13,
                  color: pct >= 100 ? "#10b981" : c.textMuted,
                  fontWeight: "600",
                }}
              >
                {todayMinutes}m / {dailyGoalMinutes}m
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
                  width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` as any,
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

          {/* ── Wochenbars ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Diese Woche · Fokus-Minuten</Text>
            <WeekMinutesBar sessions={sessions} dark={c.dark} />
          </View>

          {/* ── Heatmap (FIX: cellSize korrigiert) ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Aktivität · 13 Wochen</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
                  }}
                />
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: "#3b8995",
                  }}
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
