// app/note/new.tsx  – nur die relevanten Änderungen gezeigt
// Füge scrollRef hinzu und übergib ihn an NoteBlockEditor

import {
  NoteBlockEditor,
  NoteBlockEditorRef,
} from "@/components/notes/NoteBlockEditor";
import { NoteLinker } from "@/components/notes/NoteLinker";
import { TagInput } from "@/components/notes/TagInput";
import { useNoteStore } from "@/store/noteStore";
import { NoteBlock, NoteTextBlock } from "@/types/note";
import { dateToLocalString } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function makeTextBlock(content = ""): NoteTextBlock {
  return { id: Crypto.randomUUID(), type: "text", content };
}

function deriveContent(blocks: NoteBlock[]): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as NoteTextBlock).content)
    .join("\n")
    .trim();
}

export default function NewNoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date: string }>();
  const date = params.date || dateToLocalString(new Date());

  const addNote = useNoteStore((s) => s.addNote);
  const editorRef = useRef<NoteBlockEditorRef>(null);
  // ← NEU: ScrollView ref für Drag & Drop
  const scrollRef = useRef<ScrollView>(null);

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<NoteBlock[]>([makeTextBlock()]);
  const [tags, setTags] = useState<string[]>([]);
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>([]);
  const [linkedPlannerIds, setLinkedPlannerIds] = useState<string[]>([]);
  const [showLinker, setShowLinker] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const hasContent = deriveContent(blocks).length > 0;
  const totalLinks = linkedHabitIds.length + linkedPlannerIds.length;

  function handleSave() {
    if (!hasContent) return;
    addNote(blocks, date, title, tags, linkedHabitIds, linkedPlannerIds);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── TOOLBAR ── */}
      <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.toolbarButton}>
          <Ionicons name="close" size={22} color="#0f172a" />
        </Pressable>
        <Text style={styles.toolbarTitle}>Neue Notiz</Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveButton, !hasContent && styles.saveButtonDim]}
          disabled={!hasContent}
        >
          <Text
            style={[
              styles.saveButtonText,
              !hasContent && styles.saveButtonTextDim,
            ]}
          >
            Speichern
          </Text>
        </Pressable>
      </View>

      {/* ── ACTION BAR ── */}
      <View style={styles.actionBar}>
        <Pressable
          onPress={() => editorRef.current?.insertImage(false)}
          style={styles.actionButton}
        >
          <Ionicons name="image-outline" size={18} color="#64748b" />
        </Pressable>

        <Pressable
          onPress={() => editorRef.current?.insertImage(true)}
          style={styles.actionButton}
        >
          <Ionicons name="camera-outline" size={18} color="#64748b" />
        </Pressable>

        <Pressable
          onPress={() => editorRef.current?.insertTable()}
          style={styles.actionButton}
        >
          <Ionicons name="grid-outline" size={18} color="#64748b" />
        </Pressable>

        <View style={styles.actionDivider} />

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
      {/* ← NEU: ref={scrollRef} */}
      <ScrollView
        ref={scrollRef}
        style={styles.editor}
        contentContainerStyle={styles.editorContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titel"
          placeholderTextColor="#cbd5e1"
          style={styles.titleInput}
          multiline
          autoFocus
        />
        <View style={styles.divider} />

        {/* ← NEU: scrollRef übergeben */}
        <NoteBlockEditor
          ref={editorRef}
          blocks={blocks}
          onBlocksChange={setBlocks}
        />

        {(showLinker || totalLinks > 0) && (
          <NoteLinker
            linkedHabitIds={linkedHabitIds}
            linkedPlannerIds={linkedPlannerIds}
            onLinkHabit={(id) =>
              setLinkedHabitIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onLinkPlanner={(id) =>
              setLinkedPlannerIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            visibleTabs={["habits", "planner"]}
          />
        )}

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
  container: { flex: 1, backgroundColor: "white" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "white",
  },
  toolbarButton: { padding: 8, borderRadius: 8 },
  toolbarTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  saveButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: "#3b8995",
    borderRadius: 16,
  },
  saveButtonDim: { backgroundColor: "#e2e8f0" },
  saveButtonText: { color: "white", fontWeight: "600", fontSize: 13 },
  saveButtonTextDim: { color: "#94a3b8" },
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
  actionButtonActive: { backgroundColor: "#e0f2f1" },
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
  badgeText: { fontSize: 8, color: "white", fontWeight: "700" },
  editor: { flex: 1 },
  editorContent: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 80 },
  titleInput: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 16,
    padding: 0,
  },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginBottom: 16 },
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
