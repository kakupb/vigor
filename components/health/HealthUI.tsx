// components/health/HealthUI.tsx
// Shared micro-components used across the health feature.
import { SleepNight } from "@/hooks/useSleepData";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { C } from "./healthTokens";

// ─── Icon wrapper (Ionicons or MaterialCommunityIcons) ────────────────────────
export function Ic({
  lib,
  name,
  size,
  color,
}: {
  lib: "I" | "M";
  name: string;
  size: number;
  color: string;
}) {
  return lib === "M" ? (
    <MaterialCommunityIcons name={name as any} size={size} color={color} />
  ) : (
    <Ionicons name={name as any} size={size} color={color} />
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

// ─── Horizontal sleep-phases bar ──────────────────────────────────────────────
export function PhasesBar({
  night,
  h = 10,
}: {
  night: SleepNight;
  h?: number;
}) {
  const items = [
    { min: night.deepMinutes, color: C.deep },
    { min: night.coreMinutes, color: C.core },
    { min: night.remMinutes, color: C.rem },
    { min: night.awakeMinutes, color: C.awake },
  ].filter((i) => i.min > 0);

  const total = Math.max(
    1,
    items.reduce((a, i) => a + i.min, 0)
  );
  if (!items.length) return null;

  return (
    <View style={[s.phasesBar, { height: h, borderRadius: h / 2 }]}>
      {items.map((it, i) => (
        <View
          key={i}
          style={{
            flex: it.min / total,
            height: h,
            backgroundColor: it.color,
            borderTopLeftRadius: i === 0 ? h / 2 : 0,
            borderBottomLeftRadius: i === 0 ? h / 2 : 0,
            borderTopRightRadius: i === items.length - 1 ? h / 2 : 0,
            borderBottomRightRadius: i === items.length - 1 ? h / 2 : 0,
          }}
        />
      ))}
    </View>
  );
}

// ─── Score circle (double-ring) ───────────────────────────────────────────────
export function ScoreCircle({
  score,
  r = 36,
  color,
}: {
  score: number;
  r?: number;
  color: string;
}) {
  return (
    <View
      style={[
        s.scoreOuter,
        {
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderColor: color + "28",
        },
      ]}
    >
      <View style={[s.scoreInner, { borderColor: color }]}>
        <Text style={[s.scoreNum, { color, fontSize: r * 0.5 }]}>{score}</Text>
      </View>
    </View>
  );
}

// ─── Physio metric card ───────────────────────────────────────────────────────
export function PhysioCard({
  lib,
  icon,
  color,
  bg,
  label,
  val,
  unit,
  sub,
}: {
  lib: "I" | "M";
  icon: string;
  color: string;
  bg: string;
  label: string;
  val: string;
  unit: string;
  sub?: string;
}) {
  return (
    <View style={[s.physioCard, { backgroundColor: bg }]}>
      <View style={[s.physioIconWrap, { backgroundColor: color + "18" }]}>
        <Ic lib={lib} name={icon} size={15} color={color} />
      </View>
      <Text style={[s.physioLabel, { color }]}>{label}</Text>
      <View style={s.physioValRow}>
        <Text style={[s.physioVal, { color }]}>{val}</Text>
        <Text style={[s.physioUnit, { color }]}> {unit}</Text>
      </View>
      {sub ? <Text style={[s.physioSub, { color }]}>{sub}</Text> : null}
    </View>
  );
}

// ─── Small tag chip ───────────────────────────────────────────────────────────
export function Tag({
  color,
  bg,
  lib,
  icon,
  label,
}: {
  color: string;
  bg: string;
  lib: "I" | "M";
  icon: string;
  label: string;
}) {
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      <Ic lib={lib} name={icon} size={10} color={color} />
      <Text style={[s.tagTx, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  phasesBar: { flexDirection: "row", overflow: "hidden" },

  scoreOuter: {
    borderWidth: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInner: {
    width: "70%",
    aspectRatio: 1,
    borderRadius: 100,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontWeight: "800", letterSpacing: -1 },

  physioCard: { flex: 1, minWidth: 100, borderRadius: 14, padding: 12, gap: 4 },
  physioIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  physioLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    opacity: 0.75,
  },
  physioValRow: { flexDirection: "row", alignItems: "baseline" },
  physioVal: { fontSize: 20, fontWeight: "800" },
  physioUnit: { fontSize: 11, fontWeight: "600", opacity: 0.7 },
  physioSub: { fontSize: 9, opacity: 0.65 },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
  },
  tagTx: { fontSize: 10, fontWeight: "700" },
});
