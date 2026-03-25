// components/stats/StatsEmptyState.tsx
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function StatsEmptyState() {
  const router = useRouter();

  return (
    <View style={s.root}>
      <View style={s.iconWrap}>
        <Text style={s.icon}>📊</Text>
      </View>
      <Text style={s.title}>Noch keine Daten</Text>
      <Text style={s.sub}>
        Erstelle dein erstes Habit, um Streaks, Heatmaps und Fortschritt zu
        sehen.
      </Text>
      <Pressable style={s.btn} onPress={() => router.push("/add")}>
        <Text style={s.btnText}>Erstes Habit erstellen</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#f0fbfc",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 32 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: "#3b8995",
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  btnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
});
