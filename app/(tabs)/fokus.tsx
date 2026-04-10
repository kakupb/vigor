// app/(tabs)/fokus.tsx
// FIXES:
// 1. Sound-Button: keine inline SoundPills mehr — nur Icon + Label + Chevron
// 2. Streak-Anzeige: effectiveStreak — zeigt 0 wenn lastFocusDate älter als gestern
import { FocusScreen } from "@/components/focus/FocusScreen";
import { PomodoroSettingsSheet } from "@/components/focus/PomodoroSettingsSheet";
import { ProjectPickerSheet } from "@/components/focus/ProjectPickerSheet";
import { SessionRecapSheet } from "@/components/focus/SessionRecapSheet";
import { SoundPickerSheet } from "@/components/focus/SoundPickerSheet";
import { DailyBriefing } from "@/components/today/DailyBriefing";
import { MenuSheet } from "@/components/today/MenuSheet";
import { OnboardingModal } from "@/components/today/OnboardingModal";
import { WorkoutSyncBanner } from "@/components/today/WorkoutSyncBanner";
import { usePlannerDay } from "@/hooks/planner/usePlanner";
import { useAppColors } from "@/hooks/useAppColors";
import { useCategoryConfig } from "@/hooks/useCategoryConfig";
import { useHabits } from "@/hooks/useHabits";
import { AMBIENT_SOUNDS, useFocusStore } from "@/store/focusStore";
import { useProjectStore } from "@/store/projectStore";
import { useUserStore } from "@/store/userStore";
import { dateToLocalString } from "@/utils/dateUtils";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Planner-Chip ─────────────────────────────────────────────────────────────
function PlannerChip({
  title,
  startTime,
  done,
  onPress,
  dark,
  category,
  customCategoryId,
}: {
  title: string;
  startTime?: string;
  done: boolean;
  onPress: () => void;
  dark: boolean;
  category?: any;
  customCategoryId?: string;
}) {
  const cfg = useCategoryConfig(category, customCategoryId);
  return (
    <Pressable
      onPress={onPress}
      style={[
        pc.row,
        {
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
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  const { name, hasOnboarded } = useUserStore();
  const { habits } = useHabits();
  const today = dateToLocalString(new Date());
  const { entries, actions: plannerActions } = usePlannerDay(today);

  //FOKUS
  const focusStats = useFocusStore((s) => s.stats);
  const loadStats = useFocusStore((s) => s.loadStats);
  const selectedSound = useFocusStore((s) => s.selectedSound);
  const setSound = useFocusStore((s) => s.setSound);
  const sessions = useFocusStore((s) => s.sessions);
  const [coFocusVisible, setCoFocusVisible] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  // ── Heutiger Kontext ──────────────────────────────────────────────────────
  const todayHabits = useMemo(
    () => habits.filter(({ habit }) => isScheduledForToday(habit.schedule)),
    [habits]
  );
  const habitsCompleted = todayHabits.filter((h) => h.completed).length;

  const todayMinutes = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return sessions
      .filter((s) => s.startedAt >= todayStart.getTime())
      .reduce(
        (sum, s) =>
          sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
        0
      );
  }, [sessions]);

  // Planner: max 3 für Anzeige, voll für DailyBriefing
  const plannerToday = useMemo(() => {
    return [...entries.timed, ...entries.anytime].slice(0, 3);
  }, [entries]);

  const plannerTotalCount = useMemo(
    () => entries.timed.length + entries.anytime.length,
    [entries]
  );

  // ── Streak — FIX: effectiveStreak ────────────────────────────────────────
  // currentStreak im Store wird nur beim Starten einer Session zurückgesetzt.
  // Wurde länger als gestern nicht fokussiert, ist der Streak faktisch 0.
  const streak = focusStats.currentStreak;
  const lastFocusDate = focusStats.lastFocusDate;
  const todayStr = dateToLocalString(new Date());
  const yesterdayStr = dateToLocalString(new Date(Date.now() - 86_400_000));

  const hasEverFocused = lastFocusDate !== "";
  const isStreakActive =
    lastFocusDate === todayStr || lastFocusDate === yesterdayStr;

  // Was der Nutzer wirklich sieht — 0 wenn Streak veraltet
  const effectiveStreak = isStreakActive ? streak : 0;

  const streakLabel =
    effectiveStreak === 0
      ? hasEverFocused && !isStreakActive
        ? "Streak unterbrochen — fang neu an"
        : "Starte deinen ersten Streak"
      : effectiveStreak === 1 && lastFocusDate === todayStr
      ? "Gut gemacht! Komm morgen wieder."
      : effectiveStreak === 1
      ? "Gestern angefangen — mach heute weiter!"
      : `${effectiveStreak} Tage in Folge`;

  // Streak-at-Risk: aktiver Streak, heute noch keine Session, nach 18 Uhr
  const streakAtRisk = useMemo(() => {
    return (
      effectiveStreak > 0 &&
      lastFocusDate !== todayStr &&
      new Date().getHours() >= 18
    );
  }, [effectiveStreak, lastFocusDate, todayStr]);

  // ── Greeting ─────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? "Morgen" : hour < 18 ? "Tag" : "Abend";
  const displayName = name && name !== "_onboarded" ? name : null;

  // ── Sound ────────────────────────────────────────────────────────────────
  const currentSoundConfig = AMBIENT_SOUNDS.find((s) => s.id === selectedSound);
  const soundActive = selectedSound !== "none";

  const [lastSessionId, setLastSessionId] = useState("");

  function handleStartSession() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProjectPickerVisible(true);
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
      streakBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor:
          effectiveStreak > 0
            ? c.dark
              ? "#2d1a00"
              : "#fffbeb"
            : c.dark
            ? "#1e293b"
            : "#f8f9fb",
        borderWidth: 1,
        borderColor:
          effectiveStreak > 0
            ? c.dark
              ? "#78350f"
              : "#fde68a"
            : c.borderDefault,
        borderRadius: 14,
        padding: 14,
        gap: 12,
      },
      streakIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor:
          effectiveStreak > 0
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
        fontSize: 12,
        fontWeight: "700",
        color:
          effectiveStreak > 0
            ? c.dark
              ? "#fbbf24"
              : "#d97706"
            : c.textSecondary,
      },
      streakRight: { marginLeft: "auto", alignItems: "flex-end" },
      streakTotal: { fontSize: 11, color: c.textMuted, fontWeight: "500" },
      streakTotalVal: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
      startRow: { flexDirection: "row", gap: 12, alignItems: "center" },
      startBtn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        backgroundColor: "#3b8995",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
      },
      startBtnTx: { fontSize: 16, fontWeight: "700", color: "#fff" },
      sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: c.textMuted,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      },
      emptyHint: {
        fontSize: 13,
        color: c.textMuted,
        textAlign: "center",
        paddingVertical: 12,
      },
      plannerList: { gap: 6 },
      progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
      progressTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: "hidden" as any,
      },
      progressFill: { height: 4, borderRadius: 2 },
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
                color={effectiveStreak > 0 ? "#f59e0b" : "#94a3b8"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakLabel}>Fokus-Streak</Text>
              <Text style={styles.streakValue}>{streakLabel}</Text>
            </View>
            <View style={styles.streakRight}>
              <Text style={styles.streakTotal}>Heute</Text>
              <Text style={styles.streakTotalVal}>
                {todayMinutes >= 60
                  ? `${Math.floor(todayMinutes / 60)}h ${
                      todayMinutes % 60 > 0 ? `${todayMinutes % 60}m` : ""
                    }`
                  : `${todayMinutes}min`}
              </Text>
            </View>
          </View>

          <WorkoutSyncBanner dark={c.dark} />
          {/* ── Daily Briefing ── */}
          <DailyBriefing
            todayMinutes={todayMinutes}
            habitsCompleted={habitsCompleted}
            habitsTotal={todayHabits.length}
            plannerTotal={plannerTotalCount}
            streak={effectiveStreak}
            streakAtRisk={streakAtRisk}
            dark={c.dark}
            focusGoalMinutes={90}
            onStartSession={handleStartSession}
          />

          {/* ── Sound wählen — FIX: keine inline Pills mehr ── */}
          <Pressable
            onPress={() => setSoundPickerVisible(true)}
            style={({ pressed }) => [
              soundBtn.row,
              {
                backgroundColor: soundActive
                  ? c.dark
                    ? "#0c2430"
                    : "#f0fbfc"
                  : c.dark
                  ? "#1e293b"
                  : "#f8f9fb",
                borderColor: soundActive ? "#3b8995" : c.borderDefault,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                soundBtn.iconWrap,
                {
                  backgroundColor: soundActive
                    ? "#3b8995"
                    : c.dark
                    ? "#334155"
                    : "#e2e8f0",
                },
              ]}
            >
              <Ionicons
                name={
                  (currentSoundConfig?.icon as any) ?? "volume-mute-outline"
                }
                size={18}
                color={soundActive ? "#fff" : c.textMuted}
              />
            </View>

            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text style={[soundBtn.label, { color: c.textMuted }]}>
                Ambient Sound
              </Text>
              <Text
                style={[
                  soundBtn.value,
                  { color: soundActive ? "#3b8995" : c.textPrimary },
                ]}
              >
                {currentSoundConfig?.label ?? "Kein Sound"}
              </Text>
            </View>

            {/* Chevron — kein Pill-Overflow mehr */}
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>

          {/* ── Session starten ── */}
          <View style={styles.startRow}>
            <Pressable
              onPress={handleStartSession}
              style={({ pressed }) => [
                styles.startBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.startBtnTx}>Session starten</Text>
            </Pressable>

            <Pressable
              onPress={() => setCoFocusVisible(true)}
              style={[
                startSettings.btn,
                {
                  backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                  borderColor: c.borderDefault,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons name="people-outline" size={20} color={c.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => setSettingsVisible(true)}
              style={[
                startSettings.btn,
                {
                  backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                  borderColor: c.borderDefault,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          {/* ── Heute geplant ── */}
          <View>
            <Text style={styles.sectionTitle}>Heute geplant</Text>
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
                    customCategoryId={entry.customCategoryId}
                    done={!!entry.doneAt}
                    onPress={() => plannerActions.toggleDone(entry.id)}
                    dark={c.dark}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── Habits heute ── */}
          {todayHabits.length > 0 && (
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={styles.sectionTitle}>Habits heute</Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: c.textMuted,
                    fontWeight: "600",
                  }}
                >
                  {habitsCompleted}/{todayHabits.length}
                </Text>
              </View>
              <View style={styles.progressRow}>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: c.dark ? "#1e293b" : "#e2e8f0" },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(habitRate * 100)}%` as any,
                        backgroundColor:
                          habitRate === 1
                            ? "#10b981"
                            : habitRate >= 0.5
                            ? "#4b60af"
                            : "#94a3b8",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {Math.round(habitRate * 100)}%
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Projekt-Auswahl (erscheint vor der Session) ── */}
      <ProjectPickerSheet
        visible={projectPickerVisible}
        onSelectProject={(project) => {
          setCurrentProject(project); // null = ohne Projekt
          setProjectPickerVisible(false);
          setTimeout(() => setFocusVisible(true), 150); // kurze Pause für smooth transition
        }}
        onClose={() => setProjectPickerVisible(false)}
      />

      {/* ── Modals ── */}
      <FocusScreen
        visible={focusVisible}
        entries={plannerToday}
        onExit={(durationSeconds) => {
          setFocusVisible(false);
          const sessions = useFocusStore.getState().sessions;
          const last = sessions[sessions.length - 1];
          if (last?.status === "complete") {
            setLastSessionSeconds(durationSeconds);
            setLastSessionPomodoros(last.pomodoroCount ?? 0);
            setLastSessionId(last.id); // ← NEU
            setTimeout(() => setRecapVisible(true), 400);
          }
        }}
      />
      <SoundPickerSheet
        visible={soundPickerVisible}
        onClose={() => setSoundPickerVisible(false)}
      />
      <SessionRecapSheet
        visible={recapVisible}
        durationSeconds={lastSessionSeconds}
        pomodoroCount={lastSessionPomodoros}
        sessionId={lastSessionId} // ← NEU: State in fokus.tsx anlegen
        onClose={() => setRecapVisible(false)}
      />
      <PomodoroSettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}
