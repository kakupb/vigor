// hooks/useWorkoutDetail.ts
import { useEffect, useState } from "react";
import { Platform } from "react-native";

let RNHealth: any = null;
try {
  RNHealth = require("react-native-health").default;
} catch {}

// ─── HK Identifiers (für Kompatibilität mit UI-Komponenten) ──────────────────
export const WD_HEART_RATE = "HeartRate";
export const WD_RUNNING_SPEED = "RunningSpeed";
export const WD_CYCLING_SPEED = "CyclingSpeed";
export const WD_CYCLING_CADENCE = "CyclingCadence";
export const WD_CYCLING_POWER = "CyclingPower";
export const WD_RUNNING_POWER = "RunningPower";
export const WD_STEP_COUNT = "StepCount";
export const WD_ACTIVE_ENERGY = "ActiveEnergyBurned";

// ─── Types ────────────────────────────────────────────────────────────────────
export type WDSample = { t: number; v: number };

export type WorkoutMetrics = {
  hrSeries: WDSample[];
  speedSeries: WDSample[];
  cadenceSeries: WDSample[];
  powerSeries: WDSample[];
  isLoading: boolean;
};

// ─── Sport categories ─────────────────────────────────────────────────────────
export type SportCategory =
  | "running"
  | "cycling"
  | "swimming"
  | "strength"
  | "other";

export function getSportCategory(typeNum: number): SportCategory {
  if ([37, 16, 52].includes(typeNum)) return "running";
  if ([13, 14].includes(typeNum)) return "cycling";
  if ([46, 82].includes(typeNum)) return "swimming";
  if ([20, 63, 48, 57].includes(typeNum)) return "strength";
  return "other";
}

// ─── Helper: query a quantity type ───────────────────────────────────────────
async function querySamples(
  type: string,
  start: Date,
  end: Date
): Promise<{ value: number; startDate: Date }[]> {
  if (!RNHealth) return [];
  return new Promise((resolve) => {
    RNHealth.getSamples(
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        type,
        ascending: true,
      },
      (err: any, r: any[]) => {
        if (err || !r?.length) {
          resolve([]);
          return;
        }
        resolve(
          r
            .map((s: any) => ({
              value: s.value ?? 0,
              startDate: new Date(s.startDate ?? s.start),
            }))
            .filter((s) => s.value > 0)
        );
      }
    );
  });
}

function toSeries(
  samples: { value: number; startDate: Date }[],
  startMs: number
): WDSample[] {
  return samples
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((s) => ({ t: (s.startDate.getTime() - startMs) / 1_000, v: s.value }))
    .filter((s) => s.v > 0);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWorkoutDetail(
  startDate: Date | null,
  endDate: Date | null,
  typeNum: number
): WorkoutMetrics {
  const [metrics, setMetrics] = useState<WorkoutMetrics>({
    hrSeries: [],
    speedSeries: [],
    cadenceSeries: [],
    powerSeries: [],
    isLoading: false,
  });

  useEffect(() => {
    if (!startDate || !endDate || Platform.OS !== "ios" || !RNHealth) return;

    const cat = getSportCategory(typeNum);
    setMetrics((m) => ({ ...m, isLoading: true }));
    const startMs = startDate.getTime();

    const isCycling = cat === "cycling";
    const isRunning = cat === "running";

    Promise.all([
      querySamples("HeartRate", startDate, endDate),
      isRunning
        ? querySamples("RunningSpeed", startDate, endDate)
        : isCycling
        ? querySamples("CyclingSpeed", startDate, endDate)
        : Promise.resolve([]),
      isCycling
        ? querySamples("CyclingCadence", startDate, endDate)
        : Promise.resolve([]),
      isCycling
        ? querySamples("CyclingPower", startDate, endDate)
        : isRunning
        ? querySamples("RunningPower", startDate, endDate)
        : Promise.resolve([]),
    ]).then(([hr, speed, cadence, power]) => {
      setMetrics({
        hrSeries: toSeries(hr, startMs),
        speedSeries: toSeries(speed, startMs),
        cadenceSeries: toSeries(cadence, startMs),
        powerSeries: toSeries(power, startMs),
        isLoading: false,
      });
    });
  }, [startDate?.getTime(), endDate?.getTime(), typeNum]);

  return metrics;
}
