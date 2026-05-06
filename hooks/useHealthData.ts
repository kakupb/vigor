// hooks/useHealthData.ts
import { useEffect, useState } from "react";
import { Platform } from "react-native";

let RNHealth: any = null;
let _healthError: any = null;
try {
  const mod = require("react-native-health");
  RNHealth = mod.default ?? mod;
  if (!RNHealth?.initHealthKit) RNHealth = null;
} catch (e) {
  _healthError = e; // ← Fehler festhalten statt still ignorieren
}

// Temporär:
console.log("[Health] RNHealth:", !!RNHealth);
console.log("[Health] Error:", _healthError);

// ─── Permissions ──────────────────────────────────────────────────────────────
const PERMISSIONS = {
  permissions: {
    read: [
      "StepCount",
      "ActiveEnergyBurned",
      "DistanceWalkingRunning",
      "HeartRate",
      "RestingHeartRate",
      "BodyMass",
      "SleepAnalysis",
      "HeartRateVariabilitySDNN",
      "RespiratoryRate",
      "OxygenSaturation",
      "Workout",
      "RunningSpeed",
      "CyclingSpeed",
      "CyclingCadence",
      "CyclingPower",
      "RunningPower",
    ],
    write: [],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type WorkoutData = {
  activityType: string;
  typeNum: number;
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

export type WorkoutHistoryData = WorkoutData & {
  id: string;
  startDate: Date;
  endDate: Date;
  typeNum: number;
};

// ─── Workout label map ────────────────────────────────────────────────────────
export function workoutLabel(typeNum: number): string {
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

// ─── Activity type string → number ───────────────────────────────────────────
function activityTypeToNum(type: string): number {
  const map: Record<string, number> = {
    Running: 37,
    Cycling: 13,
    Swimming: 46,
    Walking: 52,
    FunctionalStrengthTraining: 20,
    TraditionalStrengthTraining: 63,
    Yoga: 48,
    HighIntensityIntervalTraining: 57,
  };
  return map[type] ?? 3000;
}

// ─── Auth state ───────────────────────────────────────────────────────────────
let _authorized = false;
let _authListeners: Array<(auth: boolean) => void> = [];

function notifyAuth(v: boolean) {
  _authorized = v;
  _authListeners.forEach((fn) => fn(v));
}

function requestHealthAuth() {
  if (Platform.OS !== "ios" || !RNHealth) return;
  RNHealth.initHealthKit(PERMISSIONS, (err: any) => {
    notifyAuth(!err);
  });
}

export function useHealthAuth(): HealthAuth {
  const [authorized, setAuthorized] = useState(_authorized);

  useEffect(() => {
    if (Platform.OS !== "ios" || !RNHealth) return;
    _authListeners.push(setAuthorized);
    // Auto-check on mount
    if (!_authorized) {
      RNHealth.initHealthKit(PERMISSIONS, (err: any) => {
        notifyAuth(!err);
      });
    }
    return () => {
      _authListeners = _authListeners.filter((fn) => fn !== setAuthorized);
    };
  }, []);

  return {
    isAvailable: Platform.OS === "ios" && !!RNHealth,
    isAuthorized: authorized,
    requestAuth: requestHealthAuth,
  };
}

// ─── useHealthValues ──────────────────────────────────────────────────────────
export function useHealthValues(): HealthValues {
  const { isAuthorized } = useHealthAuth();
  const [values, setValues] = useState<HealthValues>({
    steps: 0,
    calories: 0,
    distanceKm: 0,
    heartRate: 0,
    weightKg: 0,
    sleepHours: 0,
    lastWorkout: null,
  });

  useEffect(() => {
    if (!isAuthorized || Platform.OS !== "ios" || !RNHealth) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();
    const opts = {
      startDate: todayStart.toISOString(),
      endDate: now.toISOString(),
    };

    // Steps
    RNHealth.getStepCount(opts, (err: any, r: any) => {
      if (!err) setValues((v) => ({ ...v, steps: Math.round(r?.value ?? 0) }));
    });

    // Calories
    RNHealth.getActiveEnergyBurned(opts, (err: any, r: any[]) => {
      if (!err && r?.length) {
        const total = r.reduce((a: number, s: any) => a + (s.value ?? 0), 0);
        setValues((v) => ({ ...v, calories: Math.round(total) }));
      }
    });

    // Distance
    RNHealth.getDistanceWalkingRunning(opts, (err: any, r: any) => {
      if (!err)
        setValues((v) => ({
          ...v,
          distanceKm: Math.round(((r?.value ?? 0) / 1000) * 10) / 10,
        }));
    });

    // Heart rate (most recent)
    RNHealth.getHeartRateSamples(
      { ...opts, ascending: false, limit: 1 },
      (err: any, r: any[]) => {
        if (!err && r?.length)
          setValues((v) => ({ ...v, heartRate: Math.round(r[0].value) }));
      }
    );

    // Weight (most recent)
    RNHealth.getLatestWeight({ unit: "gram" }, (err: any, r: any) => {
      if (!err && r?.value)
        setValues((v) => ({
          ...v,
          weightKg: Math.round((r.value / 1000) * 10) / 10,
        }));
    });

    // Sleep (last night)
    const sleepStart = new Date(todayStart.getTime() - 12 * 3600 * 1000);
    RNHealth.getSleepSamples(
      { startDate: sleepStart.toISOString(), endDate: now.toISOString() },
      (err: any, r: any[]) => {
        if (!err && r?.length) {
          const asleep = r.filter((s: any) =>
            [
              "ASLEEP",
              "ASLEEP_CORE",
              "ASLEEP_DEEP",
              "ASLEEP_REM",
              "ASLEEP_UNSPECIFIED",
            ].includes(s.value)
          );
          const totalMs = asleep.reduce(
            (a: number, s: any) =>
              a +
              (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()),
            0
          );
          setValues((v) => ({
            ...v,
            sleepHours: Math.round((totalMs / 3_600_000) * 10) / 10,
          }));
        }
      }
    );

    // Last workout
    RNHealth.getSamples(
      {
        startDate: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
        endDate: now.toISOString(),
        type: "Workout",
        ascending: false,
        limit: 1,
      },
      (err: any, r: any[]) => {
        if (!err && r?.length) {
          const w = r[0];
          const typeNum = activityTypeToNum(w.activityType ?? "");
          const dur =
            (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60_000;
          setValues((v) => ({
            ...v,
            lastWorkout: {
              activityType: workoutLabel(typeNum),
              typeNum,
              durationMin: Math.round(dur),
              calories: Math.round(w.calories ?? 0),
              distanceKm: Math.round(((w.distance ?? 0) / 1000) * 10) / 10,
              date: new Date(w.start),
            },
          }));
        }
      }
    );
  }, [isAuthorized]);

  return values;
}

// ─── useWorkoutHistory ────────────────────────────────────────────────────────
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
    if (!isAuthorized || Platform.OS !== "ios" || !RNHealth) return;
    setIsLoading(true);

    RNHealth.getSamples(
      {
        startDate: new Date(Date.now() - 365 * 86_400_000).toISOString(),
        endDate: new Date().toISOString(),
        type: "Workout",
        ascending: false,
        limit,
      },
      (err: any, r: any[]) => {
        setIsLoading(false);
        if (err || !r?.length) {
          setWorkouts([]);
          return;
        }

        const mapped: WorkoutHistoryData[] = r.map((w: any) => {
          const typeNum = activityTypeToNum(w.activityType ?? "");
          const startDate = new Date(w.start);
          const endDate = new Date(w.end);
          const dur = (endDate.getTime() - startDate.getTime()) / 60_000;
          return {
            id: w.id ?? `${w.start}-${typeNum}`,
            activityType: workoutLabel(typeNum),
            typeNum,
            durationMin: Math.round(dur),
            calories: Math.round(w.calories ?? 0),
            distanceKm: Math.round(((w.distance ?? 0) / 1000) * 10) / 10,
            date: startDate,
            startDate,
            endDate,
          };
        });
        setWorkouts(mapped);
      }
    );
  }, [isAuthorized, tick, limit]);

  return { workouts, isLoading, reload: () => setTick((t) => t + 1) };
}
