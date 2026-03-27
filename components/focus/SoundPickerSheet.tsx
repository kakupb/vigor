// components/focus/SoundPickerSheet.tsx
import { useAppColors } from "@/hooks/useAppColors";
import {
  AMBIENT_SOUNDS,
  AmbientSound,
  useFocusStore,
} from "@/store/focusStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SOUND_META: Record<
  AmbientSound,
  { icon: string; color: string; bg: string; bgDark: string; desc: string }
> = {
  none: {
    icon: "volume-mute-outline",
    color: "#94a3b8",
    bg: "#f8fafc",
    bgDark: "#1e293b",
    desc: "Kein Hintergrundton",
  },
  white: {
    icon: "radio-outline",
    color: "#6366f1",
    bg: "#eef2ff",
    bgDark: "#1e1b4b",
    desc: "Gleichmäßiges Rauschen",
  },
  brown: {
    icon: "leaf-outline",
    color: "#92400e",
    bg: "#fef3c7",
    bgDark: "#2d1a00",
    desc: "Tiefes, wärmendes Rauschen",
  },
  rain: {
    icon: "rainy-outline",
    color: "#0369a1",
    bg: "#e0f2fe",
    bgDark: "#0c2233",
    desc: "Sanfter Regenklang",
  },
  ocean: {
    icon: "water-outline",
    color: "#0f766e",
    bg: "#f0fdfa",
    bgDark: "#0d2e29",
    desc: "Wellen am Strand",
  },
  forest: {
    icon: "partly-sunny-outline",
    color: "#15803d",
    bg: "#f0fdf4",
    bgDark: "#0a2e14",
    desc: "Vögel und Wind",
  },
};

type Props = { visible: boolean; onClose: () => void };

export function SoundPickerSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const selectedSound = useFocusStore((s) => s.selectedSound);
  const setSound = useFocusStore((s) => s.setSound);

  function handleSelect(id: AmbientSound) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSound(id);
  }

  const playableSounds = AMBIENT_SOUNDS.filter((s) => s.id !== "none");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { backgroundColor: c.cardBg }]}>
        <View style={[s.handle, { backgroundColor: c.borderDefault }]} />
        <View style={s.header}>
          <Text style={[s.title, { color: c.textPrimary }]}>Ambient Sound</Text>
          <Pressable
            onPress={onClose}
            style={[s.closeBtn, { backgroundColor: c.subtleBg }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={c.textSecondary} />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          <SoundCard
            id="none"
            selected={selectedSound === "none"}
            onPress={() => handleSelect("none")}
            fullWidth
            c={c}
          />
          <View style={s.grid}>
            {playableSounds.map((sound) => (
              <SoundCard
                key={sound.id}
                id={sound.id}
                selected={selectedSound === sound.id}
                onPress={() => handleSelect(sound.id)}
                c={c}
              />
            ))}
          </View>
          <Text style={[s.tip, { color: c.textMuted }]}>
            Sounds loopen automatisch während deiner Session. Du kannst auch
            Spotify oder Apple Music im Hintergrund laufen lassen.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SoundCard({
  id,
  selected,
  onPress,
  fullWidth = false,
  c,
}: {
  id: AmbientSound;
  selected: boolean;
  onPress: () => void;
  fullWidth?: boolean;
  c: ReturnType<typeof useAppColors>;
}) {
  const meta = SOUND_META[id];
  const sound = AMBIENT_SOUNDS.find((s) => s.id === id)!;
  const bgColor = selected ? meta.color : c.dark ? meta.bgDark : meta.bg;
  const iconColor = selected ? "#fff" : meta.color;
  const labelColor = selected ? "#fff" : c.textPrimary;
  const descColor = selected ? "rgba(255,255,255,0.75)" : c.textMuted;
  const borderColor = selected ? meta.color : c.borderDefault;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        fullWidth && s.cardFull,
        { backgroundColor: bgColor, borderColor },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View
        style={[
          s.cardIcon,
          {
            backgroundColor: selected
              ? "rgba(255,255,255,0.2)"
              : c.dark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        <Ionicons name={meta.icon as any} size={22} color={iconColor} />
      </View>
      <View style={s.cardText}>
        <Text style={[s.cardLabel, { color: labelColor }]}>{sound.label}</Text>
        <Text style={[s.cardDesc, { color: descColor }]} numberOfLines={1}>
          {meta.desc}
        </Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { paddingHorizontal: 16, gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "47.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cardFull: { width: "100%" },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardLabel: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  cardDesc: { fontSize: 11 },
  tip: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
    marginTop: 4,
  },
});
