// app/(tabs)/planen.tsx
// Habits + Planner in einem Tab.
// Der User plant hier seinen Tag und pflegt seine Habits.
// Alles was dem Fokus zuarbeitet.

import { HabitCard } from "@/components/habits/HabitCard";
import PlannerDayView from "@/components/planner/PlannerDayView";
import { TodayEmptyState } from "@/components/today/TodayEmptyState";
import { useAppColors } from "@/hooks/useAppColors";
import { useHabits } from "@/hooks/useHabits";
import { dateToLocalString } from "@/utils/dateUtils";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "habits" | "planner";

export default function PlanenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useAppColors();
  const [activeTab, setActiveTab] = useState<Tab>("habits");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    dateToLocalString(new Date())
  );

  const { habits, actions } = useHabits();

  const todayHabits = useMemo(
    () => habits.filter(({ habit }) => isScheduledForToday(habit.schedule)),
    [habits]
  );
  const otherHabits = useMemo(
    () => habits.filter(({ habit }) => !isScheduledForToday(habit.schedule)),
    [habits]
  );
  const habitsCompleted = todayHabits.filter((h) => h.completed).length;

  function makeStyles(c: ReturnType<typeof useAppColors>) {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: c.pageBg },
      header: {
        backgroundColor: c.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 12,
      },
      headerTitle: {
        fontSize: 26,
        fontWeight: "700",
        color: c.textPrimary,
        letterSpacing: -0.4,
      },
      tabRow: { flexDirection: "row", gap: 8 },
      tabBtn: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
        borderWidth: 1,
        borderColor: c.borderDefault,
      },
      tabBtnActive: { backgroundColor: "#3b8995", borderColor: "#3b8995" },
      tabText: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
      tabTextActive: { color: "#fff" },

      // Habits
      habitsContent: { padding: 20, paddingBottom: 40, gap: 14 },
      sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
      sectionTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
      sectionSub: { fontSize: 13, color: c.textMuted },
      addButton: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        backgroundColor: c.addButtonBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.borderMuted,
      },
      addButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: c.addButtonText,
      },
      habitsList: { gap: 10 },
      mutedSection: { opacity: 0.55 },
      mutedLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: c.textMuted,
        marginBottom: 8,
      },
    });
  }

  const styles = makeStyles(c);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Planen</Text>
        <View style={styles.tabRow}>
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === "habits" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("habits")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "habits" && styles.tabTextActive,
              ]}
            >
              Habits
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === "planner" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("planner")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "planner" && styles.tabTextActive,
              ]}
            >
              Planner
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Habits ── */}
      {activeTab === "habits" && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.habitsContent}>
            {/* Header */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Habits heute</Text>
                {todayHabits.length > 0 && (
                  <Text style={styles.sectionSub}>
                    {habitsCompleted} von {todayHabits.length} erledigt
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
              <View
                style={{
                  padding: 20,
                  backgroundColor: c.cardBg,
                  borderRadius: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: c.borderDefault,
                }}
              >
                <Text style={{ fontSize: 14, color: c.textMuted }}>
                  Heute keine Habits geplant
                </Text>
              </View>
            ) : (
              <View style={styles.habitsList}>
                {todayHabits.map(
                  ({ habit, completed, todayAmount, streak }) => (
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
                      customCategoryId={habit.customCategoryId}
                      onToggle={() => actions.toggleCheckIn(habit.id)}
                      onDelete={() => actions.deleteHabit(habit.id)}
                      onDetail={() => router.push(`/habit/${habit.id}`)}
                      onEdit={() => router.push(`/habit/edit/${habit.id}`)}
                      onIncrease={(n) => actions.increaseAmount(habit.id, n)}
                      onSetAmount={(v) =>
                        actions.setAmountForToday(habit.id, v)
                      }
                      expanded={expandedId === habit.id}
                      onExpand={() =>
                        setExpandedId(expandedId === habit.id ? null : habit.id)
                      }
                    />
                  )
                )}
              </View>
            )}

            {/* Weitere Habits (nicht heute) */}
            {otherHabits.length > 0 && (
              <View style={styles.mutedSection}>
                <Text style={styles.mutedLabel}>Weitere Habits</Text>
                <View style={styles.habitsList}>
                  {otherHabits.map(
                    ({ habit, completed, todayAmount, streak }) => (
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
                        customCategoryId={habit.customCategoryId}
                        onToggle={() => actions.toggleCheckIn(habit.id)}
                        onDelete={() => actions.deleteHabit(habit.id)}
                        onDetail={() => router.push(`/habit/${habit.id}`)}
                        onEdit={() => router.push(`/habit/edit/${habit.id}`)}
                        onIncrease={(n) => actions.increaseAmount(habit.id, n)}
                        onSetAmount={(v) =>
                          actions.setAmountForToday(habit.id, v)
                        }
                        expanded={expandedId === habit.id}
                        onExpand={() =>
                          setExpandedId(
                            expandedId === habit.id ? null : habit.id
                          )
                        }
                      />
                    )
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Planner ── */}
      {activeTab === "planner" && (
        <View style={{ flex: 1 }}>
          <PlannerDayView date={selectedDate} onDateChange={setSelectedDate} />
        </View>
      )}
    </View>
  );
}
