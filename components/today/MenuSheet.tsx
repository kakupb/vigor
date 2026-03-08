// components/today/MenuSheet.tsx
// Hauptmenü — Logout + Konto dauerhaft löschen (DSGVO + App Store Pflicht)
import { WorkoutHistoryModal } from "@/components/stats/WorkoutHistoryModal";
import { useAuthStore } from "@/store/authStore";
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

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "Wie erstelle ich ein neues Habit?",
    a: 'Tippe im Heute-Screen auf "+ Habit". Gib Titel, Kategorie und Intervall ein.',
  },
  {
    q: "Was ist der Streak?",
    a: "Der Streak zeigt wie viele Tage in Folge du ein Habit abgehakt hast.",
  },
  {
    q: "Wie importiere ich Trainings?",
    a: 'Tippe im Menü auf "Trainings importieren". Alle Workouts aus Apple Health werden angezeigt.',
  },
  {
    q: "Werden Gesundheitsdaten hochgeladen?",
    a: "Nein. Apple-Health-Daten (Schlaf, Herzrate, Schritte etc.) verlassen niemals dein Gerät. Das ist eine Apple-Richtlinie.",
  },
  {
    q: "Kann ich meine Daten exportieren?",
    a: 'Ja – tippe auf "Daten exportieren". Du erhältst eine JSON-Datei mit Habits, Planner und Notizen.',
  },
  {
    q: "Was passiert wenn ich mich abmelde?",
    a: "Deine Daten bleiben sicher in der Cloud. Du kannst dich jederzeit wieder anmelden.",
  },
  {
    q: "Wie lösche ich mein Konto?",
    a: 'Tippe im Menü auf "Konto löschen". Alle Daten werden unwiderruflich gelöscht.',
  },
];

// ─── Datenschutz ─────────────────────────────────────────────────────────────
const PRIVACY = [
  {
    title: "Cloud-Speicherung",
    text: "Habits, Planner, Notizen und Profil werden verschlüsselt in Supabase (Frankfurt, EU) gespeichert. Übertragung via HTTPS/TLS, Speicherung via AES-256. Nur du hast Zugriff (Row Level Security).",
  },
  {
    title: "Apple Health",
    text: "HealthKit-Daten werden nur lokal auf deinem Gerät gelesen und niemals übertragen. Wir halten uns strikt an Apples HealthKit-Richtlinien.",
  },
  {
    title: "Kein Tracking, keine Werbung",
    text: "Wir verwenden keine Analytics-Tools, kein Tracking und keine Werbebibliotheken. Deine Daten werden nicht an Dritte weitergegeben.",
  },
  {
    title: "Datenlöschung",
    text: 'Du kannst dein Konto und alle Daten jederzeit dauerhaft löschen. Tippe auf „Konto löschen" im Menü. Die Löschung ist unwiderruflich.',
  },
];

type Sub = null | "faq" | "privacy";

function FaqItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} style={fq.wrap}>
      <View style={fq.row}>
        <Text style={fq.q}>{item.q}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color="#94a3b8"
        />
      </View>
      {open && <Text style={fq.a}>{item.a}</Text>}
    </Pressable>
  );
}

