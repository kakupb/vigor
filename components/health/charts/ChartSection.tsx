// components/health/charts/ChartSection.tsx
import { SleepNight } from "@/hooks/useSleepData";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C } from "../healthTokens";
import { Label } from "../HealthUI";
import { LineChart } from "./LineChart";

const SW = Dimensions.get("window").width;

type ChartId = "hr" | "hrv" | "rr" | "spo2";

interface TabDef {
  id: ChartId;
  label: string;
  color: string;
  bg: string;
  series: { t: number; v: number }[];
  unit: string;
  avgLabel: string;
  avg: string;
  min?: string;
  minLabel?: string;
}

function clockLabel(bedMs: number, t: number): string {
  const d = new Date(bedMs + t * 60_000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function buildXLabels(series: { t: number }[], bedMs: number, n = 4) {
  if (series.length < 2) return [];
  const minT = series[0].t,
    maxT = series[series.length - 1].t;
  return Array.from({ length: n }, (_, i) => {
    const t = minT + (i / (n - 1)) * (maxT - minT);
    return { t, label: clockLabel(bedMs, t) };
  });
}

interface Props {
  night: SleepNight;
  debugLines?: string[];
}

export function ChartSection({ night, debugLines }: Props) {
  const chartW = SW - 64;
  const bedMs = night.bedtime.getTime();

  const allTabs: TabDef[] = (
    [
      {
        id: "hr" as ChartId,
        label: "Herzfrequenz",
        color: C.hr,
        bg: C.hrBg,
        series: night.hrSeries,
        unit: "bpm",
        avgLabel: "Ø Puls",
        avg: night.avgHeartRate > 0 ? `${night.avgHeartRate}` : "",
        min: night.minHeartRate > 0 ? `${night.minHeartRate}` : undefined,
        minLabel: "Min",
      },
      {
        id: "hrv" as ChartId,
        label: "HRV",
        color: C.hrv,
        bg: C.hrvBg,
        series: night.hrvSeries,
        unit: "ms",
        avgLabel: "Ø HRV",
        avg: night.avgHRV > 0 ? `${night.avgHRV}` : "",
      },
      {
        id: "rr" as ChartId,
        label: "Atemfreq.",
        color: C.rr,
        bg: C.rrBg,
        series: night.rrSeries,
        unit: "/min",
        avgLabel: "Ø Atemrate",
        avg: night.avgRespiratoryRate > 0 ? `${night.avgRespiratoryRate}` : "",
      },
      {
        id: "spo2" as ChartId,
        label: "SpO₂",
        color: C.spo2,
        bg: C.spo2Bg,
        series: night.spo2Series,
        unit: "%",
        avgLabel: "Ø SpO₂",
        avg: night.avgSpO2 > 0 ? `${night.avgSpO2}` : "",
      },
    ] as TabDef[]
  ).filter((t) => t.series.length > 1);

  // Hook must run unconditionally
  const [active, setActive] = useState<ChartId>(allTabs[0]?.id ?? "hr");

  if (!allTabs.length) {
    return (
      <View style={s.card}>
        <Label>Körpergraphen</Label>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Keine Sensordaten</Text>
          <Text style={s.emptyDesc}>
            Apple Watch wird benötigt um Herzfrequenz, HRV und Atemfrequenz
            während des Schlafs aufzuzeichnen.
          </Text>
        </View>
        {debugLines && debugLines.length > 0 && (
          <View style={s.debug}>
            {debugLines
              .filter(
                (l) =>
                  l.includes("HR=") ||
                  l.includes("ERR") ||
                  l.includes("no data") ||
                  l.includes("unit=")
              )
              .map((l, i) => (
                <Text key={i} style={s.debugTx}>
                  {l}
                </Text>
              ))}
          </View>
        )}
      </View>
    );
  }

  const tab = allTabs.find((t) => t.id === active) ?? allTabs[0];
  const formatY =
    tab.id === "spo2"
      ? (v: number) => `${v.toFixed(0)}%`
      : (v: number) => `${Math.round(v)}`;
  const xLabels = buildXLabels(tab.series, bedMs, 4);

  return (
    <View style={s.card}>
      <Label>Körpergraphen</Label>

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

      <View style={s.chartBox}>
        <LineChart
          key={tab.id}
          data={tab.series}
          width={chartW}
          height={168}
          color={tab.color}
          gradientId={`csg_${tab.id}`}
          formatY={formatY}
          xLabels={xLabels}
        />
      </View>

      {tab.avg ? (
        <View style={s.statsRow}>
          <View style={s.statCell}>
            <Text style={[s.statVal, { color: tab.color }]}>
              {tab.avg}
              <Text style={[s.statUnit, { color: tab.color }]}>
                {" "}
                {tab.unit}
              </Text>
            </Text>
            <Text style={s.statKey}>{tab.avgLabel}</Text>
          </View>
          {tab.min && (
            <View style={[s.statCell, s.statDivider]}>
              <Text style={[s.statVal, { color: tab.color }]}>
                {tab.min}
                <Text style={[s.statUnit, { color: tab.color }]}>
                  {" "}
                  {tab.unit}
                </Text>
              </Text>
              <Text style={s.statKey}>{tab.minLabel}</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.bg, borderRadius: 18, padding: 16, gap: 12 },

  empty: { paddingVertical: 20, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: C.sub },
  emptyDesc: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  debug: {
    marginTop: 4,
    padding: 10,
    backgroundColor: "#fefce8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde047",
    gap: 2,
  },
  debugTx: {
    fontSize: 9,
    color: "#713f12",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
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

  statsRow: { flexDirection: "row", gap: 0 },
  statCell: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: "center",
    gap: 2,
  },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.border },
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
