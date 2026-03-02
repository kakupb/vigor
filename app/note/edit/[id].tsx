// app/note/edit/[id].tsx
import {
  NoteBlockEditor,
  NoteBlockEditorRef,
} from "@/components/notes/NoteBlockEditor";
import { NoteLinker } from "@/components/notes/NoteLinker";
import { TagInput } from "@/components/notes/TagInput";
import { useNoteStore } from "@/store/noteStore";
import { NoteBlock, NoteTextBlock } from "@/types/note";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function deriveContent(blocks: NoteBlock[]): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as NoteTextBlock).content)
    .join("\n")
    .trim();
}

export default function EditNoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const note = useNoteStore((s) => s.notes.find((n) => n.id === id));
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const toggleFavorite = useNoteStore((s) => s.toggleFavorite);

  const editorRef = useRef<NoteBlockEditorRef>(null);

  const [title, setTitle] = useState(note?.title || "");
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => {
    if (note?.blocks && note.blocks.length > 0) return note.blocks;
    // Migration: alte Notiz ohne blocks
    return [
      {
        id: Crypto.randomUUID(),
        type: "text",
        content: note?.content || "",
      } as NoteTextBlock,
    ];
  });
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>(
    note?.linkedHabitIds || []
  );
  const [linkedPlannerIds, setLinkedPlannerIds] = useState<string[]>(
    note?.linkedPlannerIds || []
  );
  const [showMeta, setShowMeta] = useState(false);
  const [showLinker, setShowLinker] = useState(false);
  const [showTags, setShowTags] = useState((note?.tags || []).length > 0);
  const [hasChanges, setHasChanges] = useState(false);

  const totalLinks = linkedHabitIds.length + linkedPlannerIds.length;
  const hasContent = blocks.some(
    (b) => b.type !== "text" || (b as NoteTextBlock).content.trim().length > 0
  );
  const wordCount = deriveContent(blocks).trim()
    ? deriveContent(blocks).trim().split(/\s+/).length
    : 0;

  useEffect(() => {
    if (note) {
      const changed =
        title !== (note.title || "") ||
        JSON.stringify(blocks) !== JSON.stringify(note.blocks || []) ||
        JSON.stringify(tags) !== JSON.stringify(note.tags) ||
        JSON.stringify(linkedHabitIds) !==
          JSON.stringify(note.linkedHabitIds || []) ||
        JSON.stringify(linkedPlannerIds) !==
          JSON.stringify(note.linkedPlannerIds || []);
      setHasChanges(changed);
    }
  }, [title, blocks, tags, linkedHabitIds, linkedPlannerIds, note]);

  if (!note) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Notiz nicht gefunden</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBack}>
          <Text style={styles.errorBackText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  function handleSave() {
    if (!hasContent) {
      Alert.alert("Fehler", "Die Notiz darf nicht leer sein");
      return;
    }
    if (note) {
      updateNote(
        note.id,
        blocks,
        title,
        tags,
        linkedHabitIds,
        linkedPlannerIds
      );
      setHasChanges(false);
      router.back();
    }
  }

  function handleBack() {
    if (hasChanges) {
      Alert.alert(
        "Änderungen speichern?",
        "Du hast ungespeicherte Änderungen.",
        [
          {
            text: "Verwerfen",
            style: "destructive",
            onPress: () => router.back(),
          },
          { text: "Speichern", onPress: handleSave },
        ]
      );
    } else {
      router.back();
    }
  }

  function handleDelete() {
    if (!note) {
      return;
    }
    Alert.alert(
      "Notiz löschen?",
      "Diese Aktion kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => {
            deleteNote(note.id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" />

      {/* ── TOOLBAR ── */}
      <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleBack} style={styles.toolbarButton}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </Pressable>

        <View style={styles.toolbarCenter}>
          {hasChanges && <View style={styles.unsavedDot} />}
        </View>

        <View style={styles.toolbarRight}>
          <Pressable
            onPress={() => toggleFavorite(note.id)}
            style={styles.toolbarButton}
          >
            <Ionicons
              name={note.isFavorite ? "star" : "star-outline"}
              size={20}
              color={note.isFavorite ? "#f59e0b" : "#64748b"}
            />
          </Pressable>

          <Pressable
            onPress={() => togglePin(note.id)}
            style={styles.toolbarButton}
          >
            <Ionicons
              name={note.isPinned ? "pin" : "pin-outline"}
              size={20}
              color={note.isPinned ? "#3b8995" : "#64748b"}
            />
          </Pressable>

          <Pressable
            onPress={() => setShowMeta((v) => !v)}
            style={styles.toolbarButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#64748b" />
          </Pressable>

          <Pressable
            onPress={handleSave}
            style={[styles.saveButton, !hasChanges && styles.saveButtonDim]}
            disabled={!hasChanges}
          >
            <Text
              style={[
                styles.saveButtonText,
                !hasChanges && styles.saveButtonTextDim,
              ]}
            >
              Speichern
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── META PANEL ── */}
      {showMeta && (
        <View style={styles.metaPanel}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Erstellt</Text>
            <Text style={styles.metaValue}>
              {new Date(note.createdAt).toLocaleString("de-DE")}
            </Text>
          </View>
          {note.updatedAt && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Bearbeitet</Text>
              <Text style={styles.metaValue}>
                {new Date(note.updatedAt).toLocaleString("de-DE")}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Wörter</Text>
            <Text style={styles.metaValue}>{wordCount}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Blöcke</Text>
            <Text style={styles.metaValue}>{blocks.length}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Verknüpfungen</Text>
            <Text style={styles.metaValue}>{totalLinks}</Text>
          </View>
          <Pressable onPress={handleDelete} style={styles.metaDeleteButton}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={styles.metaDeleteText}>Notiz löschen</Text>
          </Pressable>
        </View>
      )}

      {/* ── ACTION BAR ── */}
      <View style={styles.actionBar}>
        {/* Bild aus Galerie */}
        <Pressable
          onPress={() => editorRef.current?.insertImage(false)}
          style={styles.actionButton}
        >
          <Ionicons name="image-outline" size={18} color="#64748b" />
        </Pressable>

        {/* Kamera */}
        <Pressable
          onPress={() => editorRef.current?.insertImage(true)}
          style={styles.actionButton}
        >
          <Ionicons name="camera-outline" size={18} color="#64748b" />
        </Pressable>

        {/* Tabelle */}
        <Pressable
          onPress={() => editorRef.current?.insertTable()}
          style={styles.actionButton}
        >
          <Ionicons name="grid-outline" size={18} color="#64748b" />
        </Pressable>

        <View style={styles.actionDivider} />

        {/* Verknüpfungen: Habits + Planner */}
        <Pressable
          onPress={() => setShowLinker((v) => !v)}
          style={[
            styles.actionButton,
            (showLinker || totalLinks > 0) && styles.actionButtonActive,
          ]}
        >
          <Ionicons
            name="link-outline"
            size={18}
            color={showLinker || totalLinks > 0 ? "#3b8995" : "#64748b"}
          />
          {totalLinks > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalLinks}</Text>
            </View>
          )}
        </Pressable>

        {/* Tags */}
        <Pressable
          onPress={() => setShowTags((v) => !v)}
          style={[
            styles.actionButton,
            (showTags || tags.length > 0) && styles.actionButtonActive,
          ]}
        >
          <Ionicons
            name="pricetag-outline"
            size={18}
            color={showTags || tags.length > 0 ? "#3b8995" : "#64748b"}
          />
          {tags.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tags.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── EDITOR ── */}
      <ScrollView
        style={styles.editor}
        contentContainerStyle={styles.editorContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Titel */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titel"
          placeholderTextColor="#cbd5e1"
          style={styles.titleInput}
          multiline
        />

        <View style={styles.divider} />

        {/* Block Editor */}
        <NoteBlockEditor
          ref={editorRef}
          blocks={blocks}
          onBlocksChange={setBlocks}
        />

        {/* Wörter-Zähler */}
        {wordCount > 0 && (
          <Text style={styles.wordCount}>
            {wordCount} {wordCount === 1 ? "Wort" : "Wörter"}
          </Text>
        )}

        {/* Verknüpfungen */}
        {(showLinker || totalLinks > 0) && (
          <NoteLinker
            linkedHabitIds={linkedHabitIds}
            linkedPlannerIds={linkedPlannerIds}
            onLinkHabit={(habitId) =>
              setLinkedHabitIds((prev) =>
                prev.includes(habitId)
                  ? prev.filter((x) => x !== habitId)
                  : [...prev, habitId]
              )
            }
            onLinkPlanner={(plannerId) =>
              setLinkedPlannerIds((prev) =>
                prev.includes(plannerId)
                  ? prev.filter((x) => x !== plannerId)
                  : [...prev, plannerId]
              )
            }
            visibleTabs={["habits", "planner"]}
          />
        )}

        {/* Tags */}
        {(showTags || tags.length > 0) && (
          <View style={styles.tagsSection}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="pricetag-outline" size={15} color="#64748b" />
              <Text style={styles.sectionLabel}>Tags</Text>
            </View>
            <TagInput tags={tags} onTagsChange={setTags} />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  errorText: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 16,
  },
  errorBack: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
  },
  errorBackText: {
    color: "#0f172a",
    fontWeight: "600",
  },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "white",
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 8,
  },
  toolbarCenter: {
    flex: 1,
    alignItems: "center",
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  unsavedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3b8995",
  },
  saveButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: "#3b8995",
    borderRadius: 16,
    marginLeft: 4,
  },
  saveButtonDim: {
    backgroundColor: "#e2e8f0",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  saveButtonTextDim: {
    color: "#94a3b8",
  },

  // Meta Panel
  metaPanel: {
    backgroundColor: "#f8f9fb",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f4",
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  metaValue: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  metaDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  metaDeleteText: {
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "600",
  },

  // Action Bar
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f8f9fb",
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f4",
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonActive: {
    backgroundColor: "#e0f2f1",
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 4,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 8,
    color: "white",
    fontWeight: "700",
  },

  // Editor
  editor: {
    flex: 1,
  },
  editorContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 80,
  },
  titleInput: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 16,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 16,
  },
  wordCount: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 8,
    textAlign: "right",
    fontWeight: "500",
  },

  // Tags
  tagsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
