// components/categories/CreateCategorySheet.tsx

import { ColorPickerField } from "@/components/categories/ColorPickerField";
import { useAppColors } from "@/hooks/useAppColors";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
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

const SYMBOL_ICONS: string[] = [
  "book-outline",
  "barbell-outline",
  "bicycle-outline",
  "brush-outline",
  "cafe-outline",
  "camera-outline",
  "car-outline",
  "card-outline",
  "cart-outline",
  "chatbubble-outline",
  "code-outline",
  "color-palette-outline",
  "compass-outline",
  "desktop-outline",
  "document-text-outline",
  "earth-outline",
  "flame-outline",
  "flask-outline",
  "flower-outline",
  "football-outline",
  "game-controller-outline",
  "gift-outline",
  "globe-outline",
  "hammer-outline",
  "headset-outline",
  "heart-outline",
  "home-outline",
  "hourglass-outline",
  "leaf-outline",
  "library-outline",
  "location-outline",
  "lock-outline",
  "medical-outline",
  "megaphone-outline",
  "mic-outline",
  "moon-outline",
  "musical-notes-outline",
  "newspaper-outline",
  "nutrition-outline",
  "people-outline",
  "person-outline",
  "phone-portrait-outline",
  "pizza-outline",
  "planet-outline",
  "pricetag-outline",
  "pulse-outline",
  "ribbon-outline",
  "rocket-outline",
  "school-outline",
  "settings-outline",
  "shirt-outline",
  "star-outline",
  "sunny-outline",
  "tennisball-outline",
  "terminal-outline",
  "timer-outline",
  "trail-sign-outline",
  "trophy-outline",
  "wallet-outline",
  "water-outline",
];

const ICONS_VISIBLE = 10;

type IconType =
  | { kind: "ion"; name: string }
  | { kind: "text"; value: string }
  | { kind: "emoji"; value: string }
  | { kind: "image"; uri: string };

type Tab = "symbols" | "custom";
type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
};

