// components/health/sleep/SleepTab.tsx
import { SleepNight, SleepStats, useSleepAnalysis } from "@/hooks/useSleepData";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SleepDurationChart } from "../charts/SleepDurationChart";
import { C, scoreColor } from "../healthTokens";
import { Label } from "../HealthUI";
import { NightDetailModal } from "./NightDetailModal";
import { NightRow } from "./NightRow";

// ─── Stats banner ─────────────────────────────────────────────────────────────
function StatsBanner({ stats }: { stats: SleepStats }) {
  const {
    avgDurationH,
    avgSleepScore,
    avgBedtime,
    avgWakeTime,
    bedtimeDeviationMin,
  } = stats;
  const devCol =
    bedtimeDeviationMin < 30
      ? C.great
      : bedtimeDeviationMin < 60
      ? C.ok
      : C.bad;

  const items = [
    { val: `${avgDurationH}h`, key: "Ø Schlaf", col: undefined },
    { val: `${avgSleepScore}`, key: "Ø Score", col: scoreColor(avgSleepScore) },
    { val: avgBedtime, key: "Ø Einschl.", col: undefined },
    { val: avgWakeTime, key: "Ø Aufwach.", col: undefined },
  ];

  return (
    <View style={s.statsCard}>
      <View style={s.statsRow}>
        {items.map((it, i) => (
          <View key={i} style={s.statItem}>
            <Text style={[s.statVal, it.col ? { color: it.col } : undefined]}>
              {it.val}
            </Text>
            <Text style={s.statKey}>{it.key}</Text>
            {i < items.length - 1 && <View style={s.statDivider} />}
          </View>
        ))}
      </View>
      <View style={[s.devRow, { backgroundColor: devCol + "14" }]}>
        <Ionicons
          name={bedtimeDeviationMin < 30 ? "checkmark-circle" : "alert-circle"}
          size={13}
          color={devCol}
        />
        <Text style={[s.devTx, { color: devCol }]}>
          {bedtimeDeviationMin < 30
            ? `Gleichmäßiger Schlafrhythmus · ±${bedtimeDeviationMin} Min`
            : `Unregelmäßig · ±${bedtimeDeviationMin} Min Abweichung`}
        </Text>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function SleepTab() {
  const stats = useSleepAnalysis(14);
  const [detail, setDetail] = useState<SleepNight | null>(null);

  if (stats.isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.deep} />
        <Text style={s.loadTx}>Schlafdaten laden…</Text>
      </View>
    );
  }

  if (!stats.nights.length) {
    return (
      <ScrollView contentContainerStyle={s.emptyWrap}>
        <View style={[s.emptyIcon, { backgroundColor: C.deepBg }]}>
          <Ionicons name="moon" size={34} color={C.deep} />
        </View>
        <Text style={s.emptyTitle}>Keine Schlafdaten</Text>
        <Text style={s.emptyDesc}>
          Schlaf-Tracking in der Apple Health App aktivieren – die Watch
          zeichnet automatisch auf.
        </Text>
        {stats.debugLines.length > 0 && (
          <View style={s.debugBox}>
            {stats.debugLines.map((l, i) => (
              <Text key={i} style={s.debugTx}>
                {l}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {stats.nights.length >= 2 && (
          <SleepDurationChart nights={stats.nights} />
        )}
        {stats.nights.length >= 3 && <StatsBanner stats={stats} />}

        <View style={s.listCard}>
          <Label>Letzte {stats.nights.length} Nächte</Label>
          {stats.nights.map((n, i) => (
            <NightRow
              key={i}
              night={n}
              onPress={() => setDetail(n)}
              showBorder={i < stats.nights.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      {detail && (
        <NightDetailModal night={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}

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
  statsRow: { flexDirection: "row", paddingBottom: 12 },
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
  devRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  devTx: { fontSize: 12, fontWeight: "600" },

  listCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    gap: 12,
  },

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

  debugBox: {
    width: "100%",
    padding: 11,
    backgroundColor: "#fefce8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde047",
    gap: 2,
  },
  debugTx: {
    fontSize: 10,
    color: "#713f12",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
