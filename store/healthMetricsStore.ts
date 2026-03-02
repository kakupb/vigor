// store/healthMetricsStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type MetricId =
  | "steps"
  | "calories"
  | "distance"
  | "heartRate"
  | "sleep"
  | "weight";

export type MetricConfig = {
  id: MetricId;
  emoji: string;
  label: string;
  color: string;
  bg: string;
  unit: string;
  goalDefault: number;
  goalLabel: string;
};

// Alle verfügbaren Metriken mit Metadaten
export const ALL_METRICS: MetricConfig[] = [
  {
    id: "steps",
    emoji: "👣",
    label: "Schritte",
    color: "#3b8995",
    bg: "#f0fbfc",
    unit: "Schritte",
    goalDefault: 10_000,
    goalLabel: "10.000 Schritte",
  },
  {
    id: "calories",
    emoji: "🔥",
    label: "Kalorien",
    color: "#f59e0b",
    bg: "#fffbeb",
    unit: "kcal",
    goalDefault: 500,
    goalLabel: "500 kcal",
  },
  {
    id: "distance",
    emoji: "🏃",
    label: "Distanz",
    color: "#10b981",
    bg: "#f0fdf4",
    unit: "km",
    goalDefault: 8,
    goalLabel: "8 km",
  },
  {
    id: "heartRate",
    emoji: "❤️",
    label: "Herzrate",
    color: "#ef4444",
    bg: "#fef2f2",
    unit: "bpm",
    goalDefault: 0,
    goalLabel: "",
  },
  {
    id: "sleep",
    emoji: "🌙",
    label: "Schlaf",
    color: "#8b5cf6",
    bg: "#faf5ff",
    unit: "h",
    goalDefault: 8,
    goalLabel: "8h",
  },
  {
    id: "weight",
    emoji: "⚖️",
    label: "Gewicht",
    color: "#64748b",
    bg: "#f8fafc",
    unit: "kg",
    goalDefault: 0,
    goalLabel: "",
  },
];

type HealthMetricsStore = {
  enabledMetrics: MetricId[];
  goals: Partial<Record<MetricId, number>>;
  toggleMetric: (id: MetricId) => void;
  setGoal: (id: MetricId, value: number) => void;
  isEnabled: (id: MetricId) => boolean;
};

export const useHealthMetricsStore = create<HealthMetricsStore>()(
  persist(
    (set, get) => ({
      // Default: Schritte, Kalorien, Distanz eingeschaltet
      enabledMetrics: ["steps", "calories", "distance"],
      goals: {},

      toggleMetric: (id) => {
        const current = get().enabledMetrics;
        const next = current.includes(id)
          ? current.filter((m) => m !== id)
          : [...current, id];
        set({ enabledMetrics: next });
      },

      setGoal: (id, value) => {
        set({ goals: { ...get().goals, [id]: value } });
      },

      isEnabled: (id) => get().enabledMetrics.includes(id),
    }),
    {
      name: "health-metrics-config",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