export function CreateCategorySheet({ visible, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { add } = useCustomCategoryStore();

  const [label, setLabel] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b8995");
  const [selectedIcon, setSelectedIcon] = useState<IconType>({
    kind: "ion",
    name: "star-outline",
  });
  const [tab, setTab] = useState<Tab>("symbols");
  const [customText, setCustomText] = useState("");
  const [showAllIcons, setShowAllIcons] = useState(false);

  const visibleIcons = showAllIcons
    ? SYMBOL_ICONS
    : SYMBOL_ICONS.slice(0, ICONS_VISIBLE);

  function iconToString(icon: IconType): string {
    if (icon.kind === "ion") return `ion:${icon.name}`;
    if (icon.kind === "text") return `text:${icon.value}`;
    if (icon.kind === "emoji") return `emoji:${icon.value}`;
    return `image:${icon.uri}`;
  }

  function handleSave() {
    if (!label.trim()) {
      Alert.alert("Name fehlt", "Bitte gib einen Namen ein.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    add(label.trim(), selectedColor, iconToString(selectedIcon));
    onCreated?.(`custom_${Date.now()}`);
    handleClose();
  }

  function handleClose() {
    setLabel("");
    setSelectedColor("#3b8995");
    setSelectedIcon({ kind: "ion", name: "star-outline" });
    setTab("symbols");
    setCustomText("");
    setShowAllIcons(false);
    Keyboard.dismiss();
    onClose();
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled)
      setSelectedIcon({ kind: "image", uri: result.assets[0].uri });
  }

  function renderPreviewIcon() {
    if (selectedIcon.kind === "ion")
      return (
        <Ionicons name={selectedIcon.name as any} size={24} color="#fff" />
      );
    if (selectedIcon.kind === "text")
      return (
        <Text
          style={{
            color: "#fff",
            fontWeight: "800",
            fontSize: selectedIcon.value.length > 2 ? 13 : 18,
          }}
        >
          {selectedIcon.value}
        </Text>
      );
    if (selectedIcon.kind === "emoji")
      return <Text style={{ fontSize: 24 }}>{selectedIcon.value}</Text>;
    if (selectedIcon.kind === "image")
      return (
        <Image
          source={{ uri: selectedIcon.uri }}
          style={{ width: 32, height: 32, borderRadius: 8 }}
        />
      );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[s.root, { backgroundColor: c.cardBg }]}>
          <View style={[s.handle, { backgroundColor: c.borderDefault }]} />

          <View style={s.header}>
            <Text style={[s.title, { color: c.textPrimary }]}>
              Neue Kategorie
            </Text>
            <Pressable
              onPress={handleClose}
              style={[s.closeBtn, { backgroundColor: c.subtleBg }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={c.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.content,
              { paddingBottom: insets.bottom + 40 },
            ]}
          >
            {/* Preview */}
            <View
              style={[
                s.previewRow,
                {
                  backgroundColor: selectedColor + "18",
                  borderColor: selectedColor + "40",
                },
              ]}
            >
              <View style={[s.previewIcon, { backgroundColor: selectedColor }]}>
                {renderPreviewIcon()}
              </View>
              <Text style={[s.previewLabel, { color: selectedColor }]}>
                {label.trim() || "Meine Kategorie"}
              </Text>
            </View>

            {/* Name */}
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>Name</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="z.B. Sprachen, Musik, Lesen..."
                placeholderTextColor={c.textDisabled}
                style={[
                  s.input,
                  {
                    color: c.textPrimary,
                    backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                    borderColor:
                      label.length > 0 ? selectedColor : c.borderDefault,
                  },
                ]}
                maxLength={24}
                returnKeyType="done"
                autoFocus
              />
            </View>

            {/* Symbol */}
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>
                Symbol
              </Text>
              <View style={s.tabRow}>
                {(["symbols", "custom"] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={[
                      s.tabBtn,
                      {
                        backgroundColor:
                          tab === t
                            ? selectedColor
                            : c.dark
                            ? "#1e293b"
                            : "#f1f5f9",
                        borderColor:
                          tab === t ? selectedColor : c.borderDefault,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.tabText,
                        { color: tab === t ? "#fff" : c.textSecondary },
                      ]}
                    >
                      {t === "symbols" ? "Symbole" : "Eigenes"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab === "symbols" && (
                <>
                  <View style={s.iconGrid}>
                    {visibleIcons.map((icon) => {
                      const sel =
                        selectedIcon.kind === "ion" &&
                        selectedIcon.name === icon;
                      return (
                        <Pressable
                          key={icon}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedIcon({ kind: "ion", name: icon });
                          }}
                          style={[
                            s.iconBtn,
                            {
                              backgroundColor: sel
                                ? selectedColor
                                : c.dark
                                ? "#1e293b"
                                : "#f1f5f9",
                              borderColor: sel ? selectedColor : "transparent",
                            },
                          ]}
                        >
                          <Ionicons
                            name={icon as any}
                            size={20}
                            color={sel ? "#fff" : c.textSecondary}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    onPress={() => setShowAllIcons(!showAllIcons)}
                    style={[
                      s.moreBtn,
                      {
                        borderColor: c.borderDefault,
                        backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                      },
                    ]}
                  >
                    <Ionicons
                      name={showAllIcons ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={c.textMuted}
                    />
                    <Text style={[s.moreBtnText, { color: c.textMuted }]}>
                      {showAllIcons
                        ? "Weniger anzeigen"
                        : `${
                            SYMBOL_ICONS.length - ICONS_VISIBLE
                          } weitere Symbole`}
                    </Text>
                  </Pressable>
                </>
              )}

              {tab === "custom" && (
                <View style={s.customSection}>
                  <Text style={[s.customHint, { color: c.textMuted }]}>
                    Tippe Text, Buchstaben oder ein Emoji — z.B. "AB" oder "🎯"
                  </Text>
                  <TextInput
                    value={customText}
                    onChangeText={(v) => {
                      setCustomText(v);
                      const trimmed = v.trim();
                      if (!trimmed) return;
                      // Emoji-Erkennung: codepoint > 127
                      const isEmoji = [...trimmed].some(
                        (c) => c.codePointAt(0)! > 127
                      );
                      if (isEmoji) {
                        setSelectedIcon({
                          kind: "emoji",
                          value: trimmed.slice(0, 2),
                        });
                      } else {
                        setSelectedIcon({
                          kind: "text",
                          value: trimmed.slice(0, 3).toUpperCase(),
                        });
                      }
                    }}
                    placeholder='z.B.  "AB"  oder  "🎯"'
                    placeholderTextColor={c.textDisabled}
                    style={[
                      s.customSingleInput,
                      {
                        color: c.textPrimary,
                        backgroundColor: c.dark ? "#0f172a" : "#f8f9fb",
                        borderColor:
                          customText.length > 0
                            ? selectedColor
                            : c.borderDefault,
                        fontSize: customText.length > 0 ? 24 : 15,
                      },
                    ]}
                    maxLength={4}
                    autoCapitalize="characters"
                    textAlign="center"
                  />

                  <Pressable
                    onPress={pickImage}
                    style={[
                      s.imageBtn,
                      {
                        backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
                        borderColor: c.borderDefault,
                      },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={18}
                      color={c.textSecondary}
                    />
                    <Text style={[s.imageBtnText, { color: c.textSecondary }]}>
                      {selectedIcon.kind === "image"
                        ? "Bild gewählt ✓"
                        : "Bild aus Bibliothek"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Farbauswahl */}
            <View style={s.section}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>
                Farbe
              </Text>
              <ColorPickerField
                color={selectedColor}
                onChange={setSelectedColor}
              />
            </View>

            {/* Speichern */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                s.saveBtn,
                { backgroundColor: selectedColor },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.saveBtnText}>Kategorie erstellen</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  content: { paddingHorizontal: 20, gap: 20 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  previewLabel: { fontSize: 17, fontWeight: "700" },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  tabRow: { flexDirection: "row", gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  moreBtnText: { fontSize: 13, fontWeight: "500" },
  customSection: { gap: 12 },
  customHint: { fontSize: 12, lineHeight: 18 },
  customSingleInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 72,
    textAlign: "center",
  },
  imageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  imageBtnText: { fontSize: 14, fontWeight: "500" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
