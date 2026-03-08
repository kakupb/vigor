// components/health/sleep/NightRow.tsx
import {
  SleepNight,
  formatSleepDuration,
  formatTime,
} from "@/hooks/useSleepData";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, scoreColor } from "../healthTokens";
import { PhasesBar, ScoreCircle, Tag } from "../HealthUI";

interface Props {
  night: SleepNight;
  onPress: () => void;
  showBorder: boolean;
}

export function NightRow({ night, onPress, showBorder }: Props) {
  const col = scoreColor(night.sleepScore);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        showBorder && s.rowBorder,
        pressed && s.pressed,
      ]}
    >
      <ScoreCircle score={night.sleepScore} r={23} color={col} />

      <View style={s.content}>
        <View style={s.topLine}>
          <Text style={s.date}>{night.dateLabel}</Text>
          <Text style={[s.dur, { color: C.deep }]}>
            {formatSleepDuration(night.totalMinutes)}
          </Text>
        </View>

        <PhasesBar night={night} h={6} />

        <View style={s.tagRow}>
          {night.deepMinutes > 0 && (
            <Tag
              color={C.deep}
              bg={C.deepBg}
              lib="I"
              icon="moon"
              label={formatSleepDuration(night.deepMinutes)}
            />
          )}
          {night.remMinutes > 0 && (
            <Tag
              color={C.rem}
              bg={C.remBg}
              lib="I"
              icon="eye-outline"
              label={formatSleepDuration(night.remMinutes)}
            />
          )}
          {night.awakenings > 0 && (
            <Tag
              color={C.awake}
              bg={C.awakeBg}
              lib="I"
              icon="alert-circle-outline"
              label={`${night.awakenings}×`}
            />
          )}
          {night.avgHeartRate > 0 && (
            <Tag
              color={C.hr}
              bg={C.hrBg}
              lib="I"
              icon="heart"
              label={`${night.avgHeartRate}`}
            />
          )}
          {night.avgHRV > 0 && (
            <Tag
              color={C.hrv}
              bg={C.hrvBg}
              lib="I"
              icon="pulse"
              label={`${night.avgHRV}ms`}
            />
          )}
        </View>
      </View>

      <View style={s.right}>
        <Text style={s.time}>{formatTime(night.bedtime)}</Text>
        <Ionicons name="arrow-down" size={9} color={C.muted} />
        <Text style={s.time}>{formatTime(night.wakeTime)}</Text>
        <Ionicons
          name="chevron-forward"
          size={13}
          color={C.muted}
          style={{ marginTop: 2 }}
        />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  pressed: { opacity: 0.65 },
  content: { flex: 1, gap: 5 },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: { fontSize: 13, fontWeight: "600", color: C.text },
  dur: { fontSize: 13, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  right: { alignItems: "center", gap: 2 },
  time: { fontSize: 11, fontWeight: "600", color: C.sub },
});
