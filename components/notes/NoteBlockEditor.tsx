// components/notes/NoteBlockEditor.tsx
import { copyImageToPersistentStorage } from "@/services/imageStorage";
import {
  NoteBlock,
  NoteImageBlock,
  NoteTableBlock,
  NoteTextBlock,
} from "@/types/note";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
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
const MAX_SIZE = 340;
const DEFAULT_IMAGE_SIZE = 180;
const CELL_WIDTH = 120;
const SCREEN_WIDTH = Dimensions.get("window").width;

export type NoteBlockEditorRef = {
  insertImage: (fromCamera?: boolean) => Promise<void>;
  insertTable: () => void;
};

type Props = {
  blocks: NoteBlock[];
  onBlocksChange: (blocks: NoteBlock[]) => void;
};

function makeId() {
  return Crypto.randomUUID();
}
function makeTextBlock(content = ""): NoteTextBlock {
  return { id: makeId(), type: "text", content };
}

// ─────────────────────────────────────────────
// Resize Handle – eigener PanResponder pro Bild
// ─────────────────────────────────────────────
function ResizeHandle({
  size,
  onResize,
}: {
  size: number;
  onResize: (s: number) => void;
}) {
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const startRef = useRef(size);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = sizeRef.current;
      },
      onPanResponderMove: (_, g) => {
        const next = Math.round(
          Math.min(
            MAX_SIZE,
            Math.max(MIN_SIZE, startRef.current + (g.dx + g.dy) * 0.5)
          )
        );
        onResize(next);
      },
    })
  ).current;

  return (
    <View
      {...pan.panHandlers}
      style={styles.resizeHandle}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="resize-outline" size={11} color="white" />
    </View>
  );
}

// ─────────────────────────────────────────────
// Fullscreen Modal
// ─────────────────────────────────────────────
function FullscreenModal({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={fs.overlay} onPress={onClose}>
        {uri && <Image source={{ uri }} style={fs.img} resizeMode="contain" />}
        <Pressable onPress={onClose} style={fs.closeBtn}>
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
        <Text style={fs.hint}>Tippen zum Schließen</Text>
      </Pressable>
    </Modal>
  );
}
const fs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  img: { width: SCREEN_WIDTH, height: "80%" },
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 20,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  hint: {
    position: "absolute",
    bottom: 40,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
});

