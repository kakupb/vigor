// app/(tabs)/fokus.tsx
// Der Hauptscreen von Vigor.
// Einstieg: Streak sehen → Sound wählen → Session starten.
// Kontext: Heutige Planner-Einträge + Habit-Schnellcheck darunter.

import { FocusScreen } from "@/components/focus/FocusScreen";
import { PomodoroSettingsSheet } from "@/components/focus/PomodoroSettingsSheet";
import { SessionRecapSheet } from "@/components/focus/SessionRecapSheet";
import { SoundPickerSheet } from "@/components/focus/SoundPickerSheet";
import { MenuSheet } from "@/components/today/MenuSheet";
import { OnboardingModal } from "@/components/today/OnboardingModal";
import { QuoteOfTheDay } from "@/components/today/QuoteOfTheDay";
import { getCategoryConfig } from "@/constants/categories";
import { usePlannerDay } from "@/hooks/planner/usePlanner";
import { useAppColors } from "@/hooks/useAppColors";
import { useHabits } from "@/hooks/useHabits";
import {
  AMBIENT_SOUNDS,
  AmbientSound,
  useFocusStore,
} from "@/store/focusStore";
import { useUserStore } from "@/store/userStore";
import { dateToLocalString } from "@/utils/dateUtils";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Sound-Pill ───────────────────────────────────────────────────────────────
function SoundPill({
  id,
  label,
  icon,
  selected,
  onPress,
  dark,
}: {
  id: AmbientSound;
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  dark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        sp.pill,
        selected
          ? sp.pillActive
          : {
              backgroundColor: dark ? "#1e293b" : "#f1f5f9",
              borderColor: dark ? "#334155" : "#e2e8f0",
            },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={13}
        color={selected ? "#fff" : dark ? "#94a3b8" : "#64748b"}
      />
      <Text
        style={[
          sp.label,
          selected ? sp.labelActive : { color: dark ? "#94a3b8" : "#64748b" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const sp = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: "#3b8995",
    borderColor: "#3b8995",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  labelActive: {
    color: "#fff",
  },
});

// ─── Habit-Chip (schneller Check) ─────────────────────────────────────────────
function HabitChip({
  title,
  completed,
  category,
  onToggle,
  dark,
}: {
  title: string;
  completed: boolean;
  category?: string;
  onToggle: () => void;
  dark: boolean;
}) {
  const cfg = getCategoryConfig(category as any);
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={[
        hc.chip,
        completed
          ? {
              backgroundColor: dark ? "#0d2e1e" : "#f0fdf4",
              borderColor: dark ? "#166534" : "#86efac",
            }
          : {
              backgroundColor: dark ? "#1e293b" : "#f8f9fb",
              borderColor: dark ? "#334155" : "#e2e8f0",
            },
      ]}
    >
      <View
        style={[hc.dot, { backgroundColor: completed ? "#10b981" : cfg.color }]}
      />
      <Text
        style={[
          hc.title,
          { color: completed ? "#10b981" : dark ? "#e2e8f0" : "#0f172a" },
          completed && hc.titleDone,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {completed && (
        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
      )}
    </Pressable>
  );
}

const hc = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  title: { flex: 1, fontSize: 13, fontWeight: "500" },
  titleDone: { textDecorationLine: "line-through" },
});

// ─── Planner-Eintrag kompakt ──────────────────────────────────────────────────
function PlannerChip({
  title,
  startTime,
  category,
  done,
  onPress,
  dark,
}: {
  title: string;
  startTime?: string;
  category?: string;
  done: boolean;
  onPress: () => void;
  dark: boolean;
}) {
  const cfg = getCategoryConfig(category as any);
  return (
    <Pressable
      onPress={onPress}
      style={[
        pc.row,
        done
          ? {
              backgroundColor: dark ? "#0d2e1e" : "#f0fdf4",
              borderColor: dark ? "#166534" : "#bbf7d0",
            }
          : {
              backgroundColor: dark ? "#1e293b" : "#ffffff",
              borderColor: dark ? "#334155" : "#eef0f4",
            },
      ]}
    >
      <View
        style={[pc.bar, { backgroundColor: done ? "#10b981" : cfg.color }]}
      />
      <View style={pc.content}>
        <Text
          style={[
            pc.title,
            { color: done ? "#10b981" : dark ? "#f1f5f9" : "#0f172a" },
            done && pc.titleDone,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {startTime && (
          <Text style={[pc.time, { color: dark ? "#64748b" : "#94a3b8" }]}>
            {startTime}
          </Text>
        )}
      </View>
      {done && <Ionicons name="checkmark-circle" size={16} color="#10b981" />}
    </Pressable>
  );
}

const pc = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  bar: { width: 4, alignSelf: "stretch" },
  content: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  title: { fontSize: 13, fontWeight: "500" },
  titleDone: { textDecorationLine: "line-through" },
  time: { fontSize: 11, marginTop: 1 },
});

// Statische Styles die keine Theme-Farben brauchen
const soundBtn = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  label: { fontSize: 11, fontWeight: "500", marginBottom: 1 },
  value: { fontSize: 15, fontWeight: "600" },
});

