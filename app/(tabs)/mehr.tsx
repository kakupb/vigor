// app/(tabs)/mehr.tsx
// Der "Mehr"-Screen — alles was nicht Fokus, Fortschritt oder Planen ist.
// Notizen, Health, Analyse, Einstellungen.

import { SocialScreen } from "@/components/social/SocialScreen";
import { MenuSheet } from "@/components/today/MenuSheet";
import { useAppColors } from "@/hooks/useAppColors";
import { useHabits } from "@/hooks/useHabits";
import { useFocusStore } from "@/store/focusStore";
import { useNoteStore } from "@/store/noteStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Menü-Zeile ───────────────────────────────────────────────────────────────
function MenuRow({
  icon,
  label,
  subtitle,
  color,
  bg,
  onPress,
  dark,
  badge,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  color: string;
  bg: string;
  onPress: () => void;
  dark: boolean;
  badge?: string | number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        mr.row,
        {
          backgroundColor: dark ? "#1e293b" : "#ffffff",
          borderColor: dark ? "#334155" : "#eef0f4",
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={[mr.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={mr.content}>
        <Text style={[mr.label, { color: dark ? "#f1f5f9" : "#0f172a" }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[mr.sub, { color: dark ? "#64748b" : "#94a3b8" }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {badge !== undefined && (
        <View style={[mr.badge, { backgroundColor: color + "20" }]}>
          <Text style={[mr.badgeText, { color }]}>{badge}</Text>
        </View>
      )}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={dark ? "#475569" : "#cbd5e1"}
      />
    </Pressable>
  );
}

const mr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  content: { flex: 1 },
  label: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
});

// ─── Hauptscreen ──────────────────────────────────────────────────────────────
export default function MehrScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useAppColors();
  const [menuVisible, setMenuVisible] = useState(false);

  const notes = useNoteStore((s) => s.notes);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const { habits } = useHabits();
  const focusStats = useFocusStore((s) => s.stats);
  const [socialVisible, setSocialVisible] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  function makeStyles(c: ReturnType<typeof useAppColors>) {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: c.pageBg },
      header: {
        backgroundColor: c.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
      },
      headerTitle: {
        fontSize: 26,
        fontWeight: "700",
        color: c.textPrimary,
        letterSpacing: -0.4,
      },
      content: { padding: 20, paddingBottom: 40, gap: 8 },
      sectionLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: c.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginTop: 12,
        marginBottom: 8,
      },
      divider: {
        height: 1,
        backgroundColor: c.borderDefault,
        marginVertical: 4,
      },
    });
  }

  const styles = makeStyles(c);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <MenuSheet visible={menuVisible} onClose={() => setMenuVisible(false)} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mehr</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ── Inhalte ── */}
          <Text style={styles.sectionLabel}>Inhalte</Text>

          <MenuRow
            icon="document-text-outline"
            label="Notizen"
            subtitle="Gedanken, Erkenntnisse aus Sessions"
            color="#10b981"
            bg={c.dark ? "#0d2e1e" : "#f0fdf4"}
            onPress={() => router.push("/(tabs)/notes" as any)}
            dark={c.dark}
            badge={notes.length > 0 ? notes.length : undefined}
          />
          <MenuRow
            icon="people-outline"
            label="Freunde & Rangliste"
            subtitle="Lernfreunde hinzufügen, vergleichen"
            color="#4b60af"
            bg={c.dark ? "#0f1433" : "#f0f4ff"}
            onPress={() => setSocialVisible(true)}
            dark={c.dark}
          />

          {Platform.OS === "ios" && (
            <MenuRow
              icon="heart-outline"
              label="Gesundheit"
              subtitle="Schlaf, Herzrate, Trainings aus Apple Health"
              color="#ef4444"
              bg={c.dark ? "#2d0f0f" : "#fef2f2"}
              onPress={() => router.push("/(tabs)/health" as any)}
              dark={c.dark}
            />
          )}

          {/* ── Analyse ── */}
          <Text style={styles.sectionLabel}>Analyse</Text>

          <MenuRow
            icon="bar-chart-outline"
            label="Statistiken"
            subtitle="Detaillierte Auswertung aller Habits"
            color="#8b5cf6"
            bg={c.dark ? "#1e1040" : "#f5f3ff"}
            onPress={() => router.push("/(tabs)/stats" as any)}
            dark={c.dark}
            badge={habits.length > 0 ? `${habits.length} Habits` : undefined}
          />

          {/* ── Einstellungen ── */}
          <Text style={styles.sectionLabel}>Einstellungen</Text>

          <MenuRow
            icon="settings-outline"
            label="Menü & Einstellungen"
            subtitle="Profil, Datenschutz, Export, Konto"
            color="#64748b"
            bg={c.dark ? "#1e293b" : "#f8fafc"}
            onPress={() => setMenuVisible(true)}
            dark={c.dark}
          />
        </View>
      </ScrollView>
      <SocialScreen
        visible={socialVisible}
        onClose={() => setSocialVisible(false)}
      />
    </View>
  );
}
