// components/stats/HealthSection.tsx
import {
  useHealthAuth,
  useHealthValues,
  WorkoutData,
} from "@/hooks/useHealthData";
import {
  ALL_METRICS,
  MetricId,
  useHealthMetricsStore,
} from "@/store/healthMetricsStore";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

// ─── Metric Karte ─────────────────────────────────────────────────────────────
function HealthMetric({
  emoji,
  label,
  value,
  unit,
  color,
  bg,
  progress,
  goal,
}: {
  emoji: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  bg: string;
  progress?: number;
  goal?: string;
}) {
  const displayValue =
    unit === "Schritte" ? value.toLocaleString("de-DE") : value;
  return (
    <View style={[hm.card, { backgroundColor: bg }]}>
      <View style={hm.cardTop}>
        <Text style={hm.emoji}>{emoji}</Text>
        <Text style={[hm.label, { color }]}>{label}</Text>
      </View>
      <View style={hm.valueRow}>
        <Text style={[hm.value, { color }]}>{displayValue}</Text>
        <Text style={[hm.unit, { color }]}>{unit}</Text>
      </View>
      {progress !== undefined && (
        <View style={hm.barTrack}>
          <View
            style={[
              hm.barFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      )}
      {goal ? <Text style={[hm.goal, { color }]}>Ziel: {goal}</Text> : null}
    </View>
  );
}

const hm = StyleSheet.create({
  card: { flex: 1, minWidth: "47%", borderRadius: 16, padding: 14, gap: 4 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  emoji: { fontSize: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  value: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  unit: { fontSize: 13, fontWeight: "600", opacity: 0.7, marginBottom: 2 },
  barTrack: {
    height: 5,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 6,
  },
  barFill: { height: "100%", borderRadius: 3 },
  goal: { fontSize: 11, opacity: 0.6, marginTop: 2 },
});

// ─── Letztes Workout ──────────────────────────────────────────────────────────
function LastWorkoutCard({ workout }: { workout: WorkoutData }) {
  const dateStr = workout.date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  return (
    <View style={wo.card}>
      <View style={wo.left}>
        <Text style={wo.title}>{workout.activityType}</Text>
        <Text style={wo.date}>{dateStr}</Text>
      </View>
      <View style={wo.stats}>
        <View style={wo.stat}>
          <Text style={wo.statVal}>{workout.durationMin}'</Text>
          <Text style={wo.statLabel}>Min</Text>
        </View>
        {workout.calories > 0 && (
          <View style={wo.stat}>
            <Text style={wo.statVal}>{workout.calories}</Text>
            <Text style={wo.statLabel}>kcal</Text>
          </View>
        )}
        {workout.distanceKm > 0 && (
          <View style={wo.stat}>
            <Text style={wo.statVal}>{workout.distanceKm}</Text>
            <Text style={wo.statLabel}>km</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const wo = StyleSheet.create({
  card: {
    backgroundColor: "#f0f4ff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { gap: 3 },
  title: { fontSize: 15, fontWeight: "700", color: "#1e3a5f" },
  date: { fontSize: 12, color: "#64748b" },
  stats: { flexDirection: "row", gap: 14 },
  stat: { alignItems: "center" },
  statVal: { fontSize: 17, fontWeight: "800", color: "#4b60af" },
  statLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "500" },
});

// ─── Konfigurations-Tab ───────────────────────────────────────────────────────
function ConfigureTab() {
  const { enabledMetrics, toggleMetric } = useHealthMetricsStore();
  return (
    <View style={cfg.container}>
      <Text style={cfg.hint}>
        Wähle welche Gesundheitsdaten du sehen möchtest.
      </Text>
      <View style={cfg.grid}>
        {ALL_METRICS.map((m) => {
          const enabled = enabledMetrics.includes(m.id);
          return (
            <Pressable
              key={m.id}
              onPress={() => toggleMetric(m.id)}
              style={[
                cfg.chip,
                enabled && { backgroundColor: m.color, borderColor: m.color },
              ]}
            >
              <Text style={cfg.chipEmoji}>{m.emoji}</Text>
              <Text style={[cfg.chipLabel, enabled && { color: "white" }]}>
                {m.label}
              </Text>
              <View
                style={[
                  cfg.toggle,
                  enabled
                    ? { backgroundColor: "rgba(255,255,255,0.35)" }
                    : { backgroundColor: "#e2e8f0" },
                ]}
              >
                <Text style={[cfg.toggleText, enabled && { color: "white" }]}>
                  {enabled ? "✓" : "+"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={cfg.futureBox}>
        <Text style={cfg.futureTitle}>🔗 Habits verknüpfen</Text>
        <Text style={cfg.futureDesc}>
          Bald: Erstelle automatisch Habits aus deinen Gesundheitsdaten – z.B.
          "10.000 Schritte" direkt aus der Fitness App.
        </Text>
        <View style={cfg.futureBadge}>
          <Text style={cfg.futureBadgeText}>Kommt bald</Text>
        </View>
      </View>
    </View>
  );
}

const cfg = StyleSheet.create({
  container: { gap: 14 },
  hint: { fontSize: 13, color: "#64748b", lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 14, fontWeight: "600", color: "#334155" },
  toggle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  toggleText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  futureBox: {
    backgroundColor: "#f8f9fb",
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  futureTitle: { fontSize: 14, fontWeight: "700", color: "#334155" },
  futureDesc: { fontSize: 12, color: "#64748b", lineHeight: 17 },
  futureBadge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: "#f0f4ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  futureBadgeText: { fontSize: 11, fontWeight: "600", color: "#4b60af" },
});

// ─── Daten-Inhalt – NUR nach Auth ─────────────────────────────────────────────
function HealthDataContent({ onConfigure }: { onConfigure: () => void }) {
  const health = useHealthValues();
  const { enabledMetrics, goals } = useHealthMetricsStore();
  const activeMetrics = ALL_METRICS.filter((m) =>
    enabledMetrics.includes(m.id)
  );

  function getValue(id: MetricId): number {
    switch (id) {
      case "steps":
        return health.steps;
      case "calories":
        return health.calories;
      case "distance":
        return health.distanceKm;
      case "heartRate":
        return health.heartRate;
      case "sleep":
        return health.sleepHours;
      case "weight":
        return health.weightKg;
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Letztes Workout aus Fitness App */}
      {health.lastWorkout && (
        <View style={{ gap: 6 }}>
          <Text style={s.sectionLabel}>Letztes Workout · Fitness App</Text>
          <LastWorkoutCard workout={health.lastWorkout} />
        </View>
      )}

      {/* Metriken */}
      {activeMetrics.length === 0 ? (
        <Pressable onPress={onConfigure} style={s.emptyBox}>
          <Text style={s.emptyText}>
            Noch keine Metriken ausgewählt.{" "}
            <Text style={{ color: "#3b8995", fontWeight: "700" }}>
              Jetzt anpassen →
            </Text>
          </Text>
        </Pressable>
      ) : (
        <View style={s.grid}>
          {activeMetrics.map((m) => {
            const value = getValue(m.id);
            const goal = goals[m.id] ?? m.goalDefault;
            const hasGoal = goal > 0;
            return (
              <HealthMetric
                key={m.id}
                emoji={m.emoji}
                label={m.label}
                value={value}
                unit={m.unit}
                color={m.color}
                bg={m.bg}
                progress={hasGoal ? value / goal : undefined}
                goal={hasGoal ? m.goalLabel : undefined}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export function HealthSection() {
  const { isAvailable, isAuthorized, requestAuth } = useHealthAuth();
  const [tab, setTab] = useState<"data" | "configure">("data");

  if (!isAvailable || Platform.OS !== "ios") return null;

  if (!isAuthorized) {
    return (
      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <Text style={s.cardTitle}>Gesundheit</Text>
          <View style={s.hkBadge}>
            <Text style={s.hkBadgeText}>HealthKit</Text>
          </View>
        </View>
        <View style={s.connectBox}>
          <Text style={s.connectEmoji}>🩺</Text>
          <Text style={s.connectTitle}>Health-Daten verbinden</Text>
          <Text style={s.connectDesc}>
            Verknüpfe Apple Health um Schritte, Schlaf, Herzrate und Workouts
            direkt in deinen Statistiken zu sehen.
          </Text>
          <Pressable onPress={requestAuth} style={s.connectBtn}>
            <Text style={s.connectBtnText}>Mit Apple Health verbinden</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.cardHeaderRow}>
        <Text style={s.cardTitle}>Gesundheit</Text>
        <View style={s.tabRow}>
          <Pressable
            onPress={() => setTab("data")}
            style={[s.tabBtn, tab === "data" && s.tabBtnActive]}
          >
            <Text style={[s.tabBtnText, tab === "data" && s.tabBtnTextActive]}>
              Daten
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("configure")}
            style={[s.tabBtn, tab === "configure" && s.tabBtnActive]}
          >
            <Text
              style={[s.tabBtnText, tab === "configure" && s.tabBtnTextActive]}
            >
              ⚙ Anpassen
            </Text>
          </Pressable>
        </View>
      </View>
      {tab === "data" && (
        <HealthDataContent onConfigure={() => setTab("configure")} />
      )}
      {tab === "configure" && <ConfigureTab />}
    </View>
  );
}

const s = StyleSheet.create({
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
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hkBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  hkBadgeText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  tabBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 16 },
  tabBtnActive: { backgroundColor: "white" },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  tabBtnTextActive: { color: "#0f172a" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emptyBox: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fb",
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  connectBox: { alignItems: "center", paddingVertical: 12, gap: 10 },
  connectEmoji: { fontSize: 40 },
  connectTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  connectDesc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  connectBtn: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#3b8995",
    borderRadius: 24,
  },
  connectBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
