// components/stats/WorkoutHistoryModal.tsx
import { WorkoutHistoryData, useWorkoutHistory } from "@/hooks/useHealthData";
import { useHabitStore } from "@/store/habitStore";
import { useNoteStore } from "@/store/noteStore";
import { usePlannerStore } from "@/store/plannerStore";
import { dateToLocalString } from "@/utils/dateUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── HKWorkoutActivityType Mapping (korrigiert anhand echter Gerätedaten) ─────
type WorkoutDef = {
  label: string;
  iconFamily: "Ionicons" | "MCI";
  iconName: string;
  color: string;
};

const WORKOUT_MAP: Record<number, WorkoutDef> = {
  1: {
    label: "American Football",
    iconFamily: "MCI",
    iconName: "football",
    color: "#a16207",
  },
  2: {
    label: "Bogenschiessen",
    iconFamily: "MCI",
    iconName: "bow-arrow",
    color: "#15803d",
  },
  3: {
    label: "Australian Football",
    iconFamily: "MCI",
    iconName: "football-australian",
    color: "#b45309",
  },
  4: {
    label: "Badminton",
    iconFamily: "MCI",
    iconName: "badminton",
    color: "#0891b2",
  },
  5: {
    label: "Baseball",
    iconFamily: "MCI",
    iconName: "baseball",
    color: "#b45309",
  },
  6: {
    label: "Basketball",
    iconFamily: "MCI",
    iconName: "basketball",
    color: "#ea580c",
  },
  7: {
    label: "Bowling",
    iconFamily: "MCI",
    iconName: "bowling",
    color: "#7c3aed",
  },
  8: {
    label: "Boxen",
    iconFamily: "MCI",
    iconName: "boxing-glove",
    color: "#dc2626",
  },
  9: {
    label: "Klettern",
    iconFamily: "MCI",
    iconName: "hiking",
    color: "#92400e",
  },
  10: {
    label: "Cricket",
    iconFamily: "MCI",
    iconName: "cricket",
    color: "#15803d",
  },
  11: {
    label: "Cross Training",
    iconFamily: "MCI",
    iconName: "run-fast",
    color: "#d97706",
  },
  12: {
    label: "Curling",
    iconFamily: "MCI",
    iconName: "snowflake",
    color: "#0284c7",
  },
  13: {
    label: "Rad indoor",
    iconFamily: "MCI",
    iconName: "bike",
    color: "#3b82f6",
  },
  14: {
    label: "Tanzen",
    iconFamily: "MCI",
    iconName: "dance-ballroom",
    color: "#ec4899",
  },
  15: {
    label: "Tanzen",
    iconFamily: "MCI",
    iconName: "dance-ballroom",
    color: "#ec4899",
  },
  16: {
    label: "Ellipsentrainer",
    iconFamily: "MCI",
    iconName: "run",
    color: "#8b5cf6",
  },
  17: {
    label: "Reiten",
    iconFamily: "MCI",
    iconName: "horse",
    color: "#92400e",
  },
  18: {
    label: "Fechten",
    iconFamily: "MCI",
    iconName: "sword",
    color: "#64748b",
  },
  19: {
    label: "Angeln",
    iconFamily: "MCI",
    iconName: "fish",
    color: "#0284c7",
  },
  20: {
    label: "Funktionelles Krafttraining",
    iconFamily: "Ionicons",
    iconName: "barbell-outline",
    color: "#8b5cf6",
  },
  21: { label: "Golf", iconFamily: "MCI", iconName: "golf", color: "#16a34a" },
  22: {
    label: "Turnen",
    iconFamily: "MCI",
    iconName: "gymnastics",
    color: "#ec4899",
  },
  23: {
    label: "Handball",
    iconFamily: "MCI",
    iconName: "handball",
    color: "#ea580c",
  },
  24: {
    label: "Wandern",
    iconFamily: "MCI",
    iconName: "hiking",
    color: "#84cc16",
  },
  25: {
    label: "Hockey",
    iconFamily: "MCI",
    iconName: "hockey-sticks",
    color: "#0284c7",
  },
  26: {
    label: "Jagd",
    iconFamily: "MCI",
    iconName: "target",
    color: "#92400e",
  },
  27: {
    label: "Lacrosse",
    iconFamily: "MCI",
    iconName: "lacrosse",
    color: "#16a34a",
  },
  28: {
    label: "Kampfsport",
    iconFamily: "MCI",
    iconName: "karate",
    color: "#dc2626",
  },
  29: {
    label: "Mind & Body",
    iconFamily: "Ionicons",
    iconName: "leaf-outline",
    color: "#10b981",
  },
  30: {
    label: "Mixed Cardio",
    iconFamily: "MCI",
    iconName: "run-fast",
    color: "#f59e0b",
  },
  31: {
    label: "Paddeln",
    iconFamily: "MCI",
    iconName: "kayaking",
    color: "#0284c7",
  },
  32: {
    label: "Spielen",
    iconFamily: "Ionicons",
    iconName: "happy-outline",
    color: "#f59e0b",
  },
  33: {
    label: "Vorbereitung & Erholung",
    iconFamily: "Ionicons",
    iconName: "snow-outline",
    color: "#67e8f9",
  },
  34: {
    label: "Racquetball",
    iconFamily: "MCI",
    iconName: "tennis",
    color: "#16a34a",
  },
  35: {
    label: "Rudern",
    iconFamily: "MCI",
    iconName: "rowing",
    color: "#0ea5e9",
  },
  36: {
    label: "Rugby",
    iconFamily: "MCI",
    iconName: "rugby",
    color: "#b45309",
  },
  37: {
    label: "Laufen",
    iconFamily: "Ionicons",
    iconName: "walk-outline",
    color: "#f59e0b",
  },
  38: {
    label: "Segeln",
    iconFamily: "MCI",
    iconName: "sail-boat",
    color: "#0284c7",
  },
  39: {
    label: "Skaten",
    iconFamily: "MCI",
    iconName: "skate",
    color: "#8b5cf6",
  },
  40: {
    label: "Schneesport",
    iconFamily: "MCI",
    iconName: "ski",
    color: "#67e8f9",
  },
  41: {
    label: "Fussball",
    iconFamily: "MCI",
    iconName: "soccer",
    color: "#16a34a",
  },
  42: {
    label: "Squash",
    iconFamily: "MCI",
    iconName: "tennis",
    color: "#84cc16",
  },
  43: {
    label: "Treppensteiger",
    iconFamily: "MCI",
    iconName: "stairs",
    color: "#f59e0b",
  },
  44: {
    label: "Stufenstepper",
    iconFamily: "MCI",
    iconName: "stairs",
    color: "#ea580c",
  },
  45: {
    label: "Schwimmen (Bahn)",
    iconFamily: "Ionicons",
    iconName: "water-outline",
    color: "#06b6d4",
  },
  46: {
    label: "Beckenschwimmen",
    iconFamily: "Ionicons",
    iconName: "water-outline",
    color: "#0284c7",
  },
  47: {
    label: "Tennis",
    iconFamily: "MCI",
    iconName: "tennis",
    color: "#84cc16",
  },
  48: {
    label: "Leichtathletik",
    iconFamily: "MCI",
    iconName: "run-fast",
    color: "#f59e0b",
  },
  49: {
    label: "Krafttraining",
    iconFamily: "Ionicons",
    iconName: "barbell-outline",
    color: "#8b5cf6",
  },
  50: {
    label: "Volleyball",
    iconFamily: "MCI",
    iconName: "volleyball",
    color: "#ea580c",
  },
  51: {
    label: "Gehen",
    iconFamily: "Ionicons",
    iconName: "footsteps-outline",
    color: "#6b7280",
  },
  52: {
    label: "Gehen",
    iconFamily: "Ionicons",
    iconName: "footsteps-outline",
    color: "#6b7280",
  },
  53: {
    label: "Wasserball",
    iconFamily: "MCI",
    iconName: "water-polo",
    color: "#0284c7",
  },
  54: {
    label: "Wassersport",
    iconFamily: "Ionicons",
    iconName: "water-outline",
    color: "#0284c7",
  },
  55: {
    label: "Ringen",
    iconFamily: "MCI",
    iconName: "wrestling",
    color: "#dc2626",
  },
  56: {
    label: "Yoga",
    iconFamily: "Ionicons",
    iconName: "leaf-outline",
    color: "#10b981",
  },
  57: {
    label: "Barre",
    iconFamily: "MCI",
    iconName: "human-female-dance",
    color: "#ec4899",
  },
  58: {
    label: "Core Training",
    iconFamily: "Ionicons",
    iconName: "body-outline",
    color: "#8b5cf6",
  },
  59: {
    label: "Skilanglauf",
    iconFamily: "MCI",
    iconName: "ski-cross-country",
    color: "#67e8f9",
  },
  60: {
    label: "Ski Alpin",
    iconFamily: "MCI",
    iconName: "ski",
    color: "#0284c7",
  },
  61: {
    label: "Schneesport",
    iconFamily: "MCI",
    iconName: "snowflake",
    color: "#67e8f9",
  },
  62: { label: "HIIT", iconFamily: "MCI", iconName: "fire", color: "#dc2626" },
  63: {
    label: "Hochintensives Intervalltraining",
    iconFamily: "MCI",
    iconName: "fire",
    color: "#dc2626",
  },
  64: {
    label: "Kickboxen",
    iconFamily: "MCI",
    iconName: "boxing-glove",
    color: "#dc2626",
  },
  65: {
    label: "Pilates",
    iconFamily: "MCI",
    iconName: "yoga",
    color: "#ec4899",
  },
  66: {
    label: "Snowboarden",
    iconFamily: "MCI",
    iconName: "snowboard",
    color: "#0284c7",
  },
  67: {
    label: "Treppen",
    iconFamily: "MCI",
    iconName: "stairs",
    color: "#f59e0b",
  },
  68: {
    label: "Step Training",
    iconFamily: "MCI",
    iconName: "stairs",
    color: "#8b5cf6",
  },
  69: {
    label: "Rollstuhl (Gehen)",
    iconFamily: "MCI",
    iconName: "wheelchair-accessibility",
    color: "#6b7280",
  },
  70: {
    label: "Rollstuhl (Laufen)",
    iconFamily: "MCI",
    iconName: "wheelchair-accessibility",
    color: "#3b82f6",
  },
  71: {
    label: "Tai Chi",
    iconFamily: "MCI",
    iconName: "yoga",
    color: "#10b981",
  },
  72: {
    label: "Mixed Cardio",
    iconFamily: "MCI",
    iconName: "run-fast",
    color: "#f59e0b",
  },
  73: {
    label: "Handbike",
    iconFamily: "MCI",
    iconName: "bike",
    color: "#3b82f6",
  },
  74: {
    label: "Disc Sports",
    iconFamily: "MCI",
    iconName: "disc",
    color: "#84cc16",
  },
  75: {
    label: "Fitness Gaming",
    iconFamily: "MCI",
    iconName: "gamepad-variant-outline",
    color: "#8b5cf6",
  },
  76: {
    label: "Cardio Tanzen",
    iconFamily: "MCI",
    iconName: "dance-ballroom",
    color: "#ec4899",
  },
  77: {
    label: "Social Dance",
    iconFamily: "MCI",
    iconName: "dance-ballroom",
    color: "#db2777",
  },
  78: {
    label: "Pickleball",
    iconFamily: "MCI",
    iconName: "tennis",
    color: "#84cc16",
  },
  79: {
    label: "Cooldown",
    iconFamily: "Ionicons",
    iconName: "snow-outline",
    color: "#67e8f9",
  },
  80: {
    label: "Triathlon",
    iconFamily: "MCI",
    iconName: "triathlon",
    color: "#3b8995",
  },
  82: {
    label: "Schwimmen (Freiwasser)",
    iconFamily: "Ionicons",
    iconName: "water-outline",
    color: "#0891b2",
  },
  83: {
    label: "Radfahren outdoor",
    iconFamily: "Ionicons",
    iconName: "bicycle-outline",
    color: "#3b82f6",
  },
  3000: {
    label: "Cross Training",
    iconFamily: "MCI",
    iconName: "run-fast",
    color: "#d97706",
  },
};

