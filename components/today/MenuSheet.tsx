// components/today/MenuSheet.tsx
import { WorkoutHistoryModal } from "@/components/stats/WorkoutHistoryModal";
import { useUserStore } from "@/store/userStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MenuItem = {
  icon: string;
  label: string;
  sublabel?: string;
  color: string;
  bg: string;
  onPress: () => void;
  badge?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function MenuSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name, setName } = useUserStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(name ?? "");
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    await setName(trimmed);
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Daten",
      items: [
        {
          icon: "fitness-outline",
          label: "Trainings importieren",
          sublabel: "Aus Apple Health",
          color: "#3b8995",
          bg: "#f0fbfc",
          onPress: () => {
            onClose();
            setTimeout(() => setWorkoutModalVisible(true), 300);
          },
        },
        {
          icon: "cloud-download-outline",
          label: "Daten exportieren",
          sublabel: "Habits, Planner & Notizen als JSON",
          color: "#8b5cf6",
          bg: "#f5f3ff",
          onPress: () => {
            onClose();
            Alert.alert("Export", "Diese Funktion kommt bald.");
          },
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-circle-outline",
          label: "Hilfe & FAQ",
          sublabel: "Wie funktioniert die App?",
          color: "#f59e0b",
          bg: "#fffbeb",
          onPress: () => {
            onClose();
            Alert.alert("Hilfe", "Die Hilfe-Seite kommt bald.");
          },
        },
        {
          icon: "chatbubble-outline",
          label: "Feedback senden",
          sublabel: "Was kann besser werden?",
          color: "#10b981",
          bg: "#f0fdf4",
          onPress: () => {
            onClose();
            Linking.openURL(
              "mailto:feedback@habittracker.app?subject=Feedback"
            );
          },
        },
        {
          icon: "star-outline",
          label: "App bewerten",
          sublabel: "Im App Store bewerten",
          color: "#f59e0b",
          bg: "#fffbeb",
          onPress: () => {
            onClose();
            Alert.alert("Bewerten", "Danke! App Store Link kommt bald.");
          },
        },
      ],
    },
    {
      title: "Rechtliches",
      items: [
        {
          icon: "shield-checkmark-outline",
          label: "Datenschutz",
          sublabel: "Wie wir mit deinen Daten umgehen",
          color: "#64748b",
          bg: "#f8f9fb",
          onPress: () => {
            onClose();
            Alert.alert(
              "Datenschutz",
              "Alle Daten werden ausschliesslich lokal auf deinem Geraet gespeichert. Nichts wird an externe Server uebertragen.",
              [{ text: "Verstanden" }]
            );
          },
        },
        {
          icon: "document-text-outline",
          label: "Impressum & Nutzungsbedingungen",
          color: "#64748b",
          bg: "#f8f9fb",
          onPress: () => {
            onClose();
            Alert.alert("Impressum", "Impressum folgt in Kuerze.");
          },
        },
      ],
    },
  ];

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Menü</Text>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.content,
              { paddingBottom: insets.bottom + 32 },
            ]}
          >
            {/* Profil-Karte */}
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
                    <Ionicons name="pencil-outline" size={14} color="#94a3b8" />
                  </Pressable>
                )}
                <Text style={s.profileSub}>
                  Tippe auf den Namen zum Bearbeiten
                </Text>
              </View>
            </View>

            {/* Sektionen */}
            {sections.map((section) => (
              <View key={section.title} style={s.section}>
                <Text style={s.sectionTitle}>
                  {section.title.toUpperCase()}
                </Text>
                <View style={s.sectionCard}>
                  {section.items.map((item, idx) => (
                    <Pressable
                      key={item.label}
                      onPress={item.onPress}
                      style={({ pressed }) => [
                        s.item,
                        idx < section.items.length - 1 && s.itemBorder,
                        pressed && s.itemPressed,
                      ]}
                    >
                      <View style={[s.itemIcon, { backgroundColor: item.bg }]}>
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color={item.color}
                        />
                      </View>
                      <View style={s.itemText}>
                        <Text style={s.itemLabel}>{item.label}</Text>
                        {item.sublabel && (
                          <Text style={s.itemSublabel}>{item.sublabel}</Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#e2e8f0"
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            {/* App-Version */}
            <Text style={s.version}>Version 1.0.0</Text>
          </ScrollView>
        </View>
      </Modal>

      <WorkoutHistoryModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
      />
    </>
  );
}

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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "white" },
  profileInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  profileSub: { fontSize: 12, color: "#94a3b8" },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: {
    flex: 1,
    fontSize: 16,
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
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
  },

  // Sektion
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.6,
    marginLeft: 4,
    marginBottom: 6,
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
    flexShrink: 0,
  },
  itemText: { flex: 1, gap: 1 },
  itemLabel: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  itemSublabel: { fontSize: 12, color: "#94a3b8" },

  version: {
    fontSize: 12,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 16,
  },
});
