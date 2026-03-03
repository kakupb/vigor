// components/today/OnboardingModal.tsx
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW } = Dimensions.get("window");

type Feature = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  bg: string;
  title: string;
  desc: string;
};

const FEATURES: Feature[] = [
  {
    icon: "sunny-outline",
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "Dein Tag auf einen Blick",
    desc: "Sieh alle Habits und geplanten Aufgaben für heute. Hake ab, was du erledigt hast – einfach und schnell.",
  },
  {
    icon: "repeat-outline",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "Habits & Routinen",
    desc: "Erstelle tägliche oder wöchentliche Gewohnheiten. Verfolge deinen Streak und bleib motiviert.",
  },
  {
    icon: "calendar-outline",
    color: "#3b8995",
    bg: "#f0fbfc",
    title: "Planner",
    desc: "Plane deine Aktivitäten mit Zeitslots. Importiere Trainings aus Apple Health direkt in deinen Tag.",
  },
  {
    icon: "document-text-outline",
    color: "#10b981",
    bg: "#f0fdf4",
    title: "Notizen",
    desc: "Schreibe Notizen mit Fotos und Tabellen. Verknüpfe sie mit Habits und Plannereinträgen.",
  },
  {
    icon: "bar-chart-outline",
    color: "#4b60af",
    bg: "#f0f4ff",
    title: "Analyse & Insights",
    desc: "Verfolge deine Fortschritte. Sieh Streaks, Heatmaps und Gesundheitsdaten aus Apple Health.",
  },
];

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export function OnboardingModal({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const setName = useUserStore((s) => s.setName);

  const [featureIndex, setFeatureIndex] = useState(0);
  const [showName, setShowName] = useState(false);
  const [name, setNameInput] = useState("");

  // Zwei Slide-Positionen: current (sichtbar) + next (wartet rechts)
  const currentAnim = useRef(new Animated.Value(1)).current;
  const nextAnim = useRef(new Animated.Value(0)).current;
  const [displayIndex, setDisplayIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const isAnimating = useRef(false);

  // Name-Screen slide
  const nameAnim = useRef(new Animated.Value(0)).current;

  const isLastFeature = featureIndex === FEATURES.length - 1;

  function goToFeature(next: number) {
    if (isAnimating.current) return;
    isAnimating.current = true;

    setPendingIndex(next);
    nextAnim.setValue(0); // next starts off-screen right

    Animated.parallel([
      // current slides out to the left
      Animated.timing(currentAnim, {
        toValue: -1,
        duration: 320,
        useNativeDriver: true,
      }),
      // next slides in from the right
      Animated.timing(nextAnim, {
        toValue: 1,
        duration: 320,
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
  }

  function goToNameScreen() {
    if (isAnimating.current) return;
    isAnimating.current = true;

    nameAnim.setValue(0);
    setShowName(true);

    Animated.parallel([
      Animated.timing(currentAnim, {
        toValue: -1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(nameAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  }

  function handleNext() {
    if (isLastFeature) {
      goToNameScreen();
    } else {
      goToFeature(featureIndex + 1);
    }
  }

  function handleSkip() {
    goToNameScreen();
  }

  async function handleFinish() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await setName(trimmed);
  }

  // Slide-out translateX für currentAnim when going -1
  const currentTranslateX = currentAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-SW, SW, 0],
  });
  const currentOpacity = currentAnim.interpolate({
    inputRange: [-1, -0.5, 1],
    outputRange: [0, 0, 1],
  });

  const nameTranslateX = nameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SW, 0],
  });
  const nameOpacity = nameAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.6, 1],
  });

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View
        style={[
          s.root,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* ── Feature Slides ── */}
        <View style={s.slideArea}>
          {/* Current slide */}
          <Animated.View
            style={[
              s.slideAbsolute,
              {
                transform: [{ translateX: currentTranslateX }],
                opacity: currentOpacity,
              },
            ]}
          >
            <View
              style={[
                s.featureIconWrap,
                { backgroundColor: FEATURES[displayIndex].bg },
              ]}
            >
              <Ionicons
                name={FEATURES[displayIndex].icon}
                size={56}
                color={FEATURES[displayIndex].color}
              />
            </View>
            <Text style={s.featureTitle}>{FEATURES[displayIndex].title}</Text>
            <Text style={s.featureDesc}>{FEATURES[displayIndex].desc}</Text>
          </Animated.View>

          {/* Pending slide (slides in from right) */}
          {pendingIndex !== null && (
            <Animated.View
              style={[
                s.slideAbsolute,
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
              <View
                style={[
                  s.featureIconWrap,
                  { backgroundColor: FEATURES[pendingIndex].bg },
                ]}
              >
                <Ionicons
                  name={FEATURES[pendingIndex].icon}
                  size={56}
                  color={FEATURES[pendingIndex].color}
                />
              </View>
              <Text style={s.featureTitle}>{FEATURES[pendingIndex].title}</Text>
              <Text style={s.featureDesc}>{FEATURES[pendingIndex].desc}</Text>
            </Animated.View>
          )}

          {/* Name screen slides in */}
          {showName && (
            <Animated.View
              style={[
                s.slideAbsolute,
                {
                  transform: [{ translateX: nameTranslateX }],
                  opacity: nameOpacity,
                },
              ]}
            >
              <KeyboardAvoidingView
                style={s.nameInner}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <View
                  style={[s.featureIconWrap, { backgroundColor: "#f0fbfc" }]}
                >
                  <Text style={{ fontSize: 56 }}>👋</Text>
                </View>
                <Text style={s.featureTitle}>Wie heißt du?</Text>
                <Text style={s.featureDesc}>
                  Dein Name wird nur lokal auf deinem Gerät gespeichert.
                </Text>
                <TextInput
                  style={s.nameInput}
                  placeholder="Dein Name"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setNameInput}
                  autoFocus
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleFinish}
                  maxLength={30}
                />
              </KeyboardAvoidingView>
            </Animated.View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          {/* Dots */}
          {!showName && (
            <View style={s.dots}>
              {FEATURES.map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    s.dot,
                    i === featureIndex ? s.dotActive : s.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Button */}
          <Pressable
            onPress={showName ? handleFinish : handleNext}
            style={[s.btn, showName && !name.trim() && s.btnDisabled]}
            disabled={showName && !name.trim()}
          >
            <Text style={s.btnText}>
              {showName ? "Starten" : isLastFeature ? "Weiter" : "Weiter"}
            </Text>
            <Ionicons
              name={showName ? "checkmark" : "arrow-forward"}
              size={18}
              color="white"
            />
          </Pressable>

          {/* Überspringen */}
          {!showName && !isLastFeature && (
            <Pressable onPress={handleSkip} style={s.skipBtn}>
              <Text style={s.skipText}>Überspringen</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "white",
  },
  slideArea: {
    flex: 1,
    overflow: "hidden",
  },
  slideAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 20,
  },
  featureIconWrap: {
    width: 128,
    height: 128,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  featureDesc: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },

  // Footer
  footer: {
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: 12,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 28,
    backgroundColor: "#3b8995",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#e2e8f0",
  },
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
  btnDisabled: { backgroundColor: "#cbd5e1" },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  skipBtn: { paddingVertical: 4 },
  skipText: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },

  // Name step
  nameInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 8,
  },
  nameInput: {
    width: "100%",
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    backgroundColor: "#f8f9fb",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    textAlign: "center",
    marginTop: 8,
  },
});
