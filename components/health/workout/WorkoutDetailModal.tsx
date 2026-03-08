// components/health/workout/WorkoutDetailModal.tsx
import { WorkoutHistoryData } from "@/hooks/useHealthData";
import { getSportCategory } from "@/hooks/useWorkoutDetail";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../healthTokens";
import { Ic } from "../HealthUI";
import { WorkoutChartSection } from "./WorkoutChartSection";

// ─── Type metadata ────────────────────────────────────────────────────────────
type WDef = { label: string; lib: "I" | "M"; icon: string; color: string };

const WO_MAP: Record<number, WDef> = {
  37: { label: "Laufen", lib: "I", icon: "walk-outline", color: "#d97706" },
  16: { label: "Laufen", lib: "I", icon: "walk-outline", color: "#d97706" },
  13: { label: "Radfahren", lib: "M", icon: "bike", color: "#059669" },
  14: { label: "Rad indoor", lib: "M", icon: "bike", color: "#059669" },
  46: { label: "Schwimmen", lib: "I", icon: "water-outline", color: "#0369a1" },
  82: { label: "Schwimmen", lib: "I", icon: "water-outline", color: "#0369a1" },
  52: { label: "Gehen", lib: "I", icon: "footsteps", color: "#6b7280" },
  20: {
    label: "Krafttraining",
    lib: "M",
    icon: "weight-lifter",
    color: "#7c3aed",
  },
  63: {
    label: "Krafttraining",
    lib: "M",
    icon: "weight-lifter",
    color: "#7c3aed",
  },
  48: { label: "Yoga", lib: "M", icon: "yoga", color: "#db2777" },
  57: { label: "HIIT", lib: "M", icon: "lightning-bolt", color: "#dc2626" },
};
const WO_FALLBACK: WDef = {
  label: "Training",
  lib: "M",
  icon: "run",
  color: "#0e7490",
};
const getWO = (n: number) =>
  WO_MAP[n] ?? { ...WO_FALLBACK, label: `Training (${n})` };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDuration(min: number): string {
  const h = Math.floor(min / 60),
    m = min % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h}h`;
  return `${h}h ${m}min`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={[ch.chip, { backgroundColor: color + "12" }]}>
      <Text style={[ch.val, { color }]}>
        {value}
        <Text style={ch.unit}> {unit}</Text>
      </Text>
      <Text style={[ch.label, { color }]}>{label}</Text>
    </View>
  );
}

const ch = StyleSheet.create({
  chip: {
    flex: 1,
    minWidth: 88,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 2,
  },
  val: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  unit: { fontSize: 11, fontWeight: "600", opacity: 0.7 },
  label: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
});

// ─── Zone bar ─────────────────────────────────────────────────────────────────
// Simplified HR zone indicator (no real-time zones — just visual reference)
const HR_ZONES = [
  { label: "Z1", pct: 20, color: "#6ee7b7" },
  { label: "Z2", pct: 25, color: "#34d399" },
  { label: "Z3", pct: 30, color: "#fbbf24" },
  { label: "Z4", pct: 15, color: "#f97316" },
  { label: "Z5", pct: 10, color: "#ef4444" },
];

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  workout: WorkoutHistoryData;
  onClose: () => void;
}

export function WorkoutDetailModal({ workout, onClose }: Props) {
  const ins = useSafeAreaInsets();
  const def = getWO(workout.typeNum);
  const cat = getSportCategory(workout.typeNum);

  const dateStr = workout.startDate.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingTop: ins.top + 6 }]}>
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft} />
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>{def.label}</Text>
            <Text style={s.headerSub}>{dateStr}</Text>
          </View>
          <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={18} color={C.sub} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero card ── */}
          <View style={[s.heroCard, { borderColor: def.color + "30" }]}>
            {/* Sport icon */}
            <View style={[s.heroIcon, { backgroundColor: def.color + "18" }]}>
              <Ic lib={def.lib} name={def.icon} size={32} color={def.color} />
            </View>

            {/* Time row */}
            <View style={s.heroTimeRow}>
              <View style={s.heroTimeItem}>
                <Ionicons name="time-outline" size={13} color={C.muted} />
                <Text style={s.heroTimeVal}>{fmtTime(workout.startDate)}</Text>
              </View>
              <View
                style={[s.heroTimeDash, { backgroundColor: def.color + "40" }]}
              />
              <View style={s.heroTimeItem}>
                <Ionicons name="flag-outline" size={13} color={C.muted} />
                <Text style={s.heroTimeVal}>{fmtTime(workout.endDate)}</Text>
              </View>
            </View>
          </View>

          {/* ── Stats grid ── */}
          <View style={s.statsGrid}>
            <StatChip
              label="Dauer"
              value={fmtDuration(workout.durationMin)}
              unit=""
              color={def.color}
            />
            {workout.calories > 0 && (
              <StatChip
                label="Kalorien"
                value={`${workout.calories}`}
                unit="kcal"
                color="#dc2626"
              />
            )}
            {workout.distanceKm > 0 && (
              <StatChip
                label="Distanz"
                value={`${workout.distanceKm}`}
                unit="km"
                color="#0369a1"
              />
            )}
            {workout.distanceKm > 0 &&
              workout.durationMin > 0 &&
              cat === "running" &&
              (() => {
                const paceDecimal = workout.durationMin / workout.distanceKm;
                const paceM = Math.floor(paceDecimal);
                const paceS = Math.round((paceDecimal - paceM) * 60);
                return (
                  <StatChip
                    label="Pace"
                    value={`${paceM}:${String(paceS).padStart(2, "0")}`}
                    unit="min/km"
                    color="#d97706"
                  />
                );
              })()}
            {workout.distanceKm > 0 &&
              workout.durationMin > 0 &&
              cat === "cycling" && (
                <StatChip
                  label="Ø Tempo"
                  value={`${(
                    (workout.distanceKm / workout.durationMin) *
                    60
                  ).toFixed(1)}`}
                  unit="km/h"
                  color="#059669"
                />
              )}
          </View>

          {/* ── Charts ── */}
          <WorkoutChartSection
            startDate={workout.startDate}
            endDate={workout.endDate}
            typeNum={workout.typeNum}
          />

          {/* ── Info ── */}
          <View style={s.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={C.muted}
            />
            <Text style={s.infoTx}>
              Sensordaten wie Herzfrequenz, Pace und Kadenz werden von der Apple
              Watch aufgezeichnet.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.card },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 8,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerLeft: { width: 36 },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { padding: 16, paddingBottom: 52, gap: 12 },

  heroCard: {
    backgroundColor: C.bg,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  heroTimeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroTimeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  heroTimeVal: { fontSize: 16, fontWeight: "700", color: C.text },
  heroTimeDash: { width: 24, height: 1.5, borderRadius: 1 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#f9fafb",
    borderRadius: 11,
    padding: 11,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoTx: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 18 },
});
