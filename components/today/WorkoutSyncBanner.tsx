// components/today/WorkoutSyncBanner.tsx
// Einmaliger Opt-In Banner auf dem Fokus-Tab.
// Wird gezeigt bis der Nutzer Ja oder Nein antwortet.
// Danach: bei "Ja" werden alle zukünftigen Workouts automatisch in den Planner eingetragen.
//
// FIX: Auth wird vor dem Sync angefordert — vorher war workouts leer
// weil HealthKit noch nicht autorisiert war wenn der User "Ja" drückt.

import { useHealthAuth, useWorkoutHistory } from "@/hooks/useHealthData";
import { usePlannerStore } from "@/store/plannerStore";
import { dateToLocalString } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PREF_KEY = "workout_sync_answered_v1";
const SYNCED_IDS_KEY = "workout_synced_ids_v1";

// ─── Öffentliche Hilfsfunktionen ──────────────────────────────────────────────
export async function isWorkoutSyncEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PREF_KEY);
    return val === "yes";
  } catch {
    return false;
  }
}

export async function getSyncedWorkoutIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNCED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markWorkoutSynced(id: string): Promise<void> {
  const existing = await getSyncedWorkoutIds();
  if (existing.includes(id)) return;
  await AsyncStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...existing, id]));
}

// ─── Workout-Label-Mapping ────────────────────────────────────────────────────
function getWorkoutLabel(typeNum: number): string {
  const map: Record<number, string> = {
    37: "Laufen",
    16: "Laufen",
    13: "Radfahren",
    14: "Radfahren",
    20: "Krafttraining",
    63: "Krafttraining",
    48: "Yoga",
    57: "HIIT",
    52: "Gehen",
    46: "Schwimmen",
    82: "Schwimmen",
  };
  return map[typeNum] ?? "Training";
}

type Props = { dark: boolean };

export function WorkoutSyncBanner({ dark }: Props) {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncCount, setSyncCount] = useState(0);

  const addEntry = usePlannerStore((s) => s.addEntry);
  const { isAvailable, isAuthorized, requestAuth } = useHealthAuth();

  // reload() erlaubt es uns Workouts nach Auth-Anfrage neu zu laden
  const { workouts, isLoading, reload } = useWorkoutHistory(200);

  // Wenn Auth erteilt wird → sofort Workouts neu laden
  const prevAuthorized = useRef(isAuthorized);
  useEffect(() => {
    if (!prevAuthorized.current && isAuthorized) {
      reload();
    }
    prevAuthorized.current = isAuthorized;
  }, [isAuthorized]);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then((val) => {
      setAnswered(val !== null);
    });
  }, []);

  // Sobald Workouts geladen sind UND wir gerade syncing → Einträge anlegen
  const pendingSyncRef = useRef(false);
  useEffect(() => {
    if (!pendingSyncRef.current) return;
    if (isLoading) return;
    doSync();
  }, [workouts, isLoading]);

  async function doSync() {
    pendingSyncRef.current = false;
    const syncedIds = await getSyncedWorkoutIds();
    const toSync = workouts.filter((w) => !syncedIds.includes(w.id));

    let count = 0;
    for (const w of toSync) {
      const timeStr = (date: Date) =>
        `${String(date.getHours()).padStart(2, "0")}:${String(
          date.getMinutes()
        ).padStart(2, "0")}`;

      const label = getWorkoutLabel(w.typeNum);

      addEntry({
        title: `🏋️ ${label}`,
        date: dateToLocalString(w.date),
        startTime: timeStr(w.startDate),
        endTime: timeStr(w.endDate),
        durationMinute: w.durationMin,
        category: "fitness",
        note: [
          w.durationMin > 0 ? `${w.durationMin} Min` : "",
          w.calories > 0 ? `${w.calories} kcal` : "",
          w.distanceKm > 0 ? `${w.distanceKm} km` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        doneAt: new Date(w.endDate).toISOString(),
      });
      await markWorkoutSynced(w.id);
      count++;
    }

    setSyncCount(count);
    setSyncing(false);
    setSyncDone(true);
  }

  async function handleYes() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(PREF_KEY, "yes");
    setAnswered(true);
    setSyncing(true);

    // Noch nicht autorisiert → Auth anfordern
    // useEffect oben beobachtet isAuthorized → reload() → doSync()
    if (isAvailable && !isAuthorized) {
      pendingSyncRef.current = true;
      requestAuth();
      return;
    }

    // Bereits autorisiert aber Workouts noch nicht geladen
    if (workouts.length === 0 && !isLoading) {
      pendingSyncRef.current = true;
      reload();
      return;
    }

    // Alles bereit → direkt sync
    await doSync();
  }

  async function handleNo() {
    Haptics.selectionAsync();
    await AsyncStorage.setItem(PREF_KEY, "no");
    setAnswered(true);
  }

  // Nicht anzeigen wenn: noch laden, schon beantwortet
  if (answered !== false || isLoading) return null;

  return (
    <View
      style={[
        b.container,
        {
          backgroundColor: dark ? "#0c1f3a" : "#eff6ff",
          borderColor: dark ? "#1e40af" : "#bfdbfe",
        },
      ]}
    >
      <View style={b.iconWrap}>
        <Ionicons name="barbell-outline" size={20} color="#3b82f6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[b.title, { color: dark ? "#93c5fd" : "#1e40af" }]}>
          Trainings in Planner?
        </Text>
        <Text style={[b.sub, { color: dark ? "#475569" : "#64748b" }]}>
          Apple-Health-Workouts automatisch als Planner-Einträge speichern.
        </Text>
        <View style={b.btnRow}>
          <Pressable
            onPress={handleYes}
            style={[b.btnYes, syncing && { opacity: 0.6 }]}
            disabled={syncing}
          >
            <Text style={b.btnYesTx}>
              {syncing
                ? "Synchronisiere…"
                : syncDone
                ? syncCount > 0
                  ? `✓ ${syncCount} Trainings importiert`
                  : "✓ Synchronisiert"
                : "Ja, synchronisieren"}
            </Text>
          </Pressable>
          <Pressable onPress={handleNo} style={b.btnNo}>
            <Text style={[b.btnNoTx, { color: dark ? "#475569" : "#94a3b8" }]}>
              Nein danke
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  sub: { fontSize: 12, lineHeight: 17 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  btnYes: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnYesTx: { color: "#fff", fontSize: 13, fontWeight: "700" },
  btnNo: { paddingHorizontal: 10, paddingVertical: 8 },
  btnNoTx: { fontSize: 13, fontWeight: "500" },
});
