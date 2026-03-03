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

export const STEP_COUNT = "HKQuantityTypeIdentifierStepCount" as const;
export const HEART_RATE = "HKQuantityTypeIdentifierHeartRate" as const;
export const ACTIVE_ENERGY =
  "HKQuantityTypeIdentifierActiveEnergyBurned" as const;
export const DISTANCE_WALKING =
  "HKQuantityTypeIdentifierDistanceWalkingRunning" as const;
export const BODY_MASS = "HKQuantityTypeIdentifierBodyMass" as const;
export const SLEEP_ANALYSIS = "HKCategoryTypeIdentifierSleepAnalysis" as const;

const SLEEP_ASLEEP_UNSPECIFIED = 0;
const SLEEP_ASLEEP_CORE = 3;
const SLEEP_ASLEEP_DEEP = 4;
const SLEEP_ASLEEP_REM = 5;
export const WORKOUT_TYPE = "HKWorkoutTypeIdentifier" as const;

export const READ_PERMISSIONS = {
  toRead: [
    STEP_COUNT,
    HEART_RATE,
    ACTIVE_ENERGY,
    DISTANCE_WALKING,
    BODY_MASS,
    SLEEP_ANALYSIS,
    WORKOUT_TYPE, // ← NEU
  ],
} as const;

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

function workoutLabel(typeNum: number): string {
  const map: Record<number, string> = {
    37: "Laufen",
    13: "Radfahren",
    14: "Rad indoor", // ← NEU
    16: "Laufen outdoor", // ← NEU
    46: "Schwimmen", // ← war 20, falsch!
    52: "Gehen",
    20: "Krafttraining", // ← war Schwimmen, falsch!
    63: "Krafttraining",
    48: "Yoga",
    82: "Schwimmen Bahn", // ← NEU
    3000: "Sport",
  };
  return map[typeNum] ?? `Training (${typeNum})`; // ← zeigt unbekannte Typen
}

function workoutEmoji(typeNum: number): string {
  const map: Record<number, string> = {
    37: "🏃",
    13: "🚴",
    14: "🚴", // ← NEU indoor cycling
    16: "🏃", // ← NEU outdoor running
    46: "🏊", // ← war bei 20, falsch!
    52: "🚶",
    20: "🏋️", // ← Krafttraining
    63: "🏋️",
    48: "🧘",
    82: "🏊", // ← NEU
    3000: "⚽",
  };
  return map[typeNum] ?? "🏅";
}

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
  return Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
}

export function useHealthValues(): HealthValues {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();

  // Fehler werden von den Hooks intern als unhandled rejections geworfen.
  // Wir fangen sie global für HealthKit Code=5 (Authorization not determined) ab.
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

export type WorkoutHistoryData = WorkoutData & {
  id: string;
  startDate: Date;
  endDate: Date;
  typeNum: number; // ← NEU
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
    if (Platform.OS !== "ios" || !_hk) return;
    if (!isAuthorized) return;

    setIsLoading(true);

    // ✅ Richtige API für @kingstinct/react-native-healthkit
    _hk
      .queryWorkoutSamples({
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        endDate: new Date(),
        limit,
      })
      .then((samples: any[]) => {
        if (!samples || samples.length === 0) {
          setWorkouts([]);
          return;
        }

        const mapped: WorkoutHistoryData[] = samples.map((s: any) => {
          const typeNum =
            typeof s.workoutActivityType === "number"
              ? s.workoutActivityType
              : parseInt(s.workoutActivityType ?? "3000");

          const start = new Date(s.startDate);
          const end = new Date(s.endDate);
          const dur = (end.getTime() - start.getTime()) / 60_000;

          return {
            id: s.uuid ?? String(start.getTime()),
            typeNum, // ← NEU
            activityType: String(typeNum), // Label kommt aus Modal-Map
            durationMin: Math.round(dur),
            calories: Math.round(
              s.totalEnergyBurned?.quantity ?? s.totalEnergyBurnedQuantity ?? 0
            ),
            distanceKm:
              Math.round(
                ((s.totalDistance?.quantity ?? s.totalDistanceQuantity ?? 0) /
                  1000) *
                  10
              ) / 10,
            date: start,
            startDate: start,
            endDate: end,
          };
        });

        setWorkouts(mapped);
      })
      .catch((err: any) => {
        console.log("Workout query error:", err);
        setWorkouts([]);
      })
      .finally(() => setIsLoading(false));
  }, [limit, tick, isAuthorized]);

  return { workouts, isLoading, reload: () => setTick((t) => t + 1) };
}
