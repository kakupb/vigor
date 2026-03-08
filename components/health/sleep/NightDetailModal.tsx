// components/health/sleep/NightDetailModal.tsx
import {
  SleepNight,
  formatSleepDuration,
  formatTime,
} from "@/hooks/useSleepData";
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
import { ChartSection } from "../charts/ChartSection";
import { C, STAGE_META, scoreColor, scoreLabel } from "../healthTokens";
import { Label, PhasesBar, PhysioCard, ScoreCircle } from "../HealthUI";

interface Props {
  night: SleepNight;
  onClose: () => void;
}

export function NightDetailModal({ night, onClose }: Props) {
  const ins = useSafeAreaInsets();

  const totalPhases = Math.max(
    1,
    night.deepMinutes +
      night.coreMinutes +
      night.remMinutes +
      night.awakeMinutes
  );
  const phases = [
    { key: "deep", min: night.deepMinutes },
    { key: "core", min: night.coreMinutes },
    { key: "rem", min: night.remMinutes },
    { key: "awake", min: night.awakeMinutes },
  ].filter((p) => p.min > 0);

  const col = scoreColor(night.sleepScore);
  const hasPhysio =
    night.avgHeartRate > 0 ||
    night.avgHRV > 0 ||
    night.avgRespiratoryRate > 0 ||
    night.avgSpO2 > 0;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingTop: ins.top + 6 }]}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerSpacer} />
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>{night.dateLabel}</Text>
            <Text style={s.headerSub}>Schlafanalyse</Text>
          </View>
          <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={18} color={C.sub} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <View style={s.heroCard}>
            <ScoreCircle score={night.sleepScore} r={44} color={col} />
            <View style={s.heroRight}>
              <Text style={[s.heroLabel, { color: col }]}>
                {scoreLabel(night.sleepScore)}
              </Text>

              <View style={s.timeLine}>
                <Ionicons name="moon" size={14} color={C.deep} />
                <Text style={s.timeVal}>{formatTime(night.bedtime)}</Text>
                <View style={s.timeDash} />
                <Ionicons name="sunny" size={14} color={C.awake} />
                <Text style={s.timeVal}>{formatTime(night.wakeTime)}</Text>
              </View>

              <View style={s.durRow}>
                <Ionicons name="time-outline" size={13} color={C.muted} />
                <Text style={s.durTx}>
                  {formatSleepDuration(night.totalMinutes)} Schlaf
                </Text>
                {night.inBedMinutes > night.totalMinutes && (
                  <>
                    <Text style={s.durSep}>·</Text>
                    <Text style={[s.durTx, { color: C.muted }]}>
                      {formatSleepDuration(night.inBedMinutes)} im Bett
                    </Text>
                  </>
                )}
              </View>

              {night.awakenings > 0 && (
                <View style={s.awakePill}>
                  <Ionicons name="alert-circle" size={12} color={C.awake} />
                  <Text style={s.awakeTx}>{night.awakenings}× aufgewacht</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Schlafphasen ── */}
          {phases.length > 0 && (
            <View style={s.card}>
              <Label>Schlafphasen</Label>
              <PhasesBar night={night} h={14} />
              <View style={s.phasesGrid}>
                {phases.map((p) => {
                  const m = STAGE_META[p.key];
                  if (!m) return null;
                  const pct = Math.round((p.min / totalPhases) * 100);
                  return (
                    <View
                      key={p.key}
                      style={[s.phaseItem, { backgroundColor: m.bg }]}
                    >
                      <View
                        style={[s.phaseDot, { backgroundColor: m.color }]}
                      />
                      <View style={s.phaseRight}>
                        <View style={s.phaseTopRow}>
                          <Text style={[s.phaseKey, { color: m.color }]}>
                            {m.label}
                          </Text>
                          <Text style={[s.phasePct, { color: m.color }]}>
                            {pct}%
                          </Text>
                        </View>
                        <Text style={[s.phaseDur, { color: m.color }]}>
                          {formatSleepDuration(p.min)}
                        </Text>
                        <View style={s.phaseTrack}>
                          <View
                            style={[
                              s.phaseFill,
                              {
                                width: `${pct}%` as any,
                                backgroundColor: m.color + "60",
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Charts ── */}
          <ChartSection night={night} />

          {/* ── Körperwerte Ø ── */}
          {hasPhysio && (
            <View style={s.card}>
              <Label>Körperwerte · Nacht-Ø</Label>
              <View style={s.physioGrid}>
                {night.avgHeartRate > 0 && (
                  <PhysioCard
                    lib="I"
                    icon="heart"
                    color={C.hr}
                    bg={C.hrBg}
                    label="Puls Ø"
                    val={`${night.avgHeartRate}`}
                    unit="bpm"
                    sub={
                      night.minHeartRate > 0
                        ? `Min ${night.minHeartRate} bpm`
                        : undefined
                    }
                  />
                )}
                {night.avgHRV > 0 && (
                  <PhysioCard
                    lib="I"
                    icon="pulse"
                    color={C.hrv}
                    bg={C.hrvBg}
                    label="HRV"
                    val={`${night.avgHRV}`}
                    unit="ms"
                  />
                )}
                {night.avgRespiratoryRate > 0 && (
                  <PhysioCard
                    lib="M"
                    icon="lungs"
                    color={C.rr}
                    bg={C.rrBg}
                    label="Atemrate"
                    val={`${night.avgRespiratoryRate}`}
                    unit="/min"
                  />
                )}
                {night.avgSpO2 > 0 && (
                  <PhysioCard
                    lib="M"
                    icon="water-percent"
                    color={C.spo2}
                    bg={C.spo2Bg}
                    label="SpO₂"
                    val={`${night.avgSpO2}`}
                    unit="%"
                  />
                )}
                {night.wristTempDelta !== 0 && (
                  <PhysioCard
                    lib="M"
                    icon="thermometer"
                    color={C.awake}
                    bg={C.awakeBg}
                    label="Handgelenk"
                    val={`${night.wristTempDelta > 0 ? "+" : ""}${
                      night.wristTempDelta
                    }`}
                    unit="°C"
                  />
                )}
                {night.restingHeartRate > 0 && (
                  <PhysioCard
                    lib="I"
                    icon="heart-outline"
                    color={C.sub}
                    bg={C.bg}
                    label="Ruhepuls"
                    val={`${night.restingHeartRate}`}
                    unit="bpm"
                  />
                )}
              </View>
            </View>
          )}

          {/* Info note */}
          <View style={s.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={C.muted}
            />
            <Text style={s.infoTx}>
              Score 0–100 aus Dauer, Tiefschlaf/REM, Aufwachungen
              {hasPhysio ? ", Puls und HRV" : ""}.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

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
  headerSpacer: { width: 36 },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 11, color: C.muted },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { padding: 16, paddingBottom: 52, gap: 12 },

  // Hero
  heroCard: {
    backgroundColor: C.bg,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroRight: { flex: 1, gap: 8 },
  heroLabel: { fontSize: 15, fontWeight: "700" },
  timeLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeVal: { fontSize: 16, fontWeight: "700", color: C.text },
  timeDash: { flex: 1, height: 1, backgroundColor: C.border },
  durRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  durTx: { fontSize: 12, color: C.sub, fontWeight: "600" },
  durSep: { color: C.muted, fontSize: 12 },
  awakePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.awakeBg,
    borderRadius: 8,
  },
  awakeTx: { fontSize: 11, fontWeight: "600", color: C.awake },

  // Cards
  card: { backgroundColor: C.bg, borderRadius: 18, padding: 16, gap: 12 },
  phasesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  phaseItem: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  phaseDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  phaseRight: { flex: 1 },
  phaseTopRow: { flexDirection: "row", justifyContent: "space-between" },
  phaseKey: { fontSize: 12, fontWeight: "700" },
  phasePct: { fontSize: 11, fontWeight: "600" },
  phaseDur: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  phaseTrack: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  phaseFill: { height: 4, borderRadius: 2 },

  physioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

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
