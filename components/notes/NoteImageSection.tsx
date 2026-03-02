// components/notes/NoteImageSection.tsx
import { NoteImage } from "@/types/note";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MIN_SIZE = 80;
const MAX_SIZE = 280;
const DEFAULT_SIZE = 120;

// ── Resize Handle Sub-Komponente (eigener PanResponder pro Bild) ──
function ResizeHandle({
  size,
  onResize,
}: {
  size: number;
  onResize: (newSize: number) => void;
}) {
  const currentSize = useRef(size);
  currentSize.current = size;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        const delta = (gesture.dx + gesture.dy) * 0.6;
        const newSize = Math.min(
          MAX_SIZE,
          Math.max(MIN_SIZE, currentSize.current + delta)
        );
        onResize(newSize);
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={styles.resizeHandle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="resize-outline" size={12} color="white" />
    </View>
  );
}

type Props = {
  images: NoteImage[];
  onImagesChange: (images: NoteImage[]) => void;
};

export function NoteImageSection({ images, onImagesChange }: Props) {
  const [captionTarget, setCaptionTarget] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageSizes, setImageSizes] = useState<Record<string, number>>({});

  function getSize(id: string) {
    return imageSizes[id] ?? DEFAULT_SIZE;
  }

  function handleResize(id: string, newSize: number) {
    setImageSizes((prev) => ({ ...prev, [id]: newSize }));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const newImages = [...images];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    [newImages[index], newImages[targetIndex]] = [
      newImages[targetIndex],
      newImages[index],
    ];
    onImagesChange(newImages);
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Zugriff benötigt", "Bitte erlaube Zugriff auf deine Fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newImages: NoteImage[] = result.assets.map((asset) => ({
        id: Crypto.randomUUID(),
        uri: asset.uri,
        createdAt: Date.now(),
      }));
      onImagesChange([...images, ...newImages]);
    }
  }

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Zugriff benötigt", "Bitte erlaube Zugriff auf die Kamera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const newImage: NoteImage = {
        id: Crypto.randomUUID(),
        uri: result.assets[0].uri,
        createdAt: Date.now(),
      };
      onImagesChange([...images, newImage]);
    }
  }

  function handleDeleteImage(imageId: string) {
    Alert.alert("Bild entfernen?", "", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Entfernen",
        style: "destructive",
        onPress: () =>
          onImagesChange(images.filter((img) => img.id !== imageId)),
      },
    ]);
  }

  function handleSaveCaption() {
    if (!captionTarget) return;
    onImagesChange(
      images.map((img) =>
        img.id === captionTarget ? { ...img, caption: captionText } : img
      )
    );
    setCaptionTarget(null);
    setCaptionText("");
  }

  return (
    <>
      <View style={styles.section}>
        {/* ── Section Header ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="image-outline" size={15} color="#64748b" />
          <Text style={styles.sectionTitle}>Bilder</Text>
          <View style={styles.headerButtons}>
            <Pressable onPress={handleCamera} style={styles.iconButton}>
              <Ionicons name="camera-outline" size={16} color="#3b8995" />
            </Pressable>
            <Pressable onPress={handlePickImage} style={styles.iconButton}>
              <Ionicons name="add" size={16} color="#3b8995" />
            </Pressable>
            {images.length > 0 && (
              <Pressable
                onPress={() => setIsEditing((v) => !v)}
                style={[
                  styles.editToggle,
                  isEditing && styles.editToggleActive,
                ]}
              >
                <Ionicons
                  name={isEditing ? "checkmark" : "pencil-outline"}
                  size={14}
                  color={isEditing ? "white" : "#64748b"}
                />
                <Text
                  style={[
                    styles.editToggleText,
                    isEditing && styles.editToggleTextActive,
                  ]}
                >
                  {isEditing ? "Fertig" : "Bearbeiten"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Bilder Grid ── */}
        {images.length === 0 ? (
          <Pressable onPress={handlePickImage} style={styles.emptyImages}>
            <Ionicons name="image-outline" size={24} color="#cbd5e1" />
            <Text style={styles.emptyImagesText}>Bilder hinzufügen</Text>
          </Pressable>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageRow}
            scrollEnabled={!isEditing}
          >
            {images.map((image, index) => {
              const size = getSize(image.id);
              return (
                <View
                  key={image.id}
                  style={[styles.imageWrapper, { width: size, height: size }]}
                >
                  <Pressable
                    onPress={() => !isEditing && setPreviewUri(image.uri)}
                    onLongPress={() => {
                      if (!isEditing) {
                        setCaptionTarget(image.id);
                        setCaptionText(image.caption || "");
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    <Image
                      source={{ uri: image.uri }}
                      style={[styles.thumbnail, { width: size, height: size }]}
                    />
                    {image.caption && (
                      <Text style={styles.caption} numberOfLines={1}>
                        {image.caption}
                      </Text>
                    )}
                  </Pressable>

                  {/* ── Edit Overlay ── */}
                  {isEditing && (
                    <>
                      {/* Dunkle Überlagerung */}
                      <View style={styles.editOverlay} pointerEvents="none" />

                      {/* Löschen */}
                      <Pressable
                        onPress={() => handleDeleteImage(image.id)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="close-circle" size={20} color="white" />
                      </Pressable>

                      {/* Reihenfolge ← → */}
                      <View style={styles.reorderRow}>
                        <Pressable
                          onPress={() => moveImage(index, -1)}
                          disabled={index === 0}
                          style={[
                            styles.reorderBtn,
                            index === 0 && styles.reorderBtnDisabled,
                          ]}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={14}
                            color="white"
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => moveImage(index, 1)}
                          disabled={index === images.length - 1}
                          style={[
                            styles.reorderBtn,
                            index === images.length - 1 &&
                              styles.reorderBtnDisabled,
                          ]}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color="white"
                          />
                        </Pressable>
                      </View>

                      {/* Resize Handle (unten rechts) */}
                      <ResizeHandle
                        size={size}
                        onResize={(newSize) => handleResize(image.id, newSize)}
                      />
                    </>
                  )}
                </View>
              );
            })}

            {/* Add more */}
            <Pressable onPress={handlePickImage} style={styles.addImageTile}>
              <Ionicons name="add" size={24} color="#94a3b8" />
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Caption Modal */}
      <Modal
        visible={captionTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCaptionTarget(null)}
      >
        <View style={styles.captionOverlay}>
          <View style={styles.captionModal}>
            <Text style={styles.captionModalTitle}>Beschriftung</Text>
            <TextInput
              value={captionText}
              onChangeText={setCaptionText}
              placeholder="Bildbeschriftung..."
              style={styles.captionInput}
              autoFocus
            />
            <View style={styles.captionActions}>
              <Pressable
                onPress={() => setCaptionTarget(null)}
                style={styles.captionCancel}
              >
                <Text style={styles.captionCancelText}>Abbrechen</Text>
              </Pressable>
              <Pressable onPress={handleSaveCaption} style={styles.captionSave}>
                <Text style={styles.captionSaveText}>Speichern</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Preview */}
      <Modal
        visible={previewUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <Pressable
            onPress={() => setPreviewUri(null)}
            style={styles.previewClose}
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#f0fbfc",
    borderWidth: 1,
    borderColor: "#a5e8ef",
    justifyContent: "center",
    alignItems: "center",
  },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  editToggleActive: {
    backgroundColor: "#0f172a",
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  editToggleTextActive: {
    color: "white",
  },
  emptyImages: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: "#f8f9fb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eef0f4",
    borderStyle: "dashed",
  },
  emptyImagesText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  imageRow: {
    gap: 10,
    paddingBottom: 4,
    alignItems: "flex-start",
  },
  imageWrapper: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  thumbnail: {
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  caption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    fontSize: 10,
    padding: 4,
  },

  // Edit Overlays
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
  },
  deleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  reorderRow: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    gap: 4,
  },
  reorderBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  resizeHandle: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(59,137,149,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  addImageTile: {
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
    borderRadius: 10,
    backgroundColor: "#f8f9fb",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },

  // Caption Modal
  captionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  captionModal: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  captionModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  captionActions: {
    flexDirection: "row",
    gap: 10,
  },
  captionCancel: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    alignItems: "center",
  },
  captionCancelText: {
    fontWeight: "600",
    color: "#64748b",
  },
  captionSave: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#3b8995",
    borderRadius: 10,
    alignItems: "center",
  },
  captionSaveText: {
    fontWeight: "600",
    color: "white",
  },

  // Preview
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },
  previewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 10,
  },
});