const fq = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  q: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0f172a" },
  a: { fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 19 },
});

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MenuSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { name, setName } = useUserStore();
  const { signOut, deleteAccount, user } = useAuthStore();
  const habits = useHabitStore((s) => s.habits);
  const entries = usePlannerStore((s) => s.entries);
  const notes = useNoteStore((s) => s.notes);

  const [nameInput, setNameInput] = useState(name ?? "");
  const [editingName, setEditingName] = useState(false);
  const [workoutVisible, setWorkoutVisible] = useState(false);
  const [sub, setSub] = useState<Sub>(null);
  const [exporting, setExporting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveName() {
    const t = nameInput.trim();
    if (!t) return;
    await setName(t);
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await Share.share({
        message: JSON.stringify({ habits, entries, notes }, null, 2),
        title: "Vigor Daten",
      });
    } catch {}
    setExporting(false);
  }

  function handleLogout() {
    Alert.alert(
      "Abmelden",
      "Möchtest du dich abmelden? Deine Daten bleiben sicher in der Cloud.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Abmelden",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            onClose();
            await signOut();
            setLoggingOut(false);
          },
        },
      ]
    );
  }

  // ── Konto löschen — zweistufige Bestätigung (App-Store + DSGVO Pflicht) ────
  function handleDeleteAccount() {
    Alert.alert(
      "Konto löschen",
      "Möchtest du dein Konto und ALLE deine Daten dauerhaft löschen?\n\nDiese Aktion ist unwiderruflich.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Konto löschen",
          style: "destructive",
          onPress: () => {
            // Zweite Bestätigung
            Alert.alert(
              "Bist du sicher?",
              "Alle Habits, Notizen, Planner-Einträge und dein Profil werden dauerhaft gelöscht.",
              [
                { text: "Abbrechen", style: "cancel" },
                {
                  text: "Ja, alles löschen",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    onClose();
                    const { error } = await deleteAccount();
                    setDeleting(false);
                    if (error) {
                      Alert.alert(
                        "Fehler",
                        "Konto konnte nicht gelöscht werden: " + error
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  function close() {
    setSub(null);
    onClose();
  }

  // ── Sub: FAQ ──────────────────────────────────────────────────────────────
  if (sub === "faq") {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSub(null)}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          <SubHeader
            title="Hilfe & FAQ"
            onBack={() => setSub(null)}
            onClose={close}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 20,
              paddingBottom: insets.bottom + 32,
            }}
          >
            <View style={s.card}>
              {FAQ.map((item, i) => (
                <FaqItem key={i} item={item} />
              ))}
            </View>
            <Text style={s.hint}>Weitere Fragen? feedback@vigor-app.de</Text>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── Sub: Datenschutz ──────────────────────────────────────────────────────
  if (sub === "privacy") {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSub(null)}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          <SubHeader
            title="Datenschutz"
            onBack={() => setSub(null)}
            onClose={close}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.content,
              { paddingBottom: insets.bottom + 32 },
            ]}
          >
            <View style={[s.card, { padding: 16, gap: 0 }]}>
              {PRIVACY.map((sec, i) => (
                <View
                  key={i}
                  style={[pr.sec, i < PRIVACY.length - 1 && pr.border]}
                >
                  <Text style={pr.title}>{sec.title}</Text>
                  <Text style={pr.text}>{sec.text}</Text>
                </View>
              ))}
            </View>
            <Text style={s.hint}>
              Stand: März 2026 · Alle Daten in EU (Frankfurt)
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── Hauptmenü ─────────────────────────────────────────────────────────────
  const displayName = name && name !== "_onboarded" ? name : null;
  const initials = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          {/* Header */}
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
                <Text style={s.avatarTx}>{initials}</Text>
              </View>
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
                  <Pressable onPress={saveName} style={s.nameSaveBtn}>
                    <Ionicons name="checkmark" size={16} color="white" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setNameInput(displayName ?? "");
                    setEditingName(true);
                  }}
                  style={s.nameRow}
                >
                  <Text style={s.nameTx}>{displayName ?? "Name setzen"}</Text>
                  <Ionicons name="pencil-outline" size={14} color="#94a3b8" />
                </Pressable>
              )}
              {user?.email ? <Text style={s.emailTx}>{user.email}</Text> : null}
            </View>

            {/* ── Aktionen ── */}
            <View style={s.card}>
              <MI
                icon="barbell-outline"
                label="Trainings importieren"
                onPress={() => {
                  onClose();
                  setTimeout(() => setWorkoutVisible(true), 300);
                }}
              />
              <MI
                icon="download-outline"
                label="Daten exportieren"
                onPress={handleExport}
                loading={exporting}
              />
              <MI
                icon="mail-outline"
                label="Feedback senden"
                onPress={() => Linking.openURL("mailto:feedback@vigor-app.de")}
              />
            </View>

            {/* ── Info ── */}
            <View style={s.card}>
              <MI
                icon="help-circle-outline"
                label="Hilfe & FAQ"
                onPress={() => setSub("faq")}
                chevron
              />
              <MI
                icon="shield-checkmark-outline"
                label="Datenschutz"
                onPress={() => setSub("privacy")}
                chevron
              />
            </View>

            {/* ── Konto ── */}
            <View style={s.card}>
              <MI
                icon="log-out-outline"
                label="Abmelden"
                onPress={handleLogout}
                loading={loggingOut}
              />
              <MI
                icon="trash-outline"
                label="Konto löschen"
                onPress={handleDeleteAccount}
                loading={deleting}
                color="#dc2626"
              />
            </View>

            <Text style={s.version}>
              Vigor v1.0.0 · EU-Cloud · AES-256 verschlüsselt
            </Text>
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

// ─── Sub-Screen Header ────────────────────────────────────────────────────────
function SubHeader({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} style={sb.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color="#3b8995" />
        <Text style={sb.backTx}>Zurück</Text>
      </Pressable>
      <Text style={s.headerTitle}>{title}</Text>
      <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
        <Ionicons name="close" size={16} color="#64748b" />
      </Pressable>
    </View>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MI({
  icon,
  label,
  onPress,
  chevron,
  loading,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  chevron?: boolean;
  loading?: boolean;
  color?: string;
}) {
  const c = color ?? "#0f172a";
  const accent = color ?? "#3b8995";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [mi.row, pressed && { opacity: 0.6 }]}
    >
      <View style={[mi.iconWrap, { backgroundColor: accent + "18" }]}>
        {loading ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <Ionicons name={icon} size={17} color={accent} />
        )}
      </View>
      <Text style={[mi.label, { color: c }]}>{label}</Text>
      {chevron && <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  hint: { fontSize: 12, color: "#94a3b8", textAlign: "center" },
  version: {
    fontSize: 11,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 4,
  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0fbfc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#a5e8ef",
  },
  avatarTx: { fontSize: 26, fontWeight: "700", color: "#3b8995" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nameTx: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  emailTx: { fontSize: 12, color: "#94a3b8" },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    backgroundColor: "#f8f9fb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#3b8995",
  },
  nameSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b8995",
    alignItems: "center",
    justifyContent: "center",
  },
});

const mi = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 15, fontWeight: "500" },
});

const pr = StyleSheet.create({
  sec: { paddingVertical: 14 },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  text: { fontSize: 13, color: "#64748b", lineHeight: 19 },
});

const sb = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 2 },
  backTx: { fontSize: 15, color: "#3b8995", fontWeight: "600" },
});
