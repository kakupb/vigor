// components/today/OnboardingModal.tsx
// Feature-Tour nach erstem Login.
// Kein "Daten werden lokal gespeichert" mehr — das stimmt nicht mehr.
// Name wird im Profil gesetzt, nicht hier (kommt aus Auth).
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
    bg: "#f0f4ff",
    title: "Habits tracken",
    desc: "Erstelle tägliche Habits und verfolge deinen Streak. Kategorien, Ziele und flexible Zeitpläne inklusive.",
  },
  {
    icon: "calendar-outline" as const,
    color: "#3b8995",
    bg: "#f0fbfc",
    title: "Planner",
    desc: "Plane deinen Tag mit Zeitblöcken. Importiere Trainings aus Apple Health direkt in deinen Tag.",
  },
  {
    icon: "document-text-outline" as const,
    color: "#10b981",
    bg: "#f0fdf4",
    title: "Notizen",
    desc: "Schreibe Notizen mit Fotos und Tabellen. Verknüpfe sie mit Habits und Plannereinträgen.",
  },
  {
    icon: "bar-chart-outline" as const,
    color: "#8b5cf6",
    bg: "#faf5ff",
    title: "Statistiken & Health",
    desc: "Verfolge Streaks, Heatmaps und Gesundheitsdaten direkt aus Apple Health.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    color: "#059669",
    bg: "#f0fdf4",
    title: "Deine Daten, sicher",
    desc: "Habits, Notizen und Planner werden verschlüsselt in der EU-Cloud gespeichert. Gesundheitsdaten verlassen niemals dein Gerät.",
  },
];

export function OnboardingModal({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const setName = useUserStore((s) => s.setName);

  const [featureIndex, setFeatureIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const currentAnim = useRef(new Animated.Value(1)).current;
  const nextAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const isLast = featureIndex === FEATURES.length - 1;

  function goToFeature(next: number) {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setPendingIndex(next);
    nextAnim.setValue(0);

    Animated.parallel([
      Animated.timing(currentAnim, {
        toValue: -1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(nextAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayIndex(next);
      setFeatureIndex(next);
      setPendingIndex(null);
      currentAnim.setValue(1);
      nextAnim.setValue(0);
      isAnimating.current = false;
    });

    Haptics.selectionAsync();
  }

  function handleNext() {
    if (isLast) {
      // Letzter Slide → Feature als "gesehen" markieren (leerer Name = OK, kommt aus Auth)
      setName("_onboarded");
    } else {
      goToFeature(featureIndex + 1);
    }
  }

  function handleSkip() {
    setName("_onboarded");
  }

  const currentTX = currentAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-SW, SW, 0],
  });
  const currentOP = currentAnim.interpolate({
    inputRange: [-1, -0.4, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View
        style={[
          s.root,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Slides */}
        <View style={s.slideArea}>
          {/* Current */}
          <Animated.View
            style={[
              s.slide,
              { transform: [{ translateX: currentTX }], opacity: currentOP },
            ]}
          >
            <SlideContent index={displayIndex} />
          </Animated.View>

          {/* Pending (slides in from right) */}
          {pendingIndex !== null && (
            <Animated.View
              style={[
                s.slide,
                {
                  transform: [
                    {
                      translateX: nextAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [SW, 0],
                      }),
                    },
                  ],
                  opacity: nextAnim.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0, 0.6, 1],
                  }),
                },
              ]}
            >
              <SlideContent index={pendingIndex} />
            </Animated.View>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          {/* Dots */}
          <View style={s.dots}>
            {FEATURES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => i > featureIndex && goToFeature(i)}
              >
                <View
                  style={[
                    s.dot,
                    i === featureIndex ? s.dotActive : s.dotInactive,
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* Button */}
          <Pressable onPress={handleNext} style={s.btn}>
            <Text style={s.btnTx}>{isLast ? "Los geht's!" : "Weiter"}</Text>
            <Ionicons
              name={isLast ? "checkmark" : "arrow-forward"}
              size={18}
              color="white"
            />
          </Pressable>

          {/* Überspringen */}
          {!isLast && (
            <Pressable onPress={handleSkip} style={s.skipBtn}>
              <Text style={s.skipTx}>Überspringen</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SlideContent({ index }: { index: number }) {
  const f = FEATURES[index];
  return (
    <View style={sl.wrap}>
      <View style={[sl.iconWrap, { backgroundColor: f.bg }]}>
        <Ionicons name={f.icon} size={60} color={f.color} />
      </View>
      <Text style={sl.title}>{f.title}</Text>
      <Text style={sl.desc}>{f.desc}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  slideArea: { flex: 1, overflow: "hidden" },
  slide: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: 14,
    alignItems: "center",
  },
  dots: { flexDirection: "row", gap: 6 },
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

const sl = StyleSheet.create({
  wrap: { alignItems: "center", gap: 24 },
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: 40,
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
  desc: { fontSize: 16, color: "#64748b", textAlign: "center", lineHeight: 25 },
});
