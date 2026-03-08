// components/health/workout/WorkoutChartSection.tsx
// Sport-specific chart tabs for a workout detail view.
// Laufen:    HR · Pace · Leistung
// Radfahren: HR · Geschw. · Kadenz · Leistung
// Sonstiges: HR only
import {
  getSportCategory,
  useWorkoutDetail,
  WDSample,
} from "@/hooks/useWorkoutDetail";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "../charts/LineChart";
import { C } from "../healthTokens";
import { Label } from "../HealthUI";

const SW = Dimensions.get("window").width;

// ─── Tab definition ───────────────────────────────────────────────────────────
type TabId = "hr" | "speed" | "cadence" | "power";

interface TabDef {
  id: TabId;
  label: string;
  color: string;
  bg: string;
  series: WDSample[];
  unit: string;
  avgLabel: string;
  avg: string;
  formatY: (v: number) => string;
  formatX: (t: number) => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function secsToLabel(t: number): string {
  const total = Math.round(t);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}'`;
}

function buildXLabels(series: WDSample[], n = 4) {
  if (series.length < 2) return [];
  const minT = series[0].t,
    maxT = series[series.length - 1].t;
  return Array.from({ length: n }, (_, i) => {
    const t = minT + (i / (n - 1)) * (maxT - minT);
    return { t, label: secsToLabel(t) };
  });
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  startDate: Date;
  endDate: Date;
  typeNum: number;
}

export function WorkoutChartSection({ startDate, endDate, typeNum }: Props) {
  const chartW = SW - 64;
  const metrics = useWorkoutDetail(startDate, endDate, typeNum);
  const cat = getSportCategory(typeNum);
  const isRunning = cat === "running";
  const isCycling = cat === "cycling";

  const [active, setActive] = useState<TabId>("hr");

  if (metrics.isLoading) {
    return (
      <View style={s.card}>
        <Label>Trainingsanalyse</Label>
        <View style={s.loadWrap}>
          <ActivityIndicator size="small" color={C.hr} />
          <Text style={s.loadTx}>Sensordaten laden…</Text>
        </View>
      </View>
    );
  }

  const avgHR = Math.round(mean(metrics.hrSeries.map((s) => s.v)));
  const avgSpeed =
    Math.round(mean(metrics.speedSeries.map((s) => s.v)) * 10) / 10;
  const avgCad = Math.round(mean(metrics.cadenceSeries.map((s) => s.v)));
  const avgPow = Math.round(mean(metrics.powerSeries.map((s) => s.v)));

  // Format pace as "X:XX min/km"
  const fmtPace = (v: number) => {
    const m = Math.floor(v),
      s = Math.round((v - m) * 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const allTabs: TabDef[] = (
    [
      {
        id: "hr" as TabId,
        label: "Herzfrequenz",
        color: "#b91c1c",
        bg: "#fff1f2",
        series: metrics.hrSeries,
        unit: "bpm",
        avgLabel: "Ø Puls",
        avg: avgHR > 0 ? `${avgHR}` : "",
        formatY: (v: number) => `${Math.round(v)}`,
        formatX: secsToLabel,
      },
      ...(isRunning && metrics.speedSeries.length > 1
        ? [
            {
              id: "speed" as TabId,
              label: "Pace",
              color: "#d97706",
              bg: "#fffbeb",
              series: metrics.speedSeries,
              unit: "min/km",
              avgLabel: "Ø Pace",
              avg: avgSpeed > 0 ? fmtPace(avgSpeed) : "",
              formatY: fmtPace,
              formatX: secsToLabel,
            },
          ]
        : []),
      ...(isCycling && metrics.speedSeries.length > 1
        ? [
            {
              id: "speed" as TabId,
              label: "Geschw.",
              color: "#059669",
              bg: "#f0fdf4",
              series: metrics.speedSeries,
              unit: "km/h",
              avgLabel: "Ø Tempo",
              avg: avgSpeed > 0 ? `${avgSpeed}` : "",
              formatY: (v: number) => `${v.toFixed(1)}`,
              formatX: secsToLabel,
            },
          ]
        : []),
      ...(isCycling && metrics.cadenceSeries.length > 1
        ? [
            {
              id: "cadence" as TabId,
              label: "Kadenz",
              color: "#0369a1",
              bg: "#f0f9ff",
              series: metrics.cadenceSeries,
              unit: "rpm",
              avgLabel: "Ø Kadenz",
              avg: avgCad > 0 ? `${avgCad}` : "",
              formatY: (v: number) => `${Math.round(v)}`,
              formatX: secsToLabel,
            },
          ]
        : []),
      ...((isRunning || isCycling) && metrics.powerSeries.length > 1
        ? [
            {
              id: "power" as TabId,
              label: "Leistung",
              color: "#7c3aed",
              bg: "#f5f3ff",
              series: metrics.powerSeries,
              unit: "W",
              avgLabel: "Ø Leistung",
              avg: avgPow > 0 ? `${avgPow}` : "",
              formatY: (v: number) => `${Math.round(v)}`,
              formatX: secsToLabel,
            },
          ]
        : []),
    ] as TabDef[]
  ).filter((t) => t.series.length > 1);

  if (!allTabs.length) {
    return (
      <View style={s.card}>
        <Label>Trainingsanalyse</Label>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Keine Sensordaten</Text>
          <Text style={s.emptyDesc}>
            Apple Watch wird benötigt um Herzfrequenz, Pace und Leistung
            aufzuzeichnen.
          </Text>
        </View>
      </View>
    );
  }

  const tab = allTabs.find((t) => t.id === active) ?? allTabs[0];
  const xLabels = buildXLabels(tab.series, 4);

  return (
    <View style={s.card}>
      <Label>Trainingsanalyse</Label>

      {/* Tab pills */}
      <View style={s.tabRow}>
        {allTabs.map((t) => {
          const on = t.id === tab.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setActive(t.id)}
              style={[
                s.pill,
                on
                  ? { backgroundColor: t.bg, borderColor: t.color + "55" }
                  : { backgroundColor: C.card, borderColor: C.border },
              ]}
            >
              <View
                style={[s.dot, { backgroundColor: on ? t.color : C.muted }]}
              />
              <Text style={[s.pillTx, { color: on ? t.color : C.muted }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Chart */}
      <View style={s.chartBox}>
        <LineChart
          key={tab.id}
          data={tab.series}
          width={chartW}
          height={168}
          color={tab.color}
          gradientId={`wcs_${tab.id}`}
          formatY={tab.formatY}
          xLabels={xLabels}
        />
      </View>

      {/* Stat below chart */}
      {tab.avg ? (
        <View style={s.statRow}>
          <Text style={[s.statVal, { color: tab.color }]}>
            {tab.avg}
            <Text style={[s.statUnit, { color: tab.color }]}> {tab.unit}</Text>
          </Text>
          <Text style={s.statKey}>{tab.avgLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { backgroundColor: C.bg, borderRadius: 18, padding: 16, gap: 12 },

  loadWrap: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  loadTx: { fontSize: 12, color: C.muted },

  empty: { paddingVertical: 20, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: C.sub },
  emptyDesc: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillTx: { fontSize: 12, fontWeight: "600" },

  chartBox: { borderRadius: 14, overflow: "hidden", backgroundColor: C.card },

  statRow: { alignItems: "center", paddingVertical: 4, gap: 2 },
  statVal: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statUnit: { fontSize: 13, fontWeight: "600" },
  statKey: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
