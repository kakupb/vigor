// components/today/OnboardingModal.tsx
// Neues Onboarding — 5 Slides, sammelt Name + Ziel + Fokusziel + Uhrzeit.
// Alles wird verarbeitet: Begrüßung, Fortschrittsbalken, Benachrichtigung.

import {
  FocusTime,
  UserGoal,
  UserPrefs,
  useUserStore,
} from "@/store/userStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
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

const SW = Dimensions.get("window").width;
const TOTAL = 5;

// ─── Typen ────────────────────────────────────────────────────────────────────
type GoalOption = { id: UserGoal; label: string; sub: string; icon: string };
type TimeOption = {
  id: FocusTime;
  label: string;
  sub: string;
  icon: string;
  hour: number;
};
type MinOption = { label: string; sub: string; minutes: number };

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "study",
    label: "Studium & Schule",
    sub: "Prüfungen, Hausarbeiten, Lernen",
    icon: "school-outline",
  },
  {
    id: "work",
    label: "Beruf & Karriere",
    sub: "Deep Work, Projekte, Produktivität",
    icon: "briefcase-outline",
  },
  {
    id: "language",
    label: "Sprachen lernen",
    sub: "Vokabeln, Grammatik, Üben",
    icon: "globe-outline",
  },
  {
    id: "personal",
    label: "Persönliches Wachstum",
    sub: "Lesen, Kreativität, Hobbys",
    icon: "leaf-outline",
  },
];

const MIN_OPTIONS: MinOption[] = [
  { label: "30 Min", sub: "Leichter Einstieg", minutes: 30 },
  { label: "1 Stunde", sub: "Solides Fundament", minutes: 60 },
  { label: "2 Stunden", sub: "Ernsthafte Disziplin", minutes: 120 },
  { label: "3h+", sub: "Höchstleistung", minutes: 180 },
];

const TIME_OPTIONS: TimeOption[] = [
  {
    id: "morning",
    label: "Morgens",
    sub: "6 – 12 Uhr",
    icon: "sunny-outline",
    hour: 8,
  },
  {
    id: "afternoon",
    label: "Nachmittags",
    sub: "12 – 17 Uhr",
    icon: "partly-sunny-outline",
    hour: 14,
  },
  {
    id: "evening",
    label: "Abends",
    sub: "17 – 22 Uhr",
    icon: "moon-outline",
    hour: 19,
  },
];

// ─── Auswahl-Karte ────────────────────────────────────────────────────────────
function SelectCard({
  icon,
  label,
  sub,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[sc.card, selected && sc.cardSelected]}
    >
      <View
        style={[
          sc.iconWrap,
          { backgroundColor: selected ? "#3b8995" : "#f1f5f9" },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={selected ? "#fff" : "#64748b"}
        />
      </View>
      <View style={sc.text}>
        <Text style={[sc.label, selected && sc.labelSel]}>{label}</Text>
        <Text style={sc.sub}>{sub}</Text>
      </View>
      <View style={[sc.radio, selected && sc.radioSel]}>
        {selected && <View style={sc.radioDot} />}
      </View>
    </Pressable>
  );
}

const sc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  cardSelected: { borderColor: "#3b8995", backgroundColor: "#f0fbfc" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  text: { flex: 1 },
  label: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  labelSel: { color: "#3b8995" },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSel: { borderColor: "#3b8995" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3b8995",
  },
});

