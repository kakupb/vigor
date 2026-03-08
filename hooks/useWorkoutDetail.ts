// hooks/useWorkoutDetail.ts
// Fetches time-series sensor data for a single workout session.
// Returns sport-specific metrics as TSSample[] arrays.
import { useEffect, useState } from "react";
import { Platform } from "react-native";

let _hk: any = null;
try {
  _hk = require("@kingstinct/react-native-healthkit");
} catch {}

// ─── HK Identifiers ───────────────────────────────────────────────────────────
export const WD_HEART_RATE = "HKQuantityTypeIdentifierHeartRate" as const;
export const WD_RUNNING_SPEED = "HKQuantityTypeIdentifierRunningSpeed" as const;
export const WD_CYCLING_SPEED = "HKQuantityTypeIdentifierCyclingSpeed" as const;
export const WD_CYCLING_CADENCE =
  "HKQuantityTypeIdentifierCyclingCadence" as const;
export const WD_CYCLING_POWER = "HKQuantityTypeIdentifierCyclingPower" as const;
export const WD_RUNNING_POWER = "HKQuantityTypeIdentifierRunningPower" as const;
export const WD_STEP_COUNT = "HKQuantityTypeIdentifierStepCount" as const;
export const WD_ACTIVE_ENERGY =
  "HKQuantityTypeIdentifierActiveEnergyBurned" as const;

// Permissions needed for workout detail view
export const WORKOUT_DETAIL_PERMISSIONS = [
  WD_HEART_RATE,
  WD_RUNNING_SPEED,
  WD_CYCLING_SPEED,
  WD_CYCLING_CADENCE,
  WD_CYCLING_POWER,
  WD_RUNNING_POWER,
];

// ─── Types ────────────────────────────────────────────────────────────────────
export type WDSample = { t: number; v: number }; // t = seconds from workout start

export type WorkoutMetrics = {
  hrSeries: WDSample[];
  speedSeries: WDSample[]; // m/s → converted to km/h or min/km depending on sport
  cadenceSeries: WDSample[]; // rpm (cycling) or spm (running approximation)
  powerSeries: WDSample[]; // watts
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function queryMetric(
  id: string,
  start: Date,
  end: Date,
  units: string[]
): Promise<{ value: number; startDate: Date }[]> {
  const hk = _hk?.default ?? _hk;
  const fn = hk?.queryQuantitySamples;
  if (!fn) return [];

  const toVal = (s: any): number => {
    if (typeof s.quantity === "number") return s.quantity;
    if (typeof s.quantity?.quantity === "number") return s.quantity.quantity;
    if (typeof s.value === "number") return s.value;
    return 0;
  };

  for (const unit of units) {
    for (const params of [
      { from: start, to: end, unit },
      { startDate: start, endDate: end, unit },
    ]) {
      try {
        const r = await fn.call(hk, id, params);
        if (Array.isArray(r) && r.length > 0) {
          return r
            .map((s: any) => ({
              value: toVal(s),
              startDate: new Date(s.startDate),
            }))
            .filter((s) => s.value > 0);
        }
      } catch {}
    }
  }
  return [];
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
    if (!startDate || !endDate || Platform.OS !== "ios") return;
    const hk = _hk?.default ?? _hk;
    if (!hk) return;

    const cat = getSportCategory(typeNum);
    setMetrics((m) => ({ ...m, isLoading: true }));

    const startMs = startDate.getTime();

    const isCycling = cat === "cycling";
    const isRunning = cat === "running";

    Promise.all([
      // HR — always
      queryMetric(WD_HEART_RATE, startDate, endDate, ["count/min", "bpm"]),
      // Speed — running or cycling
      isRunning
        ? queryMetric(WD_RUNNING_SPEED, startDate, endDate, ["m/s", "km/hr"])
        : isCycling
        ? queryMetric(WD_CYCLING_SPEED, startDate, endDate, ["m/s", "km/hr"])
        : Promise.resolve([]),
      // Cadence — cycling only (running cadence isn't a HealthKit quantity type)
      isCycling
        ? queryMetric(WD_CYCLING_CADENCE, startDate, endDate, ["count/min"])
        : Promise.resolve([]),
      // Power
      isCycling
        ? queryMetric(WD_CYCLING_POWER, startDate, endDate, ["W"])
        : isRunning
        ? queryMetric(WD_RUNNING_POWER, startDate, endDate, ["W"])
        : Promise.resolve([]),
    ])
      .then(([hrRaw, speedRaw, cadenceRaw, powerRaw]) => {
        const hrSeries = toSeries(hrRaw, startMs);
        const speedRawSeries = toSeries(speedRaw, startMs);
        const cadenceSeries = toSeries(cadenceRaw, startMs);
        const powerSeries = toSeries(powerRaw, startMs);

        // Convert speed: m/s → km/h for cycling, min/km for running
        const speedSeries = speedRawSeries
          .map((s) => ({
            t: s.t,
            v: isRunning
              ? s.v > 0
                ? 1000 / (s.v * 60)
                : 0 // m/s → min/km
              : s.v * 3.6, // m/s → km/h
          }))
          .filter((s) => s.v > 0 && s.v < (isRunning ? 30 : 120)); // sanity filter

        setMetrics({
          hrSeries,
          speedSeries,
          cadenceSeries,
          powerSeries,
          isLoading: false,
        });
      })
      .catch(() => setMetrics((m) => ({ ...m, isLoading: false })));
  }, [startDate?.getTime(), endDate?.getTime(), typeNum]);

  return metrics;
}
