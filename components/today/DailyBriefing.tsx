// components/today/DailyBriefing.tsx
// Ersetzt QuoteOfTheDay — zeigt echten Tages-Kontext statt einem Zitat.
// Drei Stat-Chips: Fokus heute, Habits, Planner.
// Streak-at-Risk Banner: nur sichtbar wenn Streak gefährdet (>18 Uhr, noch keine Session).

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  todayMinutes: number;
  habitsCompleted: number;
  habitsTotal: number;
  plannerTotal: number;
  streak: number;
  streakAtRisk: boolean; // streak>0 && kein Focus heute && Stunde>=18
  dark: boolean;
  focusGoalMinutes?: number; // Standard: 90
  onStartSession: () => void;
};

// ─── Einzelner Stat-Chip ──────────────────────────────────────────────────────
function StatChip({
  icon,
  iconColor,
  value,
  label,
  dark,
  accent,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  dark: boolean;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        chip.wrap,
        {
          backgroundColor: accent
            ? dark
              ? "#0c2430"
              : "#f0fbfc"
            : dark
            ? "#1e293b"
            : "#f8f9fb",
          borderColor: accent
            ? dark
              ? "#164e63"
              : "#a5e8ef"
            : dark
            ? "#334155"
            : "#e2e8f0",
        },
      ]}
    >
      <Ionicons name={icon as any} size={14} color={iconColor} />
      <Text
        style={[
          chip.value,
          { color: accent ? "#3b8995" : dark ? "#f1f5f9" : "#0f172a" },
        ]}
      >
        {value}
      </Text>
      <Text style={[chip.label, { color: dark ? "#64748b" : "#94a3b8" }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export function DailyBriefing({
  todayMinutes,
  habitsCompleted,
  habitsTotal,
  plannerTotal,
  streak,
  streakAtRisk,
  dark,
  focusGoalMinutes = 90,
  onStartSession,
}: Props) {
  // Pulsier-Animation für den Streak-at-Risk Banner
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!streakAtRisk) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [streakAtRisk]);

  // ── Fokus-Label ──────────────────────────────────────────────────────────
  const focusLabel =
    todayMinutes === 0
      ? "—"
      : todayMinutes >= 60
      ? `${Math.floor(todayMinutes / 60)}h ${
          todayMinutes % 60 > 0 ? `${todayMinutes % 60}m` : ""
        }`
      : `${todayMinutes}m`;

  // Fokus-Fortschritt: Wie weit bis zum Tagesziel?
  const focusProgress = Math.min(todayMinutes / focusGoalMinutes, 1);
  const focusGoalReached = todayMinutes >= focusGoalMinutes;

  // ── Habit-Label ──────────────────────────────────────────────────────────
  const habitLabel =
    habitsTotal === 0
      ? "—"
      : habitsCompleted === habitsTotal
      ? `${habitsTotal}/${habitsTotal} ✓`
      : `${habitsCompleted}/${habitsTotal}`;

  // ── Planner-Label ────────────────────────────────────────────────────────
  const plannerLabel =
    plannerTotal === 0
      ? "Leer"
      : plannerTotal === 1
      ? "1 Eintrag"
      : `${plannerTotal} Einträge`;

  return (
    <View style={s.container}>
      {/* ── Drei Stat-Chips ── */}
      <View style={s.row}>
        {/* Fokus heute */}
        <StatChip
          icon={focusGoalReached ? "checkmark-circle" : "timer-outline"}
          iconColor={focusGoalReached ? "#10b981" : "#3b8995"}
          value={focusLabel}
          label="Fokus heute"
          dark={dark}
          accent={todayMinutes > 0}
        />

        {/* Habits */}
        <StatChip
          icon={
            habitsTotal > 0 && habitsCompleted === habitsTotal
              ? "checkmark-circle"
              : "flame-outline"
          }
          iconColor={
            habitsTotal > 0 && habitsCompleted === habitsTotal
              ? "#10b981"
              : "#f59e0b"
          }
          value={habitLabel}
          label="Habits"
          dark={dark}
          accent={habitsTotal > 0 && habitsCompleted === habitsTotal}
        />

        {/* Planner */}
        <StatChip
          icon="calendar-outline"
          iconColor={
            plannerTotal > 0 ? "#4b60af" : dark ? "#475569" : "#94a3b8"
          }
          value={plannerLabel}
          label="Geplant"
          dark={dark}
          accent={false}
        />
      </View>

      {/* ── Fokus-Fortschrittsbalken (nur wenn Tagesziel gesetzt und >0min) ── */}
      {todayMinutes > 0 && (
        <View
          style={[
            s.progressTrack,
            { backgroundColor: dark ? "#1e293b" : "#e2e8f0" },
          ]}
        >
          <View
            style={[
              s.progressFill,
              {
                width: `${Math.round(focusProgress * 100)}%` as any,
                backgroundColor: focusGoalReached ? "#10b981" : "#3b8995",
              },
            ]}
          />
        </View>
      )}

      {/* ── Streak-at-Risk Banner ── */}
      {streakAtRisk && (
        <Animated.View style={{ opacity: pulseAnim }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStartSession();
            }}
            style={[
              s.riskBanner,
              {
                backgroundColor: dark ? "#2d1200" : "#fff7ed",
                borderColor: dark ? "#7c2d12" : "#fed7aa",
              },
            ]}
          >
            <View style={s.riskLeft}>
              <MaterialCommunityIcons name="fire" size={16} color="#f97316" />
              <View>
                <Text
                  style={[s.riskTitle, { color: dark ? "#fed7aa" : "#9a3412" }]}
                >
                  Streak bricht heute
                </Text>
                <Text
                  style={[s.riskSub, { color: dark ? "#c2410c" : "#c2410c" }]}
                >
                  {streak} Tage — 1 Session genügt
                </Text>
              </View>
            </View>
            <View style={[s.riskBtn, { backgroundColor: "#f97316" }]}>
              <Text style={s.riskBtnTx}>Jetzt starten</Text>
              <Ionicons name="arrow-forward" size={12} color="#fff" />
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const chip = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  value: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
  },
});

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: -2,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  // ── Streak-at-Risk ──
  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  riskLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  riskTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  riskSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  riskBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  riskBtnTx: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
});