// ─── Haupt-Modal ──────────────────────────────────────────────────────────────
export function OnboardingModal({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const [dismissed, setDismissed] = useState(false);

  // State
  const [index, setIndex] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<UserGoal>("study");
  const [minutes, setMinutes] = useState(60);
  const [focusTime, setFocusTime] = useState<FocusTime>("afternoon");

  const translateX = useRef(new Animated.Value(0)).current;
  const isLast = index === TOTAL - 1;

  function goTo(next: number) {
    if (next < 0 || next >= TOTAL || next === index) return;
    Keyboard.dismiss();
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
      const prefs: UserPrefs = {
        goal,
        dailyFocusMinutes: minutes,
        preferredTime: focusTime,
      };
      setDismissed(true);
      completeOnboarding(name.trim() || "Fokusmensch", prefs);
    } else {
      goTo(index + 1);
    }
  }

  const canNext = index === 0 ? true : true; // alle Slides haben Defaults

  // Zusammenfassung für letzten Slide
  const goalLabel = GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? "";
  const minLabel = MIN_OPTIONS.find((m) => m.minutes === minutes)?.label ?? "";
  const timeLabel = TIME_OPTIONS.find((t) => t.id === focusTime)?.label ?? "";
  const timeHour = TIME_OPTIONS.find((t) => t.id === focusTime)?.hour ?? 14;
  const displayName = name.trim() || "Fokusmensch";

  return (
    <Modal
      visible={visible && !dismissed}
      animationType="fade"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            s.root,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Progress Dots */}
          <View style={s.dotsRow}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  i === index ? s.dotActive : i < index ? s.dotDone : s.dotIdle,
                ]}
              />
            ))}
          </View>

          {/* Slides */}
          <View style={s.viewport}>
            <Animated.View
              style={[
                s.track,
                { width: SW * TOTAL, transform: [{ translateX }] },
              ]}
            >
              {/* ── Slide 0: Willkommen + Name ── */}
              <View style={[s.slide, { width: SW }]}>
                <View style={[s.iconWrap, { backgroundColor: "#f0fbfc" }]}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={48}
                    color="#3b8995"
                  />
                </View>
                <Text style={s.title}>Willkommen bei Vigor</Text>
                <Text style={s.desc}>
                  Dein Study Companion. Kein YouTube-Rabbit-Hole mehr — nur du
                  und dein Fokus.
                </Text>
                <View style={s.inputWrap}>
                  <Text style={s.inputLabel}>Wie heißt du?</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Dein Name"
                    placeholderTextColor="#cbd5e1"
                    style={s.input}
                    returnKeyType="next"
                    onSubmitEditing={handleNext}
                    autoFocus={index === 0}
                    maxLength={30}
                  />
                </View>
              </View>

              {/* ── Slide 1: Hauptziel ── */}
              <View
                style={[
                  s.slide,
                  { width: SW, justifyContent: "flex-start", paddingTop: 8 },
                ]}
              >
                <Text style={s.title}>Was ist dein Ziel?</Text>
                <Text style={s.descSm}>
                  Vigor passt sich an deine Bedürfnisse an.
                </Text>
                <View style={s.optionList}>
                  {GOAL_OPTIONS.map((opt) => (
                    <SelectCard
                      key={opt.id}
                      icon={opt.icon}
                      label={opt.label}
                      sub={opt.sub}
                      selected={goal === opt.id}
                      onPress={() => setGoal(opt.id)}
                    />
                  ))}
                </View>
              </View>

              {/* ── Slide 2: Tägliches Fokusziel ── */}
              <View
                style={[
                  s.slide,
                  { width: SW, justifyContent: "flex-start", paddingTop: 8 },
                ]}
              >
                <Text style={s.title}>Dein tägliches Ziel</Text>
                <Text style={s.descSm}>
                  Wie lange willst du täglich fokussieren?
                </Text>
                <View style={s.optionList}>
                  {MIN_OPTIONS.map((opt) => (
                    <SelectCard
                      key={opt.minutes}
                      icon={
                        opt.minutes <= 30
                          ? "timer-outline"
                          : opt.minutes <= 60
                          ? "time-outline"
                          : opt.minutes <= 120
                          ? "flame-outline"
                          : "trophy-outline"
                      }
                      label={opt.label}
                      sub={opt.sub}
                      selected={minutes === opt.minutes}
                      onPress={() => setMinutes(opt.minutes)}
                    />
                  ))}
                </View>
              </View>

              {/* ── Slide 3: Tageszeit ── */}
              <View
                style={[
                  s.slide,
                  { width: SW, justifyContent: "flex-start", paddingTop: 8 },
                ]}
              >
                <Text style={s.title}>Wann fokussierst du?</Text>
                <Text style={s.descSm}>
                  Vigor erinnert dich täglich zur richtigen Zeit.
                </Text>
                <View style={s.optionList}>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectCard
                      key={opt.id}
                      icon={opt.icon}
                      label={opt.label}
                      sub={opt.sub}
                      selected={focusTime === opt.id}
                      onPress={() => setFocusTime(opt.id)}
                    />
                  ))}
                </View>
                <View style={s.notifHint}>
                  <Ionicons
                    name="notifications-outline"
                    size={14}
                    color="#3b8995"
                  />
                  <Text style={s.notifHintText}>
                    Wir senden dir täglich um {timeHour}:00 Uhr eine Erinnerung.
                  </Text>
                </View>
              </View>

              {/* ── Slide 4: Bereit ── */}
              <View style={[s.slide, { width: SW }]}>
                <View style={[s.iconWrap, { backgroundColor: "#fffbeb" }]}>
                  <MaterialCommunityIcons
                    name="fire"
                    size={48}
                    color="#f59e0b"
                  />
                </View>
                <Text style={s.title}>
                  Alles bereit{name.trim() ? `, ${name.trim()}` : ""}!
                </Text>
                <Text style={s.desc}>
                  Dein persönlicher Fokus-Plan ist gesetzt.
                </Text>
                <View style={s.summaryCard}>
                  <SummaryRow
                    icon="flag-outline"
                    label="Ziel"
                    value={goalLabel}
                  />
                  <SummaryRow
                    icon="timer-outline"
                    label="Täglich"
                    value={minLabel}
                  />
                  <SummaryRow
                    icon="alarm-outline"
                    label="Erinnerung"
                    value={`${timeLabel}, ${timeHour}:00 Uhr`}
                  />
                </View>
                <Text style={s.readyHint}>
                  Du kannst alles später in den Einstellungen ändern.
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <View style={s.footerRow}>
              {index > 0 && (
                <Pressable
                  onPress={() => goTo(index - 1)}
                  style={s.backBtn}
                  hitSlop={10}
                >
                  <Ionicons name="arrow-back" size={18} color="#94a3b8" />
                </Pressable>
              )}
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [
                  s.nextBtn,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={s.nextBtnText}>
                  {isLast ? "Los geht's!" : "Weiter"}
                </Text>
                <Ionicons
                  name={isLast ? "checkmark" : "arrow-forward"}
                  size={18}
                  color="#fff"
                />
              </Pressable>
            </View>
            {index === 0 && (
              <Pressable
                onPress={() => {
                  setDismissed(true);
                  completeOnboarding("_onboarded", {
                    goal: "study",
                    dailyFocusMinutes: 60,
                    preferredTime: "afternoon",
                  });
                }}
                style={s.skipBtn}
              >
                <Text style={s.skipTx}>Überspringen</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={sr.row}>
      <Ionicons name={icon as any} size={15} color="#3b8995" />
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value}>{value}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 13, color: "#94a3b8", flex: 1 },
  value: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: { height: 4, borderRadius: 2 },
  dotActive: { width: 24, backgroundColor: "#3b8995" },
  dotDone: { width: 8, backgroundColor: "#a5e8ef" },
  dotIdle: { width: 8, backgroundColor: "#e2e8f0" },
  viewport: { flex: 1, overflow: "hidden" },
  track: { flexDirection: "row", flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
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
  desc: { fontSize: 15, color: "#64748b", textAlign: "center", lineHeight: 22 },
  descSm: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 4,
  },
  inputWrap: { width: "100%", gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  input: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#3b8995",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: "600",
    color: "#0f172a",
    backgroundColor: "#f8f9fb",
    textAlign: "center",
  },
  optionList: { width: "100%", gap: 8 },
  notifHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  notifHintText: { fontSize: 12, color: "#3b8995", flex: 1, lineHeight: 17 },
  summaryCard: {
    width: "100%",
    backgroundColor: "#f8f9fb",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  readyHint: { fontSize: 12, color: "#cbd5e1", textAlign: "center" },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 48,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b8995",
    borderRadius: 16,
    paddingVertical: 15,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skipBtn: { alignItems: "center", paddingVertical: 4 },
  skipTx: { fontSize: 13, color: "#cbd5e1" },
});