const FALLBACK: WorkoutDef = {
  label: "Training",
  iconFamily: "Ionicons",
  iconName: "fitness-outline",
  color: "#3b8995",
};

export function getWorkoutDef(typeNum: number): WorkoutDef {
  return (
    WORKOUT_MAP[typeNum] ?? { ...FALLBACK, label: `Training (${typeNum})` }
  );
}

function WorkoutTypeIcon({
  typeNum,
  size = 20,
}: {
  typeNum: number;
  size?: number;
}) {
  const def = getWorkoutDef(typeNum);
  return (
    <View style={[s.iconWrap, { backgroundColor: def.color + "1a" }]}>
      {def.iconFamily === "Ionicons" ? (
        <Ionicons name={def.iconName as any} size={size} color={def.color} />
      ) : (
        <MaterialCommunityIcons
          name={def.iconName as any}
          size={size}
          color={def.color}
        />
      )}
    </View>
  );
}

type ImportFlags = { planner: boolean; habit: boolean; note: boolean };

function ImportDots({
  flags,
  onPress,
}: {
  flags: ImportFlags;
  onPress: () => void;
}) {
  const dots = [
    {
      key: "planner" as const,
      icon: "calendar-outline",
      activeColor: "#3b8995",
    },
    { key: "habit" as const, icon: "repeat-outline", activeColor: "#8b5cf6" },
    {
      key: "note" as const,
      icon: "document-text-outline",
      activeColor: "#f59e0b",
    },
  ];
  return (
    <Pressable onPress={onPress} style={s.dotsRow} hitSlop={8}>
      {dots.map((d) => (
        <View
          key={d.key}
          style={[
            s.dot,
            flags[d.key] && { backgroundColor: d.activeColor + "20" },
          ]}
        >
          <Ionicons
            name={d.icon as any}
            size={14}
            color={flags[d.key] ? d.activeColor : "#cbd5e1"}
          />
        </View>
      ))}
    </Pressable>
  );
}