const startSettings = StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─── Hauptscreen ──────────────────────────────────────────────────────────────
export default function FokusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useAppColors();

  const [focusVisible, setFocusVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);
  const [recapVisible, setRecapVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lastSessionSeconds, setLastSessionSeconds] = useState(0);
  const [lastSessionPomodoros, setLastSessionPomodoros] = useState(0);

  const { name, hasOnboarded } = useUserStore();
  const { habits, actions: habitActions } = useHabits();
  const today = dateToLocalString(new Date());
  const { entries, actions: plannerActions } = usePlannerDay(today);

  const focusStats = useFocusStore((s) => s.stats);
  const loadStats = useFocusStore((s) => s.loadStats);
  const selectedSound = useFocusStore((s) => s.selectedSound);
  const setSound = useFocusStore((s) => s.setSound);

  useEffect(() => {
    loadStats();
  }, []);

  // Heutiger Kontext
  const todayHabits = useMemo(
    () => habits.filter(({ habit }) => isScheduledForToday(habit.schedule)),
    [habits]
  );
  const habitsCompleted = todayHabits.filter((h) => h.completed).length;

  // Planner: max 3 Einträge, sortiert nach Zeit
  const plannerToday = useMemo(() => {
    const all = [...entries.timed, ...entries.anytime];
    return all.slice(0, 3);
  }, [entries]);

  // Greeting
  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? "Morgen" : hour < 18 ? "Tag" : "Abend";
  const displayName = name && name !== "_onboarded" ? name : null;

  // Streak-Text
  const streak = focusStats.currentStreak;
  const streakLabel =
    streak === 0
      ? "Starte deinen ersten Streak"
      : streak === 1
      ? "1 Tag in Folge"
      : `${streak} Tage in Folge`;

  // Playable sounds (ohne "none")
  const sounds = AMBIENT_SOUNDS.filter((s) => s.id !== "none");

  function handleStartSession() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFocusVisible(true);
  }

  function makeStyles(c: ReturnType<typeof useAppColors>) {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: c.pageBg },
      header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: c.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
      },
      greeting: {
        fontSize: 22,
        fontWeight: "700",
        color: c.textPrimary,
        letterSpacing: -0.3,
      },
      dateLabel: { fontSize: 13, color: c.textSecondary, marginTop: 1 },
      menuBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: c.menuBtnBg,
        justifyContent: "center",
        alignItems: "center",
      },
      scroll: { flex: 1 },
      content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
        gap: 20,
      },

      // Streak-Banner
      streakBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor:
          streak > 0
            ? c.dark
              ? "#2d1a00"
              : "#fffbeb"
            : c.dark
            ? "#1e293b"
            : "#f8f9fb",
        borderWidth: 1,
        borderColor:
          streak > 0 ? (c.dark ? "#78350f" : "#fde68a") : c.borderDefault,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      },
      streakIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor:
          streak > 0
            ? c.dark
              ? "#451a03"
              : "#fef3c7"
            : c.dark
            ? "#334155"
            : "#f1f5f9",
        justifyContent: "center",
        alignItems: "center",
      },
      streakLabel: { fontSize: 12, color: c.textMuted, fontWeight: "500" },
      streakValue: {
        fontSize: 17,
        fontWeight: "700",
        color: streak > 0 ? "#f59e0b" : c.textPrimary,
        marginTop: 1,
      },
      streakRight: { marginLeft: "auto" as any },
      streakTotal: { fontSize: 12, color: c.textMuted, textAlign: "right" },
      streakTotalVal: {
        fontSize: 15,
        fontWeight: "700",
        color: c.textSecondary,
        textAlign: "right",
      },

      // Sound
      sectionLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: c.textMuted,
        textTransform: "uppercase" as any,
        letterSpacing: 0.6,
        marginBottom: 10,
      },
      soundRow: { flexDirection: "row", flexWrap: "wrap" as any, gap: 8 },

      // Start-Button
      startBtn: {
        backgroundColor: "#3b8995",
        borderRadius: 18,
        paddingVertical: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      },
      startBtnText: {
        fontSize: 17,
        fontWeight: "700",
        color: "#fff",
        letterSpacing: 0.2,
      },

      // Kontext-Karten
      card: {
        backgroundColor: c.cardBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.borderDefault,
        padding: 14,
      },
      cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      },
      cardTitle: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
      cardLink: { fontSize: 12, color: "#3b8995", fontWeight: "600" },
      emptyHint: {
        fontSize: 13,
        color: c.textMuted,
        textAlign: "center" as any,
        paddingVertical: 8,
      },
      habitsGrid: { gap: 8 },
      plannerList: { gap: 8 },
      progressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
      },
      progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: c.dark ? "#334155" : "#f1f5f9",
        borderRadius: 2,
        overflow: "hidden" as any,
      },
      progressFill: { height: 4, backgroundColor: "#4b60af", borderRadius: 2 },
      progressLabel: {
        fontSize: 12,
        color: c.textMuted,
        minWidth: 32,
        textAlign: "right" as any,
      },
    });
  }

  const styles = makeStyles(c);
  const habitRate =
    todayHabits.length > 0 ? habitsCompleted / todayHabits.length : 0;
  const totalMinutes = focusStats.totalMinutes;
  const totalHours = Math.floor(totalMinutes / 60);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingModal visible={!hasOnboarded} />
      <MenuSheet visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {displayName
              ? `Guten ${greetingWord}, ${displayName}`
              : "Bereit zu fokussieren?"}
          </Text>
          <Text style={styles.dateLabel}>
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={styles.menuBtn}
          hitSlop={8}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color={c.textSecondary}
          />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ── Streak-Banner ── */}
          <View style={styles.streakBanner}>
            <View style={styles.streakIcon}>
              <MaterialCommunityIcons
                name="fire"
                size={22}
                color={streak > 0 ? "#f59e0b" : "#94a3b8"}
              />
            </View>
            <View>
              <Text style={styles.streakLabel}>Fokus-Streak</Text>
              <Text style={styles.streakValue}>{streakLabel}</Text>
            </View>
            <View style={styles.streakRight}>
              <Text style={styles.streakTotal}>Gesamt</Text>
              <Text style={styles.streakTotalVal}>
                {totalHours > 0 ? `${totalHours}h` : `${totalMinutes}min`}
              </Text>
            </View>
          </View>

          {/* ── Tages-Zitat ── */}
          <QuoteOfTheDay />

          {/* ── Sound wählen ── */}
          <Pressable
            onPress={() => setSoundPickerVisible(true)}
            style={({ pressed }) => [
              soundBtn.row,
              {
                backgroundColor:
                  selectedSound !== "none"
                    ? c.dark
                      ? "#0c2430"
                      : "#f0fbfc"
                    : c.dark
                    ? "#1e293b"
                    : "#f8f9fb",
                borderColor:
                  selectedSound !== "none" ? "#3b8995" : c.borderDefault,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View
              style={[
                soundBtn.iconWrap,
                {
                  backgroundColor:
                    selectedSound !== "none"
                      ? "#3b8995"
                      : c.dark
                      ? "#334155"
                      : "#e2e8f0",
                },
              ]}
            >
              <Ionicons
                name={
                  (AMBIENT_SOUNDS.find((s) => s.id === selectedSound)
                    ?.icon as any) ?? "volume-mute-outline"
                }
                size={18}
                color={selectedSound !== "none" ? "#fff" : c.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[soundBtn.label, { color: c.textMuted }]}>
                Ambient Sound
              </Text>
              <Text
                style={[
                  soundBtn.value,
                  {
                    color: selectedSound !== "none" ? "#3b8995" : c.textPrimary,
                  },
                ]}
              >
                {AMBIENT_SOUNDS.find((s) => s.id === selectedSound)?.label ??
                  "Kein Sound"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>

          {/* ── Session starten + Einstellungen ── */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={({ pressed }) => [
                styles.startBtn,
                { flex: 1 },
                pressed && { opacity: 0.88 },
              ]}
              onPress={handleStartSession}
            >
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={styles.startBtnText}>Session starten</Text>
            </Pressable>
            <Pressable
              onPress={() => setSettingsVisible(true)}
              style={({ pressed }) => [
                startSettings.btn,
                {
                  backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
                  borderColor: c.borderDefault,
                },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={c.textSecondary}
              />
            </Pressable>
          </View>

          {/* ── Habits heute ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Habits heute</Text>
              <Pressable onPress={() => router.push("/add")} hitSlop={8}>
                <Text style={styles.cardLink}>+ Habit</Text>
              </Pressable>
            </View>

            {todayHabits.length === 0 ? (
              <Text style={styles.emptyHint}>
                Noch keine Habits — erstelle dein erstes
              </Text>
            ) : (
              <>
                <View style={styles.habitsGrid}>
                  {todayHabits.slice(0, 5).map(({ habit, completed }) => (
                    <HabitChip
                      key={habit.id}
                      title={habit.title}
                      completed={completed}
                      category={habit.category}
                      onToggle={() => habitActions.toggleCheckIn(habit.id)}
                      dark={c.dark}
                    />
                  ))}
                  {todayHabits.length > 5 && (
                    <Text style={[styles.emptyHint, { marginTop: 0 }]}>
                      +{todayHabits.length - 5} weitere
                    </Text>
                  )}
                </View>
                {todayHabits.length > 0 && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(habitRate * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressLabel}>
                      {habitsCompleted}/{todayHabits.length}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ── Heute geplant ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Heute geplant</Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/planner/add",
                    params: { date: today },
                  })
                }
                hitSlop={8}
              >
                <Text style={styles.cardLink}>+ Eintrag</Text>
              </Pressable>
            </View>

            {plannerToday.length === 0 ? (
              <Text style={styles.emptyHint}>
                Nichts geplant — plane deinen Tag
              </Text>
            ) : (
              <View style={styles.plannerList}>
                {plannerToday.map((entry) => (
                  <PlannerChip
                    key={entry.id}
                    title={entry.title}
                    startTime={entry.startTime}
                    category={entry.category}
                    done={!!entry.doneAt}
                    onPress={() => plannerActions.toggleDone(entry.id)}
                    dark={c.dark}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Focus Modal ── */}
      <FocusScreen
        visible={focusVisible}
        entries={plannerToday}
        onExit={(durationSeconds: number) => {
          setFocusVisible(false);
          if (durationSeconds >= 60) {
            const sessions = useFocusStore.getState().sessions;
            const last = sessions[sessions.length - 1];
            setLastSessionSeconds(durationSeconds);
            setLastSessionPomodoros(last?.pomodoroCount ?? 0);
            setTimeout(() => setRecapVisible(true), 400);
          }
        }}
      />

      {/* ── Sound Picker ── */}
      <SoundPickerSheet
        visible={soundPickerVisible}
        onClose={() => setSoundPickerVisible(false)}
      />

      {/* ── Session Recap ── */}
      <SessionRecapSheet
        visible={recapVisible}
        durationSeconds={lastSessionSeconds}
        pomodoroCount={lastSessionPomodoros}
        onClose={() => setRecapVisible(false)}
      />

      {/* ── Pomodoro Einstellungen ── */}
      <PomodoroSettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}
