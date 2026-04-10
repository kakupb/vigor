// components/today/OnboardingModal.tsx
// Neues Onboarding — 6 Slides (war: 5).
// NEU: Slide 4 = Habit-Template-Auswahl.
// Ausgewählte Templates werden beim Abschluss automatisch als Habits angelegt.

import { HABIT_TEMPLATES } from "@/constants/habitTemplates";
import { useHabitStore } from "@/store/habitStore";
import {
  FocusTime,
  UserGoal,
  UserPrefs,
  useUserStore,
} from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SW = Dimensions.get("window").width;
const TOTAL = 6; // war 5 — neuer Slide: Habit-Templates

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

// ─── Template-Chip ────────────────────────────────────────────────────────────
function TemplateChip({
  emoji,
  label,
  description,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[tc.chip, selected ? tc.chipSelected : tc.chipDefault]}
    >
      <Text style={tc.emoji}>{emoji}</Text>
      <View style={tc.textWrap}>
        <Text style={[tc.label, selected && tc.labelSelected]}>{label}</Text>
        <Text style={tc.sub}>{description}</Text>
      </View>
      <View style={[tc.check, selected && tc.checkSelected]}>
        {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
    </Pressable>
  );
}

const tc = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  chipDefault: { borderColor: "#e2e8f0", backgroundColor: "#fff" },
  chipSelected: { borderColor: "#3b8995", backgroundColor: "#f0fbfc" },
  emoji: { fontSize: 22, width: 32, textAlign: "center" },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  labelSelected: { color: "#0f172a" },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  checkSelected: { backgroundColor: "#3b8995", borderColor: "#3b8995" },
});

