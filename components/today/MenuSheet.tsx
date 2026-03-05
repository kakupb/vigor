// components/today/MenuSheet.tsx
import { WorkoutHistoryModal } from "@/components/stats/WorkoutHistoryModal";
import { useHabitStore } from "@/store/habitStore";
import { useNoteStore } from "@/store/noteStore";
import { usePlannerStore } from "@/store/plannerStore";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── FAQ Daten ────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "Wie erstelle ich ein neues Habit?",
    a: 'Tippe im Heute-Screen auf "+ Habit" oben rechts. Gib einen Titel ein, wähle eine Kategorie und lege fest ob es ein tägliches Check-in oder ein Mengenziel ist.',
  },
  {
    q: "Was ist der Streak?",
    a: "Der Streak zeigt wie viele Tage in Folge du ein Habit abgehakt hast. Wenn du einen Tag aussetzt, startet der Streak von vorne.",
  },
  {
    q: "Wie importiere ich Trainings aus Apple Health?",
    a: 'Tippe oben rechts auf das Menü (···) und dann auf "Trainings importieren". Dort siehst du alle Workouts aus der Health App und kannst sie in den Planner übernehmen.',
  },
  {
    q: "Wie verknüpfe ich eine Notiz mit einem Habit?",
    a: "Öffne eine Notiz zum Bearbeiten. Tippe in der Werkzeugleiste auf das Link-Symbol. Dort kannst du Habits und Plannereinträge auswählen und verknüpfen.",
  },
  {
    q: "Kann ich meine Daten sichern?",
    a: 'Ja – tippe im Menü auf "Daten exportieren". Du erhältst eine JSON-Datei mit all deinen Habits, Plannereinträgen und Notizen, die du speichern oder teilen kannst.',
  },
  {
    q: "Werden meine Daten in die Cloud gespeichert?",
    a: "Nein. Alle Daten bleiben ausschließlich auf deinem Gerät. Es gibt keine Server-Verbindung, kein Konto, keine Weitergabe an Dritte.",
  },
];

// ─── Datenschutz-Inhalt ───────────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {
    title: "Lokale Datenspeicherung",
    text: "Alle von dir eingegebenen Daten – Habits, Planner-Einträge, Notizen und dein Name – werden ausschließlich lokal im Speicher deines Geräts gesichert. Es findet keine Übertragung an Dritte oder externe Server von HabitTracker statt.",
  },
  {
    title: "iCloud Backup",
    text: "iOS sichert App-Daten automatisch in deinem iCloud-Konto, sofern du iCloud Backup aktiviert hast. Diese Sicherung erfolgt durch Apple und unterliegt den Apple-Datenschutzrichtlinien. Du kannst dies unter Einstellungen > [dein Name] > iCloud > Apps, die iCloud nutzen verwalten.",
  },
  {
    title: "Apple Health",
    text: "Die App kann mit Apple HealthKit verbunden werden, um Workout-Daten zu lesen. Diese Daten werden nur auf Anforderung abgerufen und nicht ohne dein Zutun importiert. HabitTracker schreibt keine Daten in Apple Health.",
  },
  {
    title: "Keine Tracker oder Analysen",
    text: "Es werden keine Analyse-Tools, Werbenetzwerke oder Tracking-Dienste eingesetzt. Du wirst nicht verfolgt und es werden keine Nutzungsdaten gesammelt.",
  },
  {
    title: "Kein Konto erforderlich",
    text: "Die App funktioniert vollständig ohne Registrierung oder Anmeldung. Dein Name wird lokal gespeichert und dient nur der personalisierten Begrüßung.",
  },
  {
    title: "Datenlöschung",
    text: "Alle App-Daten werden vollständig gelöscht, wenn du die App deinstallierst. Vorhandene iCloud-Backups kannst du über die iOS-Einstellungen löschen.",
  },
];

// ─── Unterkomponenten ─────────────────────────────────────────────────────────

function FaqItem({ item }: { item: (typeof FAQ)[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      style={({ pressed }) => [
        fq.item,
        pressed && { backgroundColor: "#f8f9fb" },
      ]}
    >
      <View style={fq.row}>
        <Text style={fq.question}>{item.q}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#94a3b8"
        />
      </View>
      {open && <Text style={fq.answer}>{item.a}</Text>}
    </Pressable>
  );
}

const fq = StyleSheet.create({
  item: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: 20,
  },
  answer: { fontSize: 13, color: "#64748b", lineHeight: 20, marginTop: 8 },
});

