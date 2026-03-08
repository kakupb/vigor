// store/healthMetricsStore.ts
// Nutzer-Konfiguration für Health-Metriken — in Supabase gespeichert.
// HealthKit-Rohdaten bleiben IMMER lokal auf dem Gerät (Apple-Richtlinie).
import { syncLoadSingle, syncUpsertSingle } from "@/lib/sync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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

const LOCAL_KEY = "health-metrics-config-v2";

type HealthMetricsStore = {
  enabledMetrics: MetricId[];
  goals: Partial<Record<MetricId, number>>;
  toggleMetric: (id: MetricId) => void;
  setGoal: (id: MetricId, value: number) => void;
  isEnabled: (id: MetricId) => boolean;
  load: () => Promise<void>;
};

async function persist(
  enabledMetrics: MetricId[],
  goals: Partial<Record<MetricId, number>>
) {
  const data = { enabled_metrics: enabledMetrics, goals };
  // Lokal
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  // Cloud
  syncUpsertSingle("health_metrics_config", data);
}

export const useHealthMetricsStore = create<HealthMetricsStore>((set, get) => ({
  enabledMetrics: ["steps", "calories", "distance"],
  goals: {},

  toggleMetric: (id) => {
    const current = get().enabledMetrics;
    const next = current.includes(id)
      ? current.filter((m) => m !== id)
      : [...current, id];
    set({ enabledMetrics: next });
    persist(next, get().goals);
  },

  setGoal: (id, value) => {
    const goals = { ...get().goals, [id]: value };
    set({ goals });
    persist(get().enabledMetrics, goals);
  },

  isEnabled: (id) => get().enabledMetrics.includes(id),

  load: async () => {
    // 1. Cloud
    const cloud = await syncLoadSingle("health_metrics_config", (r) => ({
      enabledMetrics: r.enabled_metrics,
      goals: r.goals,
    }));

    if (cloud) {
      set({
        enabledMetrics: cloud.enabledMetrics ?? [
          "steps",
          "calories",
          "distance",
        ],
        goals: cloud.goals ?? {},
      });
      return;
    }

    // 2. Lokal
    try {
      const raw = await AsyncStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          enabledMetrics: parsed.enabled_metrics ?? [
            "steps",
            "calories",
            "distance",
          ],
          goals: parsed.goals ?? {},
        });
        // Zu Cloud migrieren
        syncUpsertSingle("health_metrics_config", parsed);
      }
    } catch {}
  },
}));
