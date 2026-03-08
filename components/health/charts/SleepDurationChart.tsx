// components/health/charts/SleepDurationChart.tsx
// Bar chart showing sleep duration for the last 7 nights.
// Each bar has a coloured score bubble on top.
// X axis: ONE row of day abbreviations only.
import { SleepNight } from "@/hooks/useSleepData";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { C, scoreColor } from "../healthTokens";
import { Label } from "../HealthUI";

const SW = Dimensions.get("window").width;
const PAD = { top: 20, right: 8, bottom: 24, left: 28 };
const H = 100; // chart area height (excluding padding)

interface Props {
  nights: SleepNight[];
}

export function SleepDurationChart({ nights }: Props) {
  const last7 = [...nights]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-7);

  const chartW = SW - 64;
  const W = chartW - PAD.left - PAD.right;
  const maxM = Math.max(...last7.map((n) => n.totalMinutes), 9 * 60);
  const colW = W / last7.length;
  const barW = Math.min(colW * 0.52, 28);

  // Guide lines at 4 h / 6 h / 8 h
  const guides = [
    { m: 4 * 60, label: "4h" },
    { m: 6 * 60, label: "6h" },
    { m: 8 * 60, label: "8h" },
  ];

  return (
    <View style={s.card}>
      <Label>Schlafdauer · 7 Tage</Label>
      <Svg width={chartW} height={H + PAD.top + PAD.bottom}>
        <Defs>
          <LinearGradient id="slpGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.deep} stopOpacity={0.85} />
            <Stop offset="1" stopColor={C.rem} stopOpacity={0.5} />
          </LinearGradient>
        </Defs>

        {/* Guide lines + left labels */}
        {guides.map(({ m, label }) => {
          const y = PAD.top + H - (m / maxM) * H;
          return (
            <React.Fragment key={label}>
              <Line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + W}
                y2={y}
                stroke={C.border}
                strokeWidth={0.7}
                strokeDasharray="3,5"
              />
              <SvgText
                x={PAD.left - 5}
                y={y + 3.5}
                fontSize={8}
                fill={C.muted}
                textAnchor="end"
              >
                {label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Bars */}
        {last7.map((n, i) => {
          const barH = Math.max(4, (n.totalMinutes / maxM) * H);
          const cx = PAD.left + i * colW + colW / 2;
          const x = cx - barW / 2;
          const y = PAD.top + H - barH;
          const col = scoreColor(n.sleepScore);
          const isLast = i === last7.length - 1;

          // Short weekday only — e.g. "Mo"
          const dayLabel = n.dateLabel.split(",")[0].slice(0, 2);

          return (
            <React.Fragment key={i}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={5}
                ry={5}
                fill={isLast ? "url(#slpGrad)" : col + "70"}
              />

              {/* Score bubble above bar */}
              <Circle cx={cx} cy={y - 9} r={7} fill={col} />
              <SvgText
                x={cx}
                y={y - 5.5}
                fontSize={7.5}
                fill="white"
                textAnchor="middle"
                fontWeight="bold"
              >
                {n.sleepScore}
              </SvgText>

              {/* X label: day abbreviation ONLY, one row */}
              <SvgText
                x={cx}
                y={H + PAD.top + PAD.bottom - 4}
                fontSize={9}
                textAnchor="middle"
                fill={isLast ? C.deep : C.muted}
                fontWeight={isLast ? "bold" : "normal"}
              >
                {dayLabel}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    gap: 10,
  },
});