// ─── Export-Funktion ──────────────────────────────────────────────────────────
async function exportData(
  habits: any[],
  entries: any[],
  notes: any[],
  setExporting: (v: boolean) => void
) {
  setExporting(true);
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: { habits, plannerEntries: entries, notes },
    };
    const json = JSON.stringify(payload, null, 2);
    await Share.share({
      title: "HabitTracker Export",
      message: json,
    });
  } catch (e: any) {
    if (e?.message !== "The user did not share") {
      Alert.alert("Export fehlgeschlagen", "Bitte versuche es erneut.");
    }
  } finally {
    setExporting(false);
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = { visible: boolean; onClose: () => void };
type SubScreen = null | "faq" | "privacy";

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export function MenuSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { name, setName } = useUserStore();
  const habits = useHabitStore((s) => s.habits);
  const entries = usePlannerStore((s) => s.entries);
  const notes = useNoteStore((s) => s.notes);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(name ?? "");
  const [workoutVisible, setWorkoutVisible] = useState(false);
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [exporting, setExporting] = useState(false);

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    await setName(trimmed);
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function close() {
    setSubScreen(null);
    onClose();
  }

  // ── Sub-screen: FAQ ──
  if (subScreen === "faq") {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSubScreen(null)}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          <View style={s.header}>
            <Pressable
              onPress={() => setSubScreen(null)}
              style={s.backBtn}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={20} color="#3b8995" />
              <Text style={s.backText}>Zurück</Text>
            </Pressable>
            <Text style={s.headerTitle}>Hilfe & FAQ</Text>
            <Pressable onPress={close} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={16} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          >
            <View style={s.sectionCard}>
              {FAQ.map((item, i) => (
                <View
                  key={i}
                  style={i < FAQ.length - 1 ? {} : { borderBottomWidth: 0 }}
                >
                  <FaqItem item={item} />
                </View>
              ))}
            </View>
            <Text style={s.subHint}>
              Weitere Fragen? Schreib uns über "Feedback senden".
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── Sub-screen: Datenschutz ──
  if (subScreen === "privacy") {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSubScreen(null)}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          <View style={s.header}>
            <Pressable
              onPress={() => setSubScreen(null)}
              style={s.backBtn}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={20} color="#3b8995" />
              <Text style={s.backText}>Zurück</Text>
            </Pressable>
            <Text style={s.headerTitle}>Datenschutz</Text>
            <Pressable onPress={close} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={16} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.content,
              { paddingBottom: insets.bottom + 32 },
            ]}
          >
            <View style={[s.sectionCard, { gap: 0, padding: 16 }]}>
              {PRIVACY_SECTIONS.map((sec, i) => (
                <View
                  key={i}
                  style={[
                    pr.section,
                    i < PRIVACY_SECTIONS.length - 1 && pr.sectionBorder,
                  ]}
                >
                  <Text style={pr.title}>{sec.title}</Text>
                  <Text style={pr.text}>{sec.text}</Text>
                </View>
              ))}
            </View>
            <Text style={s.subHint}>Stand: März 2026</Text>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── Hauptmenü ──
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Menü</Text>
            <Pressable onPress={close} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={16} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.content,
              { paddingBottom: insets.bottom + 32 },
            ]}
          >
            {/* ── Profil ── */}
            <View style={s.profileCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(name ?? "?")[0].toUpperCase()}
                </Text>
              </View>
              <View style={s.profileInfo}>
                {editingName ? (
                  <View style={s.nameEditRow}>
                    <TextInput
                      style={s.nameInput}
                      value={nameInput}
                      onChangeText={setNameInput}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={saveName}
                      maxLength={30}
                    />
                    <Pressable onPress={saveName} style={s.saveNameBtn}>
                      <Ionicons name="checkmark" size={16} color="white" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setNameInput(name ?? "");
                      setEditingName(true);
                    }}
                    style={s.nameRow}
                  >
                    <Text style={s.profileName}>{name}</Text>
                    <Ionicons name="pencil-outline" size={13} color="#94a3b8" />
                  </Pressable>
                )}
                <Text style={s.profileSub}>Tippe zum Bearbeiten</Text>
              </View>
            </View>

            {/* ── Daten ── */}
            <Text style={s.sectionLabel}>DATEN</Text>
            <View style={s.sectionCard}>
              <MenuItem
                icon="fitness-outline"
                color="#3b8995"
                bg="#f0fbfc"
                label="Trainings importieren"
                sublabel="Aus Apple Health"
                onPress={() => {
                  close();
                  setTimeout(() => setWorkoutVisible(true), 350);
                }}
              />
              <MenuItem
                icon="cloud-download-outline"
                color="#8b5cf6"
                bg="#f5f3ff"
                label="Daten exportieren"
                sublabel={`${habits.length} Habits · ${entries.length} Einträge · ${notes.length} Notizen`}
                last
                loading={exporting}
                onPress={() => exportData(habits, entries, notes, setExporting)}
              />
            </View>

            {/* ── Support ── */}
            <Text style={s.sectionLabel}>SUPPORT</Text>
            <View style={s.sectionCard}>
              <MenuItem
                icon="help-circle-outline"
                color="#f59e0b"
                bg="#fffbeb"
                label="Hilfe & FAQ"
                sublabel="Häufige Fragen zur App"
                onPress={() => setSubScreen("faq")}
              />
              <MenuItem
                icon="chatbubble-ellipses-outline"
                color="#10b981"
                bg="#f0fdf4"
                label="Feedback senden"
                sublabel="feedback@habittracker.app"
                onPress={() => {
                  Linking.openURL(
                    "mailto:feedback@habittracker.app?subject=Feedback%20HabitTracker"
                  );
                }}
              />
              <MenuItem
                icon="star-outline"
                color="#f59e0b"
                bg="#fffbeb"
                label="App bewerten"
                sublabel="Im App Store"
                last
                onPress={() => {
                  // Ersetze APP_STORE_ID mit deiner echten Apple ID
                  Linking.openURL(
                    "itms-apps://itunes.apple.com/app/idAPP_STORE_ID?action=write-review"
                  ).catch(() => Linking.openURL("https://apps.apple.com"));
                }}
              />
            </View>

            {/* ── Rechtliches ── */}
            <Text style={s.sectionLabel}>RECHTLICHES</Text>
            <View style={s.sectionCard}>
              <MenuItem
                icon="shield-checkmark-outline"
                color="#64748b"
                bg="#f8f9fb"
                label="Datenschutz"
                sublabel="Alle Daten bleiben lokal auf deinem Gerät"
                onPress={() => setSubScreen("privacy")}
              />
              <MenuItem
                icon="document-text-outline"
                color="#64748b"
                bg="#f8f9fb"
                label="Impressum"
                sublabel="Angaben gemäß § 5 TMG"
                last
                onPress={() => Alert.alert("Impressum", "Folgt in Kürze.")}
              />
            </View>

            <Text style={s.version}>HabitTracker · Version 1.0.0</Text>
          </ScrollView>
        </View>
      </Modal>

      <WorkoutHistoryModal
        visible={workoutVisible}
        onClose={() => setWorkoutVisible(false)}
      />
    </>
  );
}

