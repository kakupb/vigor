// app/(tabs)/health.tsx
import { C } from "@/components/health/healthTokens";
import { Ic } from "@/components/health/HealthUI";
import { SleepTab } from "@/components/health/sleep/SleepTab";
import { WorkoutTab } from "@/components/health/workout/WorkoutTab";
import { useHealthAuth } from "@/hooks/useHealthData";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "sleep" | "workout";

const TABS = [
  {
    id: "sleep" as Tab,
    lib: "I" as const,
    icon: "moon-outline" as const,
    label: "Schlaf",
  },
  {
    id: "workout" as Tab,
    lib: "I" as const,
    icon: "barbell-outline" as const,
    label: "Training",
  },
];

function ConnectScreen({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={s.connectWrap}>
      <View style={s.connectIcon}>
        <Ionicons name="heart" size={34} color="#16a34a" />
      </View>
      <Text style={s.connectTitle}>Apple Health verbinden</Text>
      <Text style={s.connectDesc}>
        Schlafdaten, HRV, Herzfrequenz und Trainings direkt in der App.
      </Text>
      <Pressable onPress={onConnect} style={s.connectBtn}>
        <Ionicons name="link-outline" size={17} color="white" />
        <Text style={s.connectBtnTx}>Mit Apple Health verbinden</Text>
      </Pressable>
    </View>
  );
}

export default function HealthScreen() {
  const ins = useSafeAreaInsets();
  const { isAvailable, isAuthorized, requestAuth } = useHealthAuth();
  const [tab, setTab] = useState<Tab>("sleep");

  if (Platform.OS !== "ios" || !isAvailable) {
    return (
      <View style={[s.root, { paddingTop: ins.top }]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Gesundheit</Text>
        </View>
        <View style={s.center}>
          <Ionicons name="phone-portrait-outline" size={38} color={C.muted} />
          <Text style={s.unavailTx}>Nur auf iPhone verfügbar</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: ins.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Gesundheit</Text>
        <View style={s.hkBadge}>
          <View style={s.hkDot} />
          <Text style={s.hkTx}>HealthKit</Text>
        </View>
      </View>

      {!isAuthorized ? (
        <ConnectScreen onConnect={requestAuth} />
      ) : (
        <>
          {/* ── Tab switcher ── */}
          <View style={s.tabBar}>
            {TABS.map((tb) => {
              const active = tab === tb.id;
              const color = active
                ? tb.id === "sleep"
                  ? C.deep
                  : C.rem
                : C.muted;
              return (
                <Pressable
                  key={tb.id}
                  onPress={() => setTab(tb.id)}
                  style={[s.tabBtn, active && s.tabBtnActive]}
                >
                  <Ic lib={tb.lib} name={tb.icon} size={15} color={color} />
                  <Text style={[s.tabTx, { color }]}>{tb.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {tab === "sleep" ? <SleepTab /> : <WorkoutTab />}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  unavailTx: { fontSize: 15, color: C.muted },

  hkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  hkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#16a34a" },
  hkTx: { fontSize: 11, fontWeight: "700", color: "#16a34a" },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 13,
    padding: 4,
    gap: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: C.bg },
  tabTx: { fontSize: 14, fontWeight: "600" },

  connectWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    gap: 16,
  },
  connectIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  connectTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  connectDesc: {
    fontSize: 13,
    color: C.sub,
    textAlign: "center",
    lineHeight: 20,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#16a34a",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  connectBtnTx: { color: "white", fontWeight: "700", fontSize: 15 },
});
