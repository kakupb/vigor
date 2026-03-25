// components/today/OnboardingModal.tsx
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SW = Dimensions.get("window").width;

const FEATURES = [
  {
    icon: "checkmark-circle-outline" as const,
    color: "#4b60af",
    bg: "#eef1ff",
    title: "Habits tracken",
    desc: "Erstelle tägliche Habits und verfolge deinen Streak. Kategorien, Ziele und flexible Zeitpläne inklusive.",
  },
  {
    icon: "calendar-outline" as const,
    color: "#3b8995",
    bg: "#edfafc",
    title: "Planner",
    desc: "Plane deinen Tag mit Zeitblöcken. Importiere Trainings aus Apple Health direkt in deinen Tag.",
  },
  {
    icon: "document-text-outline" as const,
    color: "#10b981",
    bg: "#edfdf5",
    title: "Notizen",
    desc: "Schreibe Notizen mit Fotos und Tabellen. Verknüpfe sie mit Habits und Plannereinträgen.",
  },
  {
    icon: "bar-chart-outline" as const,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "Statistiken & Health",
    desc: "Verfolge Streaks, Heatmaps und Gesundheitsdaten direkt aus Apple Health.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    color: "#059669",
    bg: "#edfdf5",
    title: "Deine Daten, sicher",
    desc: "Habits, Notizen und Planner werden verschlüsselt in der EU-Cloud gespeichert. Gesundheitsdaten verlassen niemals dein Gerät.",
  },
];

export function OnboardingModal({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const setName = useUserStore((s) => s.setName);
  const [index, setIndex] = useState(0);

  // Ein einziger Animated-Wert bewegt den gesamten Track
  const translateX = useRef(new Animated.Value(0)).current;

  const isLast = index === FEATURES.length - 1;

  function goTo(next: number) {
    if (next === index) return;
    setIndex(next);
    Animated.spring(translateX, {
      toValue: -next * SW,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
      overshootClamping: true,
    }).start();
    Haptics.selectionAsync();
  }

  function handleNext() {
    if (isLast) {
      setName("_onboarded");
    } else {
      goTo(index + 1);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View
        style={[
          s.root,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* ── Karussell ──────────────────────────────────────── */}
        <View style={s.viewport}>
          {/*
            Der Track ist FEATURES.length × SW breit.
            Alle Slides liegen nebeneinander — wir verschieben nur diesen
            einen Container. Kein Sync-Problem, keine Glitches.
          */}
          <Animated.View
            style={[
              s.track,
              { width: SW * FEATURES.length, transform: [{ translateX }] },
            ]}
          >
            {FEATURES.map((f, i) => (
              <View key={i} style={[s.slide, { width: SW }]}>
                <View style={[s.iconWrap, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon} size={56} color={f.color} />
                </View>
                <Text style={s.title}>{f.title}</Text>
                <Text style={s.desc}>{f.desc}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {/* ── Footer ─────────────────────────────────────────── */}
        <View style={s.footer}>
          <View style={s.dots}>
            {FEATURES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => i !== index && goTo(i)}
                hitSlop={10}
              >
                <View
                  style={[s.dot, i === index ? s.dotActive : s.dotInactive]}
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.84 }]}
          >
            <Text style={s.btnTx}>{isLast ? "Los geht's!" : "Weiter"}</Text>
            <Ionicons
              name={isLast ? "checkmark" : "arrow-forward"}
              size={18}
              color="#fff"
            />
          </Pressable>

          {!isLast && (
            <Pressable onPress={() => setName("_onboarded")} style={s.skipBtn}>
              <Text style={s.skipTx}>Überspringen</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  viewport: { flex: 1, overflow: "hidden" },
  track: { flexDirection: "row", flex: 1 },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 25,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 14,
    alignItems: "center",
  },
  dots: { flexDirection: "row", gap: 7 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 28, backgroundColor: "#3b8995" },
  dotInactive: { width: 6, backgroundColor: "#e2e8f0" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b8995",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 28,
    width: "100%",
    justifyContent: "center",
  },
  btnTx: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipBtn: { paddingVertical: 4 },
  skipTx: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },
});
