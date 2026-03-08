// components/health/charts/LineChart.tsx
import { TSSample } from "@/hooks/useSleepData";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { C } from "../healthTokens";

export interface LineChartProps {
  data: TSSample[];
  width: number;
  height?: number;
  color: string;
  gradientId: string;
  formatY?: (v: number) => string;
  /** If provided, labels shown on X axis. Supply 3–5 values. */
  xLabels?: { t: number; label: string }[];
}

const PAD = { top: 20, right: 16, bottom: 28, left: 42 };

export function LineChart({
  data,
  width,
  height = 160,
  color,
  gradientId,
  formatY,
  xLabels,
}: LineChartProps) {
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const computed = useMemo(() => {
    if (data.length < 2) return null;

    const minT = data[0].t;
    const maxT = data[data.length - 1].t;
    const vals = data.map((d) => d.v);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    // Add 10% padding so line doesn't touch top/bottom
    const pad = (rawMax - rawMin) * 0.12 || 2;
    const minV = rawMin - pad;
    const maxV = rawMax + pad;
    const vRange = maxV - minV;
    const tRange = maxT - minT || 1;

    const px = (t: number) => PAD.left + ((t - minT) / tRange) * W;
    const py = (v: number) => PAD.top + H - ((v - minV) / vRange) * H;

    // Smooth cubic bezier
    let linePath = `M ${px(data[0].t).toFixed(1)} ${py(data[0].v).toFixed(1)}`;
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1],
        curr = data[i];
      const cpx = ((px(prev.t) + px(curr.t)) / 2).toFixed(1);
      linePath += ` C ${cpx} ${py(prev.v).toFixed(1)}, ${cpx} ${py(
        curr.v
      ).toFixed(1)}, ${px(curr.t).toFixed(1)} ${py(curr.v).toFixed(1)}`;
    }
    const fillPath =
      linePath +
      ` L ${px(maxT).toFixed(1)} ${(PAD.top + H).toFixed(1)}` +
      ` L ${px(minT).toFixed(1)} ${(PAD.top + H).toFixed(1)} Z`;

    // Y axis: 4 evenly spaced ticks
    const yTicks = Array.from({ length: 4 }, (_, i) => {
      const v = rawMin + (i / 3) * (rawMax - rawMin);
      return { y: py(v), label: formatY ? formatY(v) : String(Math.round(v)) };
    });

    // X ticks: use supplied labels or auto-generate 4
    const resolvedX = xLabels
      ? xLabels.map((l) => ({ x: px(l.t), label: l.label }))
      : Array.from({ length: 4 }, (_, i) => {
          const t = minT + (i / 3) * tRange;
          return { x: px(t), label: `${Math.round(t / 60)}h` };
        });

    return { linePath, fillPath, yTicks, xTicks: resolvedX, minV, maxV };
  }, [data, W, H]);

  if (!computed) {
    return (
      <View
        style={{
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, color: C.muted }}>
          Keine Daten verfügbar
        </Text>
      </View>
    );
  }

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="0.8" stopColor={color} stopOpacity={0.04} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Horizontal grid + Y labels */}
      {computed.yTicks.map((tick, i) => (
        <React.Fragment key={i}>
          <Line
            x1={PAD.left}
            y1={tick.y}
            x2={PAD.left + W}
            y2={tick.y}
            stroke={C.border}
            strokeWidth={0.7}
            strokeDasharray="3,5"
          />
          <SvgText
            x={PAD.left - 6}
            y={tick.y + 3.5}
            fontSize={9}
            fill={C.muted}
            textAnchor="end"
          >
            {tick.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* X labels — ONE row only, at the very bottom */}
      {computed.xTicks.map((tick, i) => (
        <SvgText
          key={i}
          x={tick.x}
          y={height - 5}
          fontSize={9}
          fill={C.muted}
          textAnchor="middle"
        >
          {tick.label}
        </SvgText>
      ))}

      {/* Gradient fill */}
      <Path d={computed.fillPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <Path
        d={computed.linePath}
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
