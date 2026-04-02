// components/weekly/WeeklyReviewSheet.tsx
import { useAppColors } from "@/hooks/useAppColors";
import { useHabits } from "@/hooks/useHabits";
import { useSleepAnalysis } from "@/hooks/useSleepData";
import { computeWeeklyStats } from "@/services/weeklyReviewService";
import { useFocusStore } from "@/store/focusStore";
import { useUserStore } from "@/store/userStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function WeeklyReviewSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { name } = useUserStore();
  const { habits } = useHabits();
  const sessions = useFocusStore((s) => s.sessions);
  const focusStats = useFocusStore((s) => s.stats);
  const { avgSleepScore } = useSleepAnalysis(7);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const stats = computeWeeklyStats({ sessions, habits, avgSleepScore });
  const displayName = name && name !== "_onboarded" ? name : null;

  const focusHours = Math.floor(stats.focusMinutes / 60);
  const focusMins = stats.focusMinutes % 60;
  const focusLabel =
    focusHours > 0
      ? `${focusHours}h ${focusMins > 0 ? `${focusMins}m` : ""}`
      : `${focusMins}m`;

  const bestH = Math.floor(stats.bestSessionMinutes / 60);
  const bestM = stats.bestSessionMinutes % 60;
  const bestLabel =
    bestH > 0 ? `${bestH}h ${bestM > 0 ? `${bestM}m` : ""}` : `${bestM}m`;

  // Motivierender Satz basierend auf Habit-Rate
  function getMotivation(): string {
    if (stats.habitRate >= 0.9)
      return "Außergewöhnliche Woche. Du bist in deinem Element.";
    if (stats.habitRate >= 0.7) return "Solide Woche. Momentum aufgebaut.";
    if (stats.habitRate >= 0.5)
      return "Guter Anfang. Nächste Woche noch einen drauf.";
    if (stats.focusMinutes > 0)
      return "Du warst fokussiert. Habits nächste Woche priorisieren.";
    return "Jede Woche ist ein Neuanfang. Diese hier gehört dir.";
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          s.sheet,
          { backgroundColor: c.cardBg, paddingBottom: insets.bottom + 24 },
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        {/* Handle */}
        <View style={[s.handle, { backgroundColor: c.borderDefault }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.trophyWrap}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={28}
                color="#f59e0b"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: c.textPrimary }]}>
                {displayName ? `${displayName}'s Woche` : "Deine Woche"}
              </Text>
              <Text style={[s.subtitle, { color: c.textMuted }]}>
                {stats.weekLabel}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          {/* Motivations-Satz */}
          <View
            style={[
              s.motivBox,
              {
                backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                borderColor: c.borderDefault,
              },
            ]}
          >
            <Text style={[s.motivText, { color: c.textPrimary }]}>
              {getMotivation()}
            </Text>
          </View>

          {/* Fokus-Stats */}
          <View style={s.sectionLabel}>
            <Text style={[s.sectionTitle, { color: c.textMuted }]}>FOKUS</Text>
          </View>

          <View style={s.kachelRow}>
            <StatKachel
              icon="timer-outline"
              value={stats.focusMinutes > 0 ? focusLabel : "–"}
              label="Fokuszeit"
              color="#3b8995"
              bg={c.dark ? "#0c2430" : "#f0fbfc"}
            />
            <StatKachel
              icon="flash-outline"
              value={stats.focusSessions > 0 ? `${stats.focusSessions}` : "–"}
              label="Sessions"
              color="#4b60af"
              bg={c.dark ? "#0f1433" : "#f0f4ff"}
            />
            <StatKachel
              icon="trending-up-outline"
              value={stats.bestSessionMinutes > 0 ? bestLabel : "–"}
              label="Beste Session"
              color="#8b5cf6"
              bg={c.dark ? "#1e1040" : "#f5f3ff"}
            />
          </View>

          {/* Habit-Stats */}
          <View style={s.sectionLabel}>
            <Text style={[s.sectionTitle, { color: c.textMuted }]}>HABITS</Text>
          </View>

          <View
            style={[
              s.habitBox,
              {
                backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                borderColor: c.borderDefault,
              },
            ]}
          >
            {/* Progress Bar */}
            <View style={s.habitBarRow}>
              <Text style={[s.habitBarLabel, { color: c.textSecondary }]}>
                {stats.habitsCompleted} von {stats.habitsTotal} erledigt
              </Text>
              <Text style={[s.habitPercent, { color: "#4b60af" }]}>
                {Math.round(stats.habitRate * 100)}%
              </Text>
            </View>
            <View
              style={[
                s.barTrack,
                { backgroundColor: c.dark ? "#334155" : "#e2e8f0" },
              ]}
            >
              <View
                style={[
                  s.barFill,
                  {
                    width: `${Math.round(stats.habitRate * 100)}%`,
                    backgroundColor:
                      stats.habitRate >= 0.8
                        ? "#10b981"
                        : stats.habitRate >= 0.5
                        ? "#f59e0b"
                        : "#ef4444",
                  },
                ]}
              />
            </View>

            {/* Top Habit */}
            {stats.topHabit && stats.topHabit.streak > 1 && (
              <View style={s.topHabitRow}>
                <MaterialCommunityIcons name="fire" size={16} color="#f59e0b" />
                <Text style={[s.topHabitText, { color: c.textSecondary }]}>
                  Längster Streak:{" "}
                  <Text style={{ fontWeight: "700", color: c.textPrimary }}>
                    {stats.topHabit.title}
                  </Text>
                  {" · "}
                  {stats.topHabit.streak} Tage
                </Text>
              </View>
            )}
          </View>

          {/* Schlaf — nur wenn Daten vorhanden */}
          {stats.avgSleepScore !== null && stats.avgSleepScore > 0 && (
            <>
              <View style={s.sectionLabel}>
                <Text style={[s.sectionTitle, { color: c.textMuted }]}>
                  SCHLAF
                </Text>
              </View>
              <StatKachel
                icon="moon-outline"
                value={`Ø ${stats.avgSleepScore}`}
                label="Sleep Score"
                color={
                  stats.avgSleepScore >= 75
                    ? "#10b981"
                    : stats.avgSleepScore >= 55
                    ? "#f59e0b"
                    : "#ef4444"
                }
                bg={c.dark ? "#0d2e1e" : "#f0fdf4"}
              />
            </>
          )}

          {/* Fokus-Streak */}
          <View
            style={[
              s.streakBanner,
              {
                backgroundColor: c.dark ? "#2d1a00" : "#fffbeb",
                borderColor: c.dark ? "#78350f" : "#fde68a",
              },
            ]}
          >
            <MaterialCommunityIcons name="fire" size={22} color="#f59e0b" />
            <Text
              style={[s.streakText, { color: c.dark ? "#fcd34d" : "#92400e" }]}
            >
              {focusStats.currentStreak > 0
                ? `${focusStats.currentStreak} Tage Fokus-Streak — halte ihn aufrecht!`
                : "Starte nächste Woche deinen Streak."}
            </Text>
          </View>

          {/* Schließen-Button */}
          <Pressable
            onPress={onClose}
            style={[s.closeBtn, { borderColor: c.borderDefault }]}
          >
            <Text style={[s.closeBtnText, { color: c.textPrimary }]}>
              Weiter geht's 💪
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Stat-Kachel ────────────────────────────────────────────────────────────────
function StatKachel({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[k.kachel, { backgroundColor: bg }]}>
      <Ionicons
        name={icon as any}
        size={18}
        color={color}
        style={{ marginBottom: 6 }}
      />
      <Text style={[k.value, { color }]}>{value}</Text>
      <Text style={[k.label, { color }]}>{label}</Text>
    </View>
  );
}

const k = StyleSheet.create({
  kachel: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 2,
  },
  value: { fontSize: 20, fontWeight: "800" },
  label: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.75,
    textAlign: "center",
  },
});

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  content: { padding: 20, gap: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  trophyWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fffbeb",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 1 },
  motivBox: { borderRadius: 14, padding: 16, borderWidth: 1 },
  motivText: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  sectionLabel: { marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  kachelRow: { flexDirection: "row", gap: 10 },
  habitBox: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  habitBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  habitBarLabel: { fontSize: 13, fontWeight: "500" },
  habitPercent: { fontSize: 15, fontWeight: "800" },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  topHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  topHabitText: { fontSize: 13, flex: 1 },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  streakText: { fontSize: 13, fontWeight: "600", flex: 1 },
  closeBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 4,
  },
  closeBtnText: { fontSize: 15, fontWeight: "700" },
});