// ─── Haupt-Modal ──────────────────────────────────────────────────────────────
export function OnboardingModal({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const addHabit = useHabitStore((s) => s.addHabit);
  const [dismissed, setDismissed] = useState(false);

  // State
  const [index, setIndex] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<UserGoal>("study");
  const [minutes, setMinutes] = useState(60);
  const [focusTime, setFocusTime] = useState<FocusTime>("afternoon");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([
    "tpl_lernen",
    "tpl_sport",
  ]); // 2 vorausgewählt — sofortiger Wert ohne Aufwand

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

  function toggleTemplate(id: string) {
    setSelectedTemplates((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleNext() {
    if (isLast) {
      const prefs: UserPrefs = {
        goal,
        dailyFocusMinutes: minutes,
        preferredTime: focusTime,
      };

      // ── Ausgewählte Habit-Templates anlegen ──────────────────────────
      const templatesToCreate = HABIT_TEMPLATES.filter((t) =>
        selectedTemplates.includes(t.id)
      );
      templatesToCreate.forEach((t) => {
        addHabit(
          t.title,
          t.kind,
          t.category,
          t.unit,
          t.dailyTarget,
          t.schedule,
          undefined
        );
      });

      setDismissed(true);
      completeOnboarding(name.trim() || "Fokusmensch", prefs);
    } else {
      goTo(index + 1);
    }
  }

  // Zusammenfassung für letzten Slide
  const goalLabel = GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? goal;
  const timeLabel =
    TIME_OPTIONS.find((t) => t.id === focusTime)?.label ?? focusTime;

  if (!visible || dismissed) return null;

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={[
          ob.root,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Fortschrittsbalken ── */}
        <View style={ob.progressTrack}>
          <View
            style={[
              ob.progressFill,
              { width: `${((index + 1) / TOTAL) * 100}%` as any },
            ]}
          />
        </View>

        {/* ── Slides ── */}
        <View style={ob.slideContainer}>
          <Animated.View
            style={[ob.slidesRow, { transform: [{ translateX }] }]}
          >
            {/* ── Slide 0: Name ── */}
            <View style={[ob.slide, { width: SW }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={ob.slideContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={ob.headline}>Wie heißt du?</Text>
                <Text style={ob.sub}>
                  Damit Vigor dich persönlich begrüßen kann.
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Dein Name"
                  placeholderTextColor="#94a3b8"
                  style={ob.nameInput}
                  returnKeyType="next"
                  onSubmitEditing={() => goTo(1)}
                  autoFocus
                  maxLength={30}
                />
              </ScrollView>
            </View>

            {/* ── Slide 1: Ziel ── */}
            <View style={[ob.slide, { width: SW }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={ob.slideContent}
              >
                <Text style={ob.headline}>Was ist dein Ziel?</Text>
                <Text style={ob.sub}>Vigor passt sich deinem Fokus an.</Text>
                <View style={ob.cardList}>
                  {GOAL_OPTIONS.map((g) => (
                    <SelectCard
                      key={g.id}
                      icon={g.icon}
                      label={g.label}
                      sub={g.sub}
                      selected={goal === g.id}
                      onPress={() => setGoal(g.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ── Slide 2: Fokuszeit ── */}
            <View style={[ob.slide, { width: SW }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={ob.slideContent}
              >
                <Text style={ob.headline}>Wie lange täglich?</Text>
                <Text style={ob.sub}>Dein tägliches Fokus-Ziel.</Text>
                <View style={ob.cardList}>
                  {MIN_OPTIONS.map((m) => (
                    <SelectCard
                      key={m.minutes}
                      icon="timer-outline"
                      label={m.label}
                      sub={m.sub}
                      selected={minutes === m.minutes}
                      onPress={() => setMinutes(m.minutes)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ── Slide 3: Uhrzeit ── */}
            <View style={[ob.slide, { width: SW }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={ob.slideContent}
              >
                <Text style={ob.headline}>Wann fokussierst du?</Text>
                <Text style={ob.sub}>
                  Für kluge Erinnerungen zur richtigen Zeit.
                </Text>
                <View style={ob.cardList}>
                  {TIME_OPTIONS.map((t) => (
                    <SelectCard
                      key={t.id}
                      icon={t.icon}
                      label={t.label}
                      sub={t.sub}
                      selected={focusTime === t.id}
                      onPress={() => setFocusTime(t.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ── Slide 4: Habit-Templates (NEU) ── */}
            <View style={[ob.slide, { width: SW }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={ob.slideContent}
              >
                <Text style={ob.headline}>Welche Habits?</Text>
                <Text style={ob.sub}>
                  Wähle aus — sie werden direkt angelegt.{"\n"}
                  Du kannst jederzeit mehr hinzufügen.
                </Text>
                <View style={ob.cardList}>
                  {HABIT_TEMPLATES.map((t) => (
                    <TemplateChip
                      key={t.id}
                      emoji={t.emoji}
                      label={t.title}
                      description={t.description}
                      selected={selectedTemplates.includes(t.id)}
                      onPress={() => toggleTemplate(t.id)}
                    />
                  ))}
                </View>
                {selectedTemplates.length === 0 && (
                  <Text style={ob.skipHint}>
                    Kein Problem — du kannst Habits später manuell erstellen.
                  </Text>
                )}
              </ScrollView>
            </View>

            {/* ── Slide 5: Zusammenfassung ── */}
            <View style={[ob.slide, { width: SW }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={ob.slideContent}
              >
                <Text style={ob.headline}>
                  {name.trim() ? `Bereit, ${name.trim()}!` : "Alles bereit!"}
                </Text>
                <Text style={ob.sub}>
                  Deine Vigor-Einrichtung auf einen Blick.
                </Text>

                <View style={ob.summaryCard}>
                  <SummaryRow
                    icon="trophy-outline"
                    label="Ziel"
                    value={goalLabel}
                  />
                  <SummaryRow
                    icon="timer-outline"
                    label="Täglich"
                    value={`${minutes} Min Fokus`}
                  />
                  <SummaryRow
                    icon="time-outline"
                    label="Uhrzeit"
                    value={timeLabel}
                  />
                  <SummaryRow
                    icon="flame-outline"
                    label="Habits"
                    value={
                      selectedTemplates.length === 0
                        ? "Noch keine — später hinzufügen"
                        : `${selectedTemplates.length} Template${
                            selectedTemplates.length > 1 ? "s" : ""
                          } ausgewählt`
                    }
                  />
                </View>

                <View style={ob.ctaBox}>
                  <Text style={ob.ctaTitle}>🎯 Los geht's</Text>
                  <Text style={ob.ctaSub}>
                    Starte deine erste Session.{"\n"}
                    Jeder Tag Fokus baut deinen Streak auf.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>

        {/* ── Navigation ── */}
        <View style={[ob.nav, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={() => goTo(index - 1)}
            style={[ob.backBtn, index === 0 && { opacity: 0 }]}
            disabled={index === 0}
          >
            <Ionicons name="chevron-back" size={20} color="#64748b" />
          </Pressable>

          {/* Punkte */}
          <View style={ob.dots}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <View
                key={i}
                style={[
                  ob.dot,
                  i === index && ob.dotActive,
                  i < index && ob.dotDone,
                ]}
              />
            ))}
          </View>

          <Pressable onPress={handleNext} style={ob.nextBtn}>
            <Text style={ob.nextTx}>{isLast ? "Starten" : "Weiter"}</Text>
            <Ionicons
              name={isLast ? "checkmark" : "arrow-forward"}
              size={18}
              color="#fff"
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Zusammenfassungs-Zeile ───────────────────────────────────────────────────
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
      <Ionicons name={icon as any} size={16} color="#3b8995" />
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  label: { fontSize: 14, color: "#64748b", fontWeight: "500", width: 70 },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "right",
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const ob = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  progressTrack: {
    height: 3,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 24,
    borderRadius: 2,
  },
  progressFill: { height: 3, backgroundColor: "#3b8995", borderRadius: 2 },

  slideContainer: { flex: 1, overflow: "hidden" },
  slidesRow: { flexDirection: "row", flex: 1 },
  slide: { flex: 1 },
  slideContent: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 16,
  },

  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  sub: { fontSize: 15, color: "#64748b", lineHeight: 22 },

  cardList: { gap: 10 },

  nameInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    backgroundColor: "#f8f9fb",
  },

  skipHint: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: "#f8f9fb",
    gap: 0,
  },

  ctaBox: {
    backgroundColor: "#f0fbfc",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#a5e8ef",
    alignItems: "center",
    gap: 6,
  },
  ctaTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  ctaSub: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },

  // Navigation
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e2e8f0" },
  dotActive: { width: 20, backgroundColor: "#3b8995", borderRadius: 3 },
  dotDone: { backgroundColor: "#a5e8ef" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3b8995",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  nextTx: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