// ─── MenuItem Hilfskomponente ─────────────────────────────────────────────────
function MenuItem({
  icon,
  color,
  bg,
  label,
  sublabel,
  last,
  loading,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  bg: string;
  label: string;
  sublabel?: string;
  last?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        s.item,
        !last && s.itemBorder,
        pressed && s.itemPressed,
      ]}
    >
      <View style={[s.itemIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={s.itemText}>
        <Text style={s.itemLabel}>{label}</Text>
        {sublabel && <Text style={s.itemSublabel}>{sublabel}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#94a3b8" />
      ) : (
        <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f9fb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, width: 80 },
  backText: { fontSize: 16, color: "#3b8995", fontWeight: "500" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 16, gap: 4 },

  // Profil
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "white" },
  profileInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  profileSub: { fontSize: 12, color: "#94a3b8" },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    backgroundColor: "#f8f9fb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#3b8995",
  },
  saveNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
  },

  // Sektion
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginLeft: 4,
    marginBottom: 6,
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    backgroundColor: "white",
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  itemPressed: { backgroundColor: "#f8f9fb" },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: { flex: 1, gap: 1 },
  itemLabel: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  itemSublabel: { fontSize: 12, color: "#94a3b8" },

  // Sub-screen
  subHint: {
    fontSize: 12,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 16,
  },
  version: {
    fontSize: 12,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 24,
  },
});

const pr = StyleSheet.create({
  section: { paddingVertical: 14, gap: 6 },
  sectionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  text: { fontSize: 13, color: "#64748b", lineHeight: 20 },
});
