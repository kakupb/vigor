// components/today/WorkoutSyncBanner.tsx
// Einmaliger Opt-In Banner auf dem Fokus-Tab.
// Wird gezeigt bis der Nutzer Ja oder Nein antwortet.
// Danach: bei "Ja" werden alle zukünftigen Workouts automatisch in den Planner eingetragen.
//
// Warum nicht im Onboarding: zu viel Friction bei bereits 6 Slides.
// Hier ist es kontextuell, nicht-blockierend und jederzeit sichtbar.

import { useWorkoutHistory } from "@/hooks/useHealthData";
import { usePlannerStore } from "@/store/plannerStore";
import { dateToLocalString } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PREF_KEY = "workout_sync_answered_v1";
const SYNCED_IDS_KEY = "workout_synced_ids_v1";

// Öffentlich: kann von anderen Stellen (z.B. app.useEffect) aufgerufen werden
// um neue Workouts beim App-Start automatisch zu synchronisieren
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

type Props = {
  dark: boolean;
};

export function WorkoutSyncBanner({ dark }: Props) {
  const [answered, setAnswered] = useState<boolean | null>(null); // null = noch nicht geladen
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const addEntry = usePlannerStore((s) => s.addEntry);
  const { workouts, isLoading } = useWorkoutHistory(200);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then((val) => {
      setAnswered(val !== null); // schon beantwortet wenn Wert vorhanden
    });
  }, []);

  async function handleYes() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(PREF_KEY, "yes");
    setAnswered(true);
    setSyncing(true);

    // Vergangene Workouts importieren (die noch nicht synced sind)
    const syncedIds = await getSyncedWorkoutIds();
    const toSync = workouts.filter((w) => !syncedIds.includes(w.id));

    for (const w of toSync) {
      const timeStr = (date: Date) =>
        `${String(date.getHours()).padStart(2, "0")}:${String(
          date.getMinutes()
        ).padStart(2, "0")}`;

      const label =
        w.typeNum === 37 || w.typeNum === 16
          ? "Laufen"
          : w.typeNum === 13 || w.typeNum === 14
          ? "Radfahren"
          : w.typeNum === 20 || w.typeNum === 63
          ? "Krafttraining"
          : w.typeNum === 48
          ? "Yoga"
          : w.typeNum === 52
          ? "Gehen"
          : `Training`;

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
        doneAt: new Date(w.endDate).toISOString(), // Vergangene Workouts = erledigt
      });
      await markWorkoutSynced(w.id);
    }

    setSyncing(false);
    setSyncDone(true);
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
                ? "✓ Synchronisiert"
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
