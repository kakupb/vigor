// app/habit/[id].tsx
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { getCategoryConfig } from "@/constants/categories";
import { useHabit } from "@/hooks/useHabits";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { habit, meta, actions } = useHabit(id);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!habit || !meta) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3b8995" />
      </View>
    );
  }

  const cfg = getCategoryConfig(habit.category);

  async function handleDelete() {
    Alert.alert(
      "Habit löschen?",
      `"${
        habit!.title
      }" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const ok = await actions.delete();
            if (ok) router.back();
            else {
              setIsDeleting(false);
              Alert.alert("Fehler", "Habit konnte nicht gelöscht werden.");
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* ── HEADER ── */}
      <View
        style={[
          s.header,
          { paddingTop: insets.top + 16, backgroundColor: cfg.lightColor },
        ]}
      >
        {/* Nav row */}
        <View style={s.navRow}>
          <Pressable
            onPress={() => router.back()}
            style={s.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </Pressable>
          <Pressable
            onPress={() => router.push(`/habit/edit/${id}`)}
            style={s.editBtn}
          >
            <Ionicons name="pencil-outline" size={15} color="#3b8995" />
            <Text style={s.editBtnText}>Bearbeiten</Text>
          </Pressable>
        </View>

        {/* Title */}
        <View style={s.titleRow}>
          <CategoryIcon
            category={habit.category}
            size={26}
            containerSize={60}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.habitName}>{habit.title}</Text>
            <Text style={s.habitMeta}>
              {cfg.label}
              {habit.kind === "count" && habit.dailyTarget
                ? ` · ${habit.dailyTarget}${
                    habit.unit ? ` ${habit.unit}` : ""
                  } täglich`
                : ""}
            </Text>
          </View>
        </View>
      </View>

      <View style={[s.body, { paddingBottom: insets.bottom + 24 }]}>
        {/* ── HEUTE ── */}
        <Pressable
          onPress={actions.toggleCheckIn}
          style={[
            s.todayCard,
            { borderColor: meta.completed ? cfg.color : "#e5e7eb" },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.todayLabel}>Heute erledigt?</Text>
            <Text style={s.todaySub}>
              {meta.completed ? "Gut gemacht! ✓" : "Noch nicht erledigt"}
            </Text>
          </View>
          <View
            style={[
              s.todayCircle,
              { backgroundColor: meta.completed ? cfg.color : "#f3f4f6" },
            ]}
          >
            <Text style={s.todayIcon}>{meta.completed ? "✓" : "○"}</Text>
          </View>
        </Pressable>

        {/* ── STATS ── */}
        <View style={s.statsRow}>
          {[
            {
              label: "STREAK",
              value: meta.streak,
              unit: `${meta.streak === 1 ? "Tag" : "Tage"} `,
              color: "#f59e0b",
            },
            {
              label: "BEST",
              value: meta.longestStreak,
              unit: meta.longestStreak === 1 ? "Tag" : "Tage",
              color: "#8b5cf6",
            },
            {
              label: "GESAMT",
              value: meta.totalCompletions,
              unit: "mal",
              color: "#10b981",
            },
          ].map(({ label, value, unit, color }) => (
            <View key={label} style={s.statCard}>
              <Text style={s.statLabel}>{label}</Text>
              <Text style={[s.statValue, { color }]}>{value}</Text>
              <Text style={s.statUnit}>
                {unit}
                {label === "STREAK" && (
                  <MaterialCommunityIcons
                    name="fire"
                    size={20}
                    color="#F74920"
                  />
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* ── HISTORIE ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Historie</Text>
          {meta.history.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Noch keine Einträge</Text>
              <Text style={s.emptySub}>Starte heute dein erstes Check-in!</Text>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {meta.history.slice(0, 10).map((date, i) => (
                <View key={i} style={s.historyRow}>
                  <View
                    style={[s.historyDot, { backgroundColor: cfg.color }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyDate}>
                      {date.toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </Text>
                    <Text style={s.historyYear}>
                      {date.toLocaleDateString("de-DE", { year: "numeric" })}
                    </Text>
                  </View>
                  <Text style={[s.historyCheck, { color: cfg.color }]}>✓</Text>
                </View>
              ))}
              {meta.history.length > 10 && (
                <Text style={s.moreText}>
                  + {meta.history.length - 10} weitere Einträge
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ── LÖSCHEN ── */}
        <Pressable
          onPress={handleDelete}
          disabled={isDeleting}
          style={[s.deleteBtn, isDeleting && s.deleteBtnDim]}
        >
          {isDeleting ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
              <Text style={s.deleteBtnText}>Habit löschen</Text>
            </View>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },

  header: { paddingHorizontal: 20, paddingBottom: 24 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#a5e8ef",
  },
  editBtnText: { fontSize: 14, fontWeight: "600", color: "#3b8995" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  habitName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  habitMeta: { fontSize: 14, color: "#64748b" },

  body: { padding: 20, gap: 14 },

  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  todayLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  todaySub: { fontSize: 14, color: "#6b7280" },
  todayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  todayIcon: { fontSize: 28, color: "white" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: { fontSize: 28, fontWeight: "700", marginBottom: 2 },
  statUnit: { fontSize: 11, color: "#94a3b8" },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 14,
  },

  emptyBox: { alignItems: "center", paddingVertical: 20 },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  emptySub: { fontSize: 12, color: "#d1d5db", marginTop: 4 },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyDate: { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  historyYear: { fontSize: 12, color: "#9ca3af" },
  historyCheck: { fontSize: 16, fontWeight: "700" },
  moreText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },

  deleteBtn: {
    padding: 18,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
    alignItems: "center",
  },
  deleteBtnDim: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  deleteBtnText: { fontSize: 16, color: "#dc2626", fontWeight: "600" },
});
