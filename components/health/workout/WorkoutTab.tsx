// components/health/workout/WorkoutTab.tsx
import { WorkoutHistoryModal } from "@/components/stats/WorkoutHistoryModal";
import { useWorkoutHistory, WorkoutHistoryData } from "@/hooks/useHealthData";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C } from "../healthTokens";
import { Ic, Label } from "../HealthUI";
import { WorkoutDetailModal } from "./WorkoutDetailModal";

// ─── Workout type metadata ────────────────────────────────────────────────────
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
  3000: { label: "Sport", lib: "M", icon: "run", color: "#0e7490" },
};
const getWO = (n: number): WDef =>
  WO_MAP[n] ?? {
    label: `Training (${n})`,
    lib: "M",
    icon: "run",
    color: "#0e7490",
  };

// ─── Single workout row ───────────────────────────────────────────────────────
function WorkoutRow({
  w,
  showBorder,
  onPress,
}: {
  w: WorkoutHistoryData;
  showBorder: boolean;
  onPress: () => void;
}) {
  const d = getWO(w.typeNum);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.woRow,
        showBorder && s.rowBorder,
        pressed && s.pressed,
      ]}
    >
      <View style={[s.woIcon, { backgroundColor: d.color + "18" }]}>
        <Ic lib={d.lib} name={d.icon} size={19} color={d.color} />
      </View>
      <View style={s.woContent}>
        <Text style={s.woTitle}>{d.label}</Text>
        <Text style={s.woMeta}>
          {w.date.toLocaleDateString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          })}
          {w.durationMin > 0 ? `  ·  ${w.durationMin} min` : ""}
          {w.calories > 0 ? `  ·  ${w.calories} kcal` : ""}
          {w.distanceKm > 0 ? `  ·  ${w.distanceKm} km` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.muted} />
    </Pressable>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function WorkoutTab() {
  const { workouts, isLoading } = useWorkoutHistory(50);
  const [importModal, setImport] = useState(false);
  const [detail, setDetail] = useState<WorkoutHistoryData | null>(null);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0e7490" />
        <Text style={s.loadTx}>Trainings laden…</Text>
      </View>
    );
  }

  const totalMin = workouts.reduce((a, w) => a + w.durationMin, 0);
  const totalKcal = workouts.reduce((a, w) => a + w.calories, 0);

  // Group by month
  const months = new Map<string, WorkoutHistoryData[]>();
  for (const w of workouts) {
    const k = w.date.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    });
    if (!months.has(k)) months.set(k, []);
    months.get(k)!.push(w);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary banner */}
        {workouts.length > 0 && (
          <View style={s.statsCard}>
            <View style={s.statsRow}>
              {[
                { val: `${workouts.length}`, key: "Einheiten" },
                { val: `${Math.round(totalMin / 60)}h`, key: "Gesamtzeit" },
                {
                  val:
                    totalKcal > 9999
                      ? `${(totalKcal / 1000).toFixed(1)}k`
                      : `${totalKcal}`,
                  key: "kcal",
                },
              ].map((it, i, arr) => (
                <View key={i} style={s.statItem}>
                  <Text style={s.statVal}>{it.val}</Text>
                  <Text style={s.statKey}>{it.key}</Text>
                  {i < arr.length - 1 && <View style={s.statDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Import button */}
        <Pressable onPress={() => setImport(true)} style={s.importBtn}>
          <Ionicons name="download-outline" size={17} color="#3730a3" />
          <Text style={s.importTx}>Trainings importieren & verknüpfen</Text>
        </Pressable>

        {/* Monthly grouped list */}
        {Array.from(months.entries()).map(([month, ws]) => (
          <View key={month} style={s.listCard}>
            <Label>{month.toUpperCase()}</Label>
            {ws.map((w, i) => (
              <WorkoutRow
                key={w.id}
                w={w}
                showBorder={i < ws.length - 1}
                onPress={() => setDetail(w)}
              />
            ))}
          </View>
        ))}

        {/* Empty state */}
        {!workouts.length && (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: "#f0f9ff" }]}>
              <Ionicons name="barbell-outline" size={34} color="#0369a1" />
            </View>
            <Text style={s.emptyTitle}>Keine Trainings</Text>
            <Text style={s.emptyDesc}>
              Trainiere mit der Fitness-App – sie erscheinen hier automatisch.
            </Text>
          </View>
        )}
      </ScrollView>

      {detail && (
        <WorkoutDetailModal workout={detail} onClose={() => setDetail(null)} />
      )}
      <WorkoutHistoryModal
        visible={importModal}
        onClose={() => setImport(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadTx: { fontSize: 13, color: C.muted },
  scroll: { padding: 16, paddingBottom: 50, gap: 12 },

  statsCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  statsRow: { flexDirection: "row" },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    position: "relative",
  },
  statVal: { fontSize: 18, fontWeight: "800", color: C.text },
  statKey: { fontSize: 10, color: C.muted, marginTop: 2 },
  statDivider: {
    position: "absolute",
    right: 0,
    top: 6,
    bottom: 6,
    width: 1,
    backgroundColor: C.border,
  },

  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  importTx: { fontSize: 14, fontWeight: "700", color: "#3730a3" },

  listCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    gap: 4,
  },

  woRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  pressed: { opacity: 0.6 },
  woIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  woContent: { flex: 1 },
  woTitle: { fontSize: 14, fontWeight: "600", color: C.text },
  woMeta: { fontSize: 12, color: C.muted, marginTop: 2 },

  emptyWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  emptyDesc: {
    fontSize: 13,
    color: C.sub,
    textAlign: "center",
    lineHeight: 20,
  },
});