// ─────────────────────────────────────────────
// Haupt-Editor
// ─────────────────────────────────────────────
export const NoteBlockEditor = forwardRef<NoteBlockEditorRef, Props>(
  function NoteBlockEditor({ blocks, onBlocksChange }, ref) {
    const [editingTableId, setEditingTableId] = useState<string | null>(null);
    const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
    const focusedIndex = useRef(0);

    // Separate text/table blocks from image blocks
    const textBlocks = blocks.filter((b) => b.type !== "image");
    const imageBlocks = blocks.filter(
      (b) => b.type === "image"
    ) as NoteImageBlock[];

    useImperativeHandle(ref, () => ({
      insertImage: (fromCamera = false) => insertImage(fromCamera),
      insertTable: () => insertTableAt(focusedIndex.current),
    }));

    function updateBlock(id: string, patch: Partial<NoteBlock>) {
      onBlocksChange(
        blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as NoteBlock) : b))
      );
    }

    function deleteBlock(id: string) {
      let next = blocks.filter((b) => b.id !== id);
      if (next.filter((b) => b.type === "text").length === 0)
        next = [makeTextBlock(), ...next];
      onBlocksChange(next);
    }

    function spliceIn(afterIndex: number, newBlocks: NoteBlock[]) {
      // Insert after the given text-block index in the full blocks array
      const textBlockIds = textBlocks.map((b) => b.id);
      const afterId = textBlockIds[afterIndex];
      const insertAfter = afterId
        ? blocks.findIndex((b) => b.id === afterId)
        : blocks.length - 1;
      const next = [...blocks];
      next.splice(insertAfter + 1, 0, ...newBlocks);
      onBlocksChange(next);
    }

    async function insertImage(fromCamera: boolean) {
      const permFn = fromCamera
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;

      const { status, canAskAgain } = await permFn();
      if (status !== "granted") {
        if (!canAskAgain) {
          Alert.alert(
            "Zugriff verweigert",
            "Bitte erlaube den Zugriff unter Einstellungen > Vigor.",
            [
              { text: "Abbrechen", style: "cancel" },
              { text: "Einstellungen", onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert(
            "Zugriff benötigt",
            "Bitte erlaube den Zugriff in den Einstellungen."
          );
        }
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"], // ✅ Ersetzt deprecated MediaTypeOptions.Images
            allowsMultipleSelection: true,
            quality: 0.85,
          });

      if (result.canceled) return;

      // ✅ Bilder in persistenten Speicher kopieren
      const newImages: NoteImageBlock[] = await Promise.all(
        result.assets.map(async (a) => {
          const id = makeId();
          const persistentUri = await copyImageToPersistentStorage(a.uri, id);
          return {
            id,
            type: "image" as const,
            uri: persistentUri,
            size: DEFAULT_IMAGE_SIZE,
            createdAt: Date.now(),
          };
        })
      );

      onBlocksChange([...blocks, ...newImages]);
    }

    function insertTableAt(afterIndex: number) {
      const table: NoteTableBlock = {
        id: makeId(),
        type: "table",
        headers: ["Spalte 1", "Spalte 2"],
        rows: [
          { cells: [{ value: "" }, { value: "" }] },
          { cells: [{ value: "" }, { value: "" }] },
        ],
      };
      spliceIn(afterIndex, [table]);
      setEditingTableId(table.id);
    }

    function updateTable(
      id: string,
      patch: Partial<Pick<NoteTableBlock, "headers" | "rows">>
    ) {
      onBlocksChange(
        blocks.map((b) =>
          b.id === id && b.type === "table" ? { ...b, ...patch } : b
        )
      );
    }

    return (
      <View>
        <FullscreenModal
          uri={fullscreenUri}
          onClose={() => setFullscreenUri(null)}
        />

        {/* ── TEXT & TABLE BLOCKS ── */}
        {textBlocks.map((block, index) => {
          if (block.type === "text") {
            return (
              <TextInput
                key={block.id}
                value={block.content}
                onChangeText={(v) =>
                  updateBlock(block.id, {
                    content: v,
                  } as Partial<NoteTextBlock>)
                }
                onFocus={() => {
                  focusedIndex.current = index;
                }}
                placeholder={textBlocks.length === 1 ? "Schreibe etwas..." : ""}
                placeholderTextColor="#cbd5e1"
                multiline
                style={styles.textInput}
                textAlignVertical="top"
                scrollEnabled={false}
              />
            );
          }

          if (block.type === "table") {
            const isEditing = editingTableId === block.id;
            return (
              <View key={block.id} style={styles.tableWrapper}>
                <View style={styles.tableToolbar}>
                  <Pressable
                    onPress={() =>
                      setEditingTableId(isEditing ? null : block.id)
                    }
                    style={[
                      styles.tableBtn,
                      isEditing && styles.tableBtnActive,
                    ]}
                  >
                    <Ionicons
                      name={isEditing ? "checkmark" : "pencil-outline"}
                      size={13}
                      color={isEditing ? "white" : "#64748b"}
                    />
                    <Text
                      style={[
                        styles.tableBtnText,
                        isEditing && styles.tableBtnTextActive,
                      ]}
                    >
                      {isEditing ? "Fertig" : "Bearbeiten"}
                    </Text>
                  </Pressable>
                  {isEditing && (
                    <>
                      <Pressable
                        onPress={() =>
                          updateTable(block.id, {
                            headers: [
                              ...block.headers,
                              `Spalte ${block.headers.length + 1}`,
                            ],
                            rows: block.rows.map((r) => ({
                              cells: [...r.cells, { value: "" }],
                            })),
                          })
                        }
                        style={styles.tableBtn}
                      >
                        <Text style={styles.tableBtnText}>+ Spalte</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          updateTable(block.id, {
                            rows: [
                              ...block.rows,
                              {
                                cells: block.headers.map(() => ({ value: "" })),
                              },
                            ],
                          })
                        }
                        style={styles.tableBtn}
                      >
                        <Text style={styles.tableBtnText}>+ Zeile</Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable
                    onPress={() =>
                      Alert.alert("Tabelle löschen?", "", [
                        { text: "Abbrechen", style: "cancel" },
                        {
                          text: "Löschen",
                          style: "destructive",
                          onPress: () => deleteBlock(block.id),
                        },
                      ])
                    }
                    style={styles.tableDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={13} color="#ef4444" />
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.tableRow}>
                      {block.headers.map((h, ci) => (
                        <View
                          key={ci}
                          style={[styles.tableCell, styles.tableHeaderCell]}
                        >
                          {isEditing ? (
                            <TextInput
                              value={h}
                              onChangeText={(v) => {
                                const hs = [...block.headers];
                                hs[ci] = v;
                                updateTable(block.id, { headers: hs });
                              }}
                              style={styles.tableHeaderInput}
                            />
                          ) : (
                            <Text style={styles.tableHeaderText}>{h}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                    {block.rows.map((row, ri) => (
                      <View key={ri} style={styles.tableRow}>
                        {row.cells.map((cell, ci) => (
                          <View
                            key={ci}
                            style={[
                              styles.tableCell,
                              ri % 2 === 1 && styles.tableCellAlt,
                            ]}
                          >
                            {isEditing ? (
                              <TextInput
                                value={cell.value}
                                onChangeText={(v) => {
                                  const rows = block.rows.map((r, rIdx) =>
                                    rIdx === ri
                                      ? {
                                          cells: r.cells.map((c, cIdx) =>
                                            cIdx === ci ? { value: v } : c
                                          ),
                                        }
                                      : r
                                  );
                                  updateTable(block.id, { rows });
                                }}
                                style={styles.tableCellInput}
                                placeholder="–"
                              />
                            ) : (
                              <Text style={styles.tableCellText}>
                                {cell.value || "–"}
                              </Text>
                            )}
                          </View>
                        ))}
                        {isEditing && block.rows.length > 1 && (
                          <Pressable
                            onPress={() =>
                              updateTable(block.id, {
                                rows: block.rows.filter((_, i) => i !== ri),
                              })
                            }
                            style={styles.tableDeleteRowBtn}
                          >
                            <Ionicons
                              name="close-circle"
                              size={16}
                              color="#ef4444"
                            />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            );
          }
          return null;
        })}

        {/* ── BILDER UNTEN ── */}
        {imageBlocks.length > 0 && (
          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <Ionicons name="image-outline" size={14} color="#94a3b8" />
              <Text style={styles.imageSectionLabel}>
                Bilder · {imageBlocks.length}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageRow}
            >
              {imageBlocks.map((block) => {
                const size = block.size ?? DEFAULT_IMAGE_SIZE;
                return (
                  <View
                    key={block.id}
                    style={[styles.imageCard, { width: size, height: size }]}
                  >
                    <Pressable
                      onPress={() => setFullscreenUri(block.uri)}
                      style={{ flex: 1 }}
                    >
                      <Image
                        source={{ uri: block.uri }}
                        style={{ width: size, height: size, borderRadius: 12 }}
                        resizeMode="cover"
                      />
                      {block.caption ? (
                        <Text style={styles.imgCaption} numberOfLines={1}>
                          {block.caption}
                        </Text>
                      ) : null}
                    </Pressable>

                    {/* Löschen */}
                    <Pressable
                      onPress={() =>
                        Alert.alert("Bild entfernen?", "", [
                          { text: "Abbrechen", style: "cancel" },
                          {
                            text: "Entfernen",
                            style: "destructive",
                            onPress: () => deleteBlock(block.id),
                          },
                        ])
                      }
                      style={styles.imgDelete}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={22} color="white" />
                    </Pressable>

                    {/* Resize */}
                    <ResizeHandle
                      size={size}
                      onResize={(s) =>
                        updateBlock(block.id, {
                          size: s,
                        } as Partial<NoteImageBlock>)
                      }
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  textInput: {
    fontSize: 16,
    color: "#1e293b",
    lineHeight: 26,
    padding: 0,
    minHeight: 40,
  },

  // Images
  imageSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  imageSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  imageSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  imageRow: {
    gap: 10,
    paddingBottom: 4,
    alignItems: "flex-start",
  },
  imageCard: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  imgCaption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    fontSize: 11,
    padding: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  imgDelete: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
  },
  resizeHandle: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(59,137,149,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  // Tables
  tableWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginVertical: 8,
  },
  tableToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f8f9fb",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
  },
  tableBtnActive: { backgroundColor: "#0f172a" },
  tableBtnText: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  tableBtnTextActive: { color: "white" },
  tableDeleteBtn: {
    marginLeft: "auto",
    padding: 5,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  tableRow: { flexDirection: "row", alignItems: "center" },
  tableCell: {
    width: CELL_WIDTH,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 36,
    justifyContent: "center",
  },
  tableCellAlt: { backgroundColor: "#f8f9fb" },
  tableHeaderCell: { backgroundColor: "#f1f5f9" },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableHeaderInput: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    padding: 0,
  },
  tableCellText: { fontSize: 13, color: "#334155" },
  tableCellInput: { fontSize: 13, color: "#334155", padding: 0 },
  tableDeleteRowBtn: { paddingHorizontal: 6 },
});
