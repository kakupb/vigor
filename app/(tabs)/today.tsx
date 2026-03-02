// app/(tabs)/today.tsx
import { HabitCard } from "@/components/habits/HabitCard";
import { PlannerEntryItem } from "@/components/today/PlannerEntryItem";
import { QuoteOfTheDay } from "@/components/today/QuoteOfTheDay";
import { TodayEmptyState } from "@/components/today/TodayEmptyState";
import { TodayStatsCard } from "@/components/today/TodayStatsCard";
import { THEME } from "@/constants/theme";
import { usePlannerDay } from "@/hooks/planner/usePlanner";
import { useHabits } from "@/hooks/useHabits";
import { dateToLocalString } from "@/utils/dateUtils";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function TodayScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    habits,
    isLoading: habitsLoading,
    actions: habitActions,
  } = useHabits();
  const today = dateToLocalString(new Date());
  const { entries, stats, actions: plannerActions } = usePlannerDay(today);

  if (habitsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const dateLabel = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ── Habits nach heute / nicht heute trennen ──────────────────────────────
  const todayHabits = habits.filter(({ habit }) =>
    isScheduledForToday(habit.schedule)
  );
  const otherHabits = habits.filter(
    ({ habit }) => !isScheduledForToday(habit.schedule)
  );

  const habitsCompletedToday = todayHabits.filter((h) => h.completed).length;
  const habitsTotalToday = todayHabits.length;

  function renderHabitCard({
    habit,
    completed,
    todayAmount,
    streak,
  }: (typeof habits)[0]) {
    return (
      <HabitCard
        key={habit.id}
        title={habit.title}
        completed={completed}
        streak={streak}
        kind={habit.kind}
        unit={habit.unit}
        dailyTarget={habit.dailyTarget}
        category={habit.category}
        todayAmount={todayAmount}
        onToggle={() => habitActions.toggleCheckIn(habit.id)}
        onDelete={() => habitActions.deleteHabit(habit.id)}
        onDetail={() => router.push(`/habit/${habit.id}`)}
        onEdit={() => router.push(`/habit/edit/${habit.id}`)}
        onIncrease={(n) => habitActions.increaseAmount(habit.id, n)}
        onSetAmount={(value) => habitActions.setAmountForToday(habit.id, value)}
        expanded={expandedId === habit.id}
        onExpand={() =>
          setExpandedId(expandedId === habit.id ? null : habit.id)
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>

        <View style={styles.scrollContent}>
          {/* ── STATS ROW ── */}
          {(habitsTotalToday > 0 || stats.total > 0) && (
            <View style={styles.statsContainer}>
              {habitsTotalToday > 0 && (
                <TodayStatsCard
                  label="Habits"
                  completed={habitsCompletedToday}
                  total={habitsTotalToday}
                  color="#4b60af"
                  backgroundColor="#f0f4ff"
                  borderColor="#c7d2fe"
                />
              )}
              {stats.total > 0 && (
                <TodayStatsCard
                  label="Geplant"
                  completed={stats.completed}
                  total={stats.total}
                  color="#3b8995"
                  backgroundColor="#f0fbfc"
                  borderColor="#a5e8ef"
                />
              )}
            </View>
          )}

          {/* ── QUOTE ── */}
          <QuoteOfTheDay />

          {/* ── HEUTE FÄLLIGE HABITS ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Habits heute</Text>
                {habitsTotalToday > 0 && (
                  <Text style={styles.sectionSubtitle}>
                    {habitsCompletedToday} von {habitsTotalToday} erledigt
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => router.push("/add")}
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>+ Habit</Text>
              </Pressable>
            </View>

            {habits.length === 0 ? (
              <TodayEmptyState
                icon="✦"
                message="Noch keine Habits"
                buttonText="Erstes Habit erstellen"
                buttonColor="#4b60af"
                onPress={() => router.push("/add")}
              />
            ) : todayHabits.length === 0 ? (
              <View style={styles.emptyToday}>
                <Text style={styles.emptyTodayText}>
                  Heute keine Habits geplant
                </Text>
              </View>
            ) : (
              <View style={styles.habitsList}>
                {todayHabits.map(renderHabitCard)}
              </View>
            )}
          </View>

          {/* ── WEITERE HABITS (nicht heute) ── */}
          {otherHabits.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, styles.sectionTitleMuted]}>
                    Weitere Habits
                  </Text>
                  <Text style={styles.sectionSubtitle}>Heute nicht fällig</Text>
                </View>
              </View>
              <View style={[styles.habitsList, styles.habitsListMuted]}>
                {otherHabits.map(renderHabitCard)}
              </View>
            </View>
          )}

          {/* ── PLANNER ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Heute geplant</Text>
                {stats.total > 0 && (
                  <Text style={styles.sectionSubtitle}>
                    {stats.completed} von {stats.total} erledigt
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/planner/add",
                    params: { date: today },
                  })
                }
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>+ Eintrag</Text>
              </Pressable>
            </View>

            {entries.timed.length === 0 && entries.anytime.length === 0 ? (
              <TodayEmptyState
                icon="◈"
                message="Noch nichts geplant"
                buttonText="Eintrag erstellen"
                buttonColor="#3b8995"
                onPress={() =>
                  router.push({
                    pathname: "/planner/add",
                    params: { date: today },
                  })
                }
              />
            ) : (
              <View style={styles.entriesList}>
                {entries.timed.map((entry) => (
                  <PlannerEntryItem
                    key={entry.id}
                    entry={entry}
                    onPress={() => plannerActions.toggleDone(entry.id)}
                    onLongPress={() => router.push(`/planner/edit/${entry.id}`)}
                  />
                ))}
                {entries.anytime.map((entry) => (
                  <PlannerEntryItem
                    key={entry.id}
                    entry={entry}
                    onPress={() => plannerActions.toggleDone(entry.id)}
                    onLongPress={() => router.push(`/planner/edit/${entry.id}`)}
                  />
                ))}
              </View>
            )}

            {(entries.timed.length > 0 || entries.anytime.length > 0) && (
              <Pressable
                onPress={() => router.push("/(tabs)/planner")}
                style={styles.plannerLink}
              >
                <Text style={styles.plannerLinkText}>Zum Planner →</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fb",
  },

  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  dateLabel: { fontSize: 15, color: "#64748b", fontWeight: "400" },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  statsContainer: { flexDirection: "row", gap: 12, marginBottom: 16 },

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  sectionTitleMuted: { color: "#94a3b8", fontSize: 16 },
  sectionSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "400",
  },

  addButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addButtonText: { fontSize: 13, fontWeight: "600", color: "#475569" },

  habitsList: { gap: THEME.spacing.md },
  habitsListMuted: { opacity: 0.5 },

  emptyToday: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyTodayText: { fontSize: 14, color: "#94a3b8" },

  entriesList: { gap: 8 },

  plannerLink: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "white",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  plannerLinkText: { fontSize: 14, fontWeight: "600", color: "#3b8995" },

  bottomSpacer: { height: 40 },
});
