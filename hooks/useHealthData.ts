// hooks/useHealthData.ts
import { useEffect, useState } from "react";
import { Platform } from "react-native";

// Expo Go Guard: NitroModules wirft beim Import in Expo Go
let _hk: any = null;
try {
  _hk = require("@kingstinct/react-native-healthkit");
} catch {
  // Expo Go: HealthKit nicht verfügbar
}

const useHealthkitAuthorization = _hk?.useHealthkitAuthorization;
const useMostRecentCategorySample = _hk?.useMostRecentCategorySample;
const useMostRecentQuantitySample = _hk?.useMostRecentQuantitySample;
const useStatisticsForQuantity = _hk?.useStatisticsForQuantity;
const useMostRecentWorkout = _hk?.useMostRecentWorkout;
const AuthorizationRequestStatus = _hk?.AuthorizationRequestStatus;

// ─── Quantity type identifiers ────────────────────────────────────────────────
export const STEP_COUNT = "HKQuantityTypeIdentifierStepCount" as const;
export const HEART_RATE = "HKQuantityTypeIdentifierHeartRate" as const;
export const ACTIVE_ENERGY =
  "HKQuantityTypeIdentifierActiveEnergyBurned" as const;
export const DISTANCE_WALKING =
  "HKQuantityTypeIdentifierDistanceWalkingRunning" as const;
export const BODY_MASS = "HKQuantityTypeIdentifierBodyMass" as const;
export const SLEEP_ANALYSIS = "HKCategoryTypeIdentifierSleepAnalysis" as const;
export const WORKOUT_TYPE = "HKWorkoutTypeIdentifier" as const;

// ─── Sleep sensor types (Apple Watch) ─────────────────────────────────────────
// ⚠️  iOS silently returns [] for any type NOT listed in READ_PERMISSIONS.
export const HRV_SDNN =
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN" as const;
export const RESPIRATORY_RATE =
  "HKQuantityTypeIdentifierRespiratoryRate" as const;
export const OXYGEN_SATURATION =
  "HKQuantityTypeIdentifierOxygenSaturation" as const;
export const RESTING_HEART_RATE =
  "HKQuantityTypeIdentifierRestingHeartRate" as const;
export const WRIST_TEMPERATURE =
  "HKQuantityTypeIdentifierAppleSleepingWristTemperature" as const;

const SLEEP_ASLEEP_UNSPECIFIED = 0;
const SLEEP_ASLEEP_CORE = 3;
const SLEEP_ASLEEP_DEEP = 4;
const SLEEP_ASLEEP_REM = 5;