type Props = { visible: boolean; onClose: () => void };
const PAGE_SIZE = 50;

export function WorkoutHistoryModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { workouts, isLoading } = useWorkoutHistory(limit);
  const addEntry = usePlannerStore((s) => s.addEntry);
  const addHabit = useHabitStore((s) => s.addHabit);
  const addNote = useNoteStore((s) => s.addNote);
  const [importStates, setImportStates] = useState<Record<string, ImportFlags>>(
    {}
  );

  function getFlags(id: string): ImportFlags {
    return importStates[id] ?? { planner: false, habit: false, note: false };
  }
  function setFlag(id: string, key: keyof ImportFlags) {
    setImportStates((prev) => ({
      ...prev,
      [id]: { ...getFlags(id), [key]: true },
    }));
  }
  function toTimeStr(date: Date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  }

  function handleImport(w: WorkoutHistoryData) {
    const def = getWorkoutDef(w.typeNum ?? 3000);
    const flags = getFlags(w.id);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: def.label,
        message: `${w.durationMin} Min  ${w.date.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}`,
        options: [
          "Abbrechen",
          flags.planner ? "Bereits im Planner" : "Zum Planner",
          flags.habit ? "Bereits als Habit" : "Als Habit anlegen",
          flags.note ? "Bereits als Notiz" : "Als Notiz speichern",
        ],
        cancelButtonIndex: 0,
        tintColor: "#3b8995",
      },
      (i) => {
        if (i === 1) importToPlanner(w, def.label);
        if (i === 2) importToHabit(w, def.label);
        if (i === 3) importToNote(w, def.label);
      }
    );
  }

  function importToPlanner(w: WorkoutHistoryData, label: string) {
    addEntry({
      title: label,
      date: dateToLocalString(w.date),
      startTime: toTimeStr(w.startDate),
      endTime: toTimeStr(w.endDate),
      durationMinute: w.durationMin,
      category: "fitness",
      note: [
        w.calories > 0 ? `${w.calories} kcal` : "",
        w.distanceKm > 0 ? `${w.distanceKm} km` : "",
        `${w.durationMin} Min`,
      ]
        .filter(Boolean)
        .join(" / "),
    });
    setFlag(w.id, "planner");
  }

  function importToHabit(w: WorkoutHistoryData, label: string) {
    addHabit(label, "boolean", "fitness", undefined, undefined, {
      startDate: dateToLocalString(w.date),
      repeatUnit: "day",
      repeatEvery: 1,
    });
    setFlag(w.id, "habit");
  }

  function importToNote(w: WorkoutHistoryData, label: string) {
    const content = [
      label,
      w.date.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      `Dauer: ${w.durationMin} Min`,
      w.calories > 0 ? `Kalorien: ${w.calories} kcal` : "",
      w.distanceKm > 0 ? `Distanz: ${w.distanceKm} km` : "",
    ]
      .filter(Boolean)
      .join("\n");
    addNote(
      [{ id: Crypto.randomUUID(), type: "text", content }],
      dateToLocalString(w.date),
      label,
      ["fitness", "workout"]
    );
    setFlag(w.id, "note");
  }

  function buildSections(workouts: WorkoutHistoryData[]) {
    const map = new Map<string, WorkoutHistoryData[]>();
    for (const w of workouts) {
      const key = w.date.toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }

  const sections = buildSections(workouts);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#3b8995" />
            <Text style={s.backText}>Zurueck</Text>
          </Pressable>
          <Text style={s.headerTitle}>Trainings-Verlauf</Text>
          <View style={{ width: 80 }} />
        </View>

        {!isLoading && workouts.length > 0 && (
          <View style={s.countBanner}>
            <Text style={s.countLabel}>TRAININGS GELADEN</Text>
            <Text style={s.countNum}>{workouts.length}</Text>
          </View>
        )}

        {!isLoading && workouts.length > 0 && (
          <View style={s.legend}>
            {[
              { icon: "calendar-outline", color: "#3b8995", label: "Planner" },
              { icon: "repeat-outline", color: "#8b5cf6", label: "Habit" },
              {
                icon: "document-text-outline",
                color: "#f59e0b",
                label: "Notiz",
              },
            ].map((item) => (
              <View key={item.label} style={s.legendItem}>
                <Ionicons
                  name={item.icon as any}
                  size={12}
                  color={item.color}
                />
                <Text style={s.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#3b8995" />
            <Text style={s.stateText}>Lade Trainings...</Text>
          </View>
        ) : workouts.length === 0 ? (
          <View style={s.center}>
            <View style={s.emptyIcon}>
              <Ionicons name="barbell-outline" size={32} color="#94a3b8" />
            </View>
            <Text style={s.emptyTitle}>Keine Trainings gefunden</Text>
            <Text style={s.stateText}>
              Health-Zugriff fuer Workouts pruefen.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            onEndReached={() => setLimit((l) => l + PAGE_SIZE)}
            onEndReachedThreshold={0.3}
            renderSectionHeader={({ section }) => (
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>
                  {section.title.toUpperCase()}
                </Text>
              </View>
            )}
            renderItem={({ item: w, index, section }) => {
              const isLast = index === section.data.length - 1;
              const def = getWorkoutDef(w.typeNum ?? 3000);
              const flags = getFlags(w.id);
              return (
                <Pressable
                  onPress={() => handleImport(w)}
                  style={({ pressed }) => [
                    s.row,
                    !isLast && s.rowBorder,
                    pressed && s.rowPressed,
                  ]}
                >
                  <WorkoutTypeIcon typeNum={w.typeNum ?? 3000} size={20} />
                  <View style={s.rowInfo}>
                    <Text style={s.rowTitle} numberOfLines={1}>
                      {def.label}
                    </Text>
                    <View style={s.rowMeta}>
                      <Text style={s.rowMetaText}>
                        {w.date.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </Text>
                      <Text style={s.metaDot}>-</Text>
                      <Text style={s.rowMetaText}>
                        {toTimeStr(w.startDate)} Uhr
                      </Text>
                      {w.durationMin > 0 && (
                        <>
                          <Text style={s.metaDot}>-</Text>
                          <Text style={s.rowMetaText}>{w.durationMin} Min</Text>
                        </>
                      )}
                      {w.calories > 0 && (
                        <>
                          <Text style={s.metaDot}>-</Text>
                          <Text style={s.rowMetaText}>{w.calories} kcal</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <ImportDots flags={flags} onPress={() => handleImport(w)} />
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, width: 80 },
  backText: { fontSize: 16, color: "#3b8995", fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  countBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f8f9fb",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  countLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.3,
  },
  countNum: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  legend: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 7,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: "white",
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  rowPressed: { backgroundColor: "#f8f9fb" },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  rowMetaText: { fontSize: 12, color: "#94a3b8" },
  metaDot: { fontSize: 12, color: "#e2e8f0" },
  dotsRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fb",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#334155" },
  stateText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
});