// ─── Permissions ──────────────────────────────────────────────────────────────
export const READ_PERMISSIONS = {
  toRead: [
    // Daily metrics
    STEP_COUNT,
    HEART_RATE,
    ACTIVE_ENERGY,
    DISTANCE_WALKING,
    BODY_MASS,
    WORKOUT_TYPE,
    // Sleep
    SLEEP_ANALYSIS,
    // Sleep sensor data from Apple Watch
    HRV_SDNN,
    RESPIRATORY_RATE,
    OXYGEN_SATURATION,
    RESTING_HEART_RATE,
    WRIST_TEMPERATURE,
    // Workout sensor data
    "HKQuantityTypeIdentifierRunningSpeed" as const,
    "HKQuantityTypeIdentifierCyclingSpeed" as const,
    "HKQuantityTypeIdentifierCyclingCadence" as const,
    "HKQuantityTypeIdentifierCyclingPower" as const,
    "HKQuantityTypeIdentifierRunningPower" as const,
  ],
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export type WorkoutData = {
  activityType: string;
  durationMin: number;
  calories: number;
  distanceKm: number;
  date: Date;
};

export type HealthValues = {
  steps: number;
  calories: number;
  distanceKm: number;
  heartRate: number;
  weightKg: number;
  sleepHours: number;
  lastWorkout: WorkoutData | null;
};

export type HealthAuth = {
  isAvailable: boolean;
  isAuthorized: boolean;
  requestAuth: () => void;
};

// ─── Workout helpers ──────────────────────────────────────────────────────────
function workoutLabel(typeNum: number): string {
  const map: Record<number, string> = {
    37: "Laufen",
    16: "Laufen outdoor",
    13: "Radfahren",
    14: "Rad indoor",
    46: "Schwimmen",
    82: "Schwimmen Bahn",
    52: "Gehen",
    20: "Krafttraining",
    63: "Krafttraining",
    48: "Yoga",
    57: "HIIT",
    3000: "Sport",
  };
  return map[typeNum] ?? `Training (${typeNum})`;
}

function workoutEmoji(typeNum: number): string {
  const map: Record<number, string> = {
    37: "🏃",
    16: "🏃",
    13: "🚴",
    14: "🚴",
    46: "🏊",
    82: "🏊",
    52: "🚶",
    20: "🏋️",
    63: "🏋️",
    48: "🧘",
    57: "⚡",
    3000: "⚽",
  };
  return map[typeNum] ?? "🏅";
}

// ─── useHealthAuth ────────────────────────────────────────────────────────────
export function useHealthAuth(): HealthAuth {
  if (Platform.OS !== "ios" || !useHealthkitAuthorization) {
    return { isAvailable: false, isAuthorized: false, requestAuth: () => {} };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [authStatus, requestAuth] = useHealthkitAuthorization(READ_PERMISSIONS);
  return {
    isAvailable: true,
    isAuthorized: authStatus === AuthorizationRequestStatus?.unnecessary,
    requestAuth,
  };
}

// ─── useSleepHours (for stats tab summary) ────────────────────────────────────
function useSleepHours(): number {
  if (!useMostRecentCategorySample) return 0;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const lastSleep = useMostRecentCategorySample(SLEEP_ANALYSIS);
  if (!lastSleep) return 0;
  const v = lastSleep.value as number;
  const isAsleep =
    v === SLEEP_ASLEEP_UNSPECIFIED ||
    v === SLEEP_ASLEEP_CORE ||
    v === SLEEP_ASLEEP_DEEP ||
    v === SLEEP_ASLEEP_REM;
  if (!isAsleep) return 0;
  const ms = lastSleep.endDate.getTime() - lastSleep.startDate.getTime();
  return Math.round((ms / (1_000 * 60 * 60)) * 10) / 10;
}

// ─── useHealthValues ──────────────────────────────────────────────────────────
export function useHealthValues(): HealthValues {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();

  const stepsStats = useStatisticsForQuantity?.(
    STEP_COUNT,
    ["cumulativeSum"],
    todayStart,
    now,
    "count"
  );
  const caloriesStats = useStatisticsForQuantity?.(
    ACTIVE_ENERGY,
    ["cumulativeSum"],
    todayStart,
    now,
    "kcal"
  );
  const distanceStats = useStatisticsForQuantity?.(
    DISTANCE_WALKING,
    ["cumulativeSum"],
    todayStart,
    now,
    "km"
  );
  const heartRateSample = useMostRecentQuantitySample?.(HEART_RATE);
  const weightSample = useMostRecentQuantitySample?.(BODY_MASS);
  const sleepHours = useSleepHours();
  const lastWorkoutRaw = useMostRecentWorkout?.();

  let lastWorkout: WorkoutData | null = null;
  if (lastWorkoutRaw) {
    try {
      const typeNum = lastWorkoutRaw.workoutActivityType as unknown as number;
      const dur =
        (lastWorkoutRaw.endDate.getTime() -
          lastWorkoutRaw.startDate.getTime()) /
        60_000;
      lastWorkout = {
        activityType: workoutEmoji(typeNum) + " " + workoutLabel(typeNum),
        durationMin: Math.round(dur),
        calories: Math.round(
          (lastWorkoutRaw as any).totalEnergyBurned?.quantity ?? 0
        ),
        distanceKm:
          Math.round(
            ((lastWorkoutRaw as any).totalDistance?.quantity ?? 0) * 10
          ) / 10,
        date: lastWorkoutRaw.startDate,
      };
    } catch {
      lastWorkout = null;
    }
  }

  return {
    steps: Math.round(stepsStats?.sumQuantity?.quantity ?? 0),
    calories: Math.round(caloriesStats?.sumQuantity?.quantity ?? 0),
    distanceKm:
      Math.round((distanceStats?.sumQuantity?.quantity ?? 0) * 10) / 10,
    heartRate: Math.round(heartRateSample?.quantity ?? 0),
    weightKg: Math.round((weightSample?.quantity ?? 0) * 10) / 10,
    sleepHours,
    lastWorkout,
  };
}

// ─── useWorkoutHistory ────────────────────────────────────────────────────────
export type WorkoutHistoryData = WorkoutData & {
  id: string;
  startDate: Date;
  endDate: Date;
  typeNum: number;
};

export function useWorkoutHistory(limit = 50): {
  workouts: WorkoutHistoryData[];
  isLoading: boolean;
  reload: () => void;
} {
  const [workouts, setWorkouts] = useState<WorkoutHistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const { isAuthorized } = useHealthAuth();

  useEffect(() => {
    if (Platform.OS !== "ios" || !_hk || !isAuthorized) return;
    setIsLoading(true);

    _hk
      .queryWorkoutSamples({
        startDate: new Date(Date.now() - 1_000 * 60 * 60 * 24 * 365),
        endDate: new Date(),
        limit,
      })
      .then((samples: any[]) => {
        if (!samples?.length) {
          setWorkouts([]);
          return;
        }
        const mapped: WorkoutHistoryData[] = samples.map((s: any) => {
          const typeNum =
            typeof s.workoutActivityType === "number"
              ? s.workoutActivityType
              : parseInt(s.workoutActivityType ?? "0", 10);
          const dur =
            (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) /
            60_000;
          return {
            id: s.uuid ?? String(Math.random()),
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            typeNum,
            activityType: workoutEmoji(typeNum) + " " + workoutLabel(typeNum),
            durationMin: Math.round(dur),
            calories: Math.round(s.totalEnergyBurned?.quantity ?? 0),
            distanceKm: Math.round((s.totalDistance?.quantity ?? 0) * 10) / 10,
            date: new Date(s.startDate),
          };
        });
        mapped.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        setWorkouts(mapped);
      })
      .catch(() => setWorkouts([]))
      .finally(() => setIsLoading(false));
  }, [isAuthorized, tick, limit]);

  return { workouts, isLoading, reload: () => setTick((t) => t + 1) };
}
