// app/(tabs)/notes.tsx
import { TagChips } from "@/components/notes/TagChips";
import { getAllTags, sortNotes } from "@/services/noteServices";
import { useNoteStore } from "@/store/noteStore";
import { dateToLocalString } from "@/utils/dateUtils";
import { truncateText } from "@/utils/textUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Notes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    dateToLocalString(new Date())
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const notes = useNoteStore((s) => s.notes);
  const loadNotes = useNoteStore((s) => s.loadNotes);

  const today = dateToLocalString(new Date());
  const isToday = selectedDate === today;

  function goToPrevDay() {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(dateToLocalString(current));
  }

  function goToNextDay() {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(dateToLocalString(current));
  }

  useEffect(() => {
    loadNotes().finally(() => setIsLoading(false));
  }, []);

  const allTags = useMemo(() => getAllTags(notes), [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes.filter((n) => n.date === selectedDate);

    if (selectedTag) {
      result = result.filter((n) => n.tags.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }

    return sortNotes(result);
  }, [notes, selectedDate, selectedTag, searchQuery]);

  const dateLabel = new Date(selectedDate).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b8995" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Notizen</Text>
          <Pressable
            style={styles.newButton}
            onPress={() =>
              router.push({
                pathname: "/note/new",
                params: { date: selectedDate },
              })
            }
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.newButtonText}>Neu</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Notizen durchsuchen..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* ── DATE NAV ── */}
        <View style={styles.dateNav}>
          <Pressable onPress={goToPrevDay} style={styles.navButton}>
            <Ionicons name="chevron-back" size={18} color="#64748b" />
          </Pressable>

          <Pressable
            style={styles.dateInfo}
            onPress={() => setSelectedDate(today)}
          >
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            {!isToday && <Text style={styles.todayLink}>Zurück zu heute</Text>}
          </Pressable>

          <Pressable onPress={goToNextDay} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </Pressable>
        </View>

        {/* ── TAG FILTER ── */}
        {allTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagFilterRow}
          >
            <Pressable
              onPress={() => setSelectedTag(null)}
              style={[styles.tagFilter, !selectedTag && styles.tagFilterActive]}
            >
              <Text
                style={[
                  styles.tagFilterText,
                  !selectedTag && styles.tagFilterTextActive,
                ]}
              >
                Alle
              </Text>
            </Pressable>
            {allTags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                style={[
                  styles.tagFilter,
                  selectedTag === tag && styles.tagFilterActive,
                ]}
              >
                <Text
                  style={[
                    styles.tagFilterText,
                    selectedTag === tag && styles.tagFilterTextActive,
                  ]}
                >
                  #{tag}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── NOTES LIST ── */}
        <View style={styles.notesList}>
          <Text style={styles.listHeader}>
            {isToday ? "Heute" : dateLabel}
            <Text style={styles.listCount}> · {filteredNotes.length}</Text>
          </Text>

          {filteredNotes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyText}>
                {searchQuery || selectedTag
                  ? "Keine Notizen gefunden"
                  : "Noch keine Notizen für diesen Tag"}
              </Text>
              {!searchQuery && !selectedTag && (
                <Pressable
                  style={styles.emptyButton}
                  onPress={() =>
                    router.push({
                      pathname: "/note/new",
                      params: { date: selectedDate },
                    })
                  }
                >
                  <Text style={styles.emptyButtonText}>
                    Erste Notiz erstellen
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            filteredNotes.map((note) => (
              <Pressable
                key={note.id}
                style={({ pressed }) => [
                  styles.noteCard,
                  note.isPinned && styles.noteCardPinned,
                  pressed && styles.noteCardPressed,
                ]}
                onPress={() => router.push(`/note/edit/${note.id}`)}
              >
                {/* Pin indicator */}
                {note.isPinned && (
                  <View style={styles.pinBadge}>
                    <Ionicons name="pin" size={10} color="#3b8995" />
                  </View>
                )}

                <View style={styles.noteCardInner}>
                  <View style={styles.noteCardLeft}>
                    {note.title ? (
                      <Text style={styles.noteTitle} numberOfLines={1}>
                        {note.title}
                      </Text>
                    ) : null}
                    <Text style={styles.noteContent} numberOfLines={2}>
                      {truncateText(note.content, 120)}
                    </Text>
                    {note.tags.length > 0 && (
                      <TagChips tags={note.tags} maxVisible={3} />
                    )}
                  </View>

                  <View style={styles.noteCardRight}>
                    <Text style={styles.noteTime}>
                      {new Date(note.createdAt).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {note.isFavorite && (
                      <Ionicons
                        name="star"
                        size={12}
                        color="#f59e0b"
                        style={{ marginTop: 4 }}
                      />
                    )}
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fb",
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3b8995",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  newButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
  },

  // Date Nav
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "white",
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eef0f4",
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f8f9fb",
    justifyContent: "center",
    alignItems: "center",
  },
  dateInfo: {
    flex: 1,
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  todayLink: {
    fontSize: 12,
    color: "#3b8995",
    marginTop: 3,
    fontWeight: "500",
  },

  // Tag Filter
  tagFilterRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tagFilter: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tagFilterActive: {
    backgroundColor: "#3b8995",
    borderColor: "#3b8995",
  },
  tagFilterText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  tagFilterTextActive: {
    color: "white",
    fontWeight: "600",
  },

  // Notes list
  notesList: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  listCount: {
    fontWeight: "400",
    color: "#94a3b8",
  },

  // Note card
  noteCard: {
    backgroundColor: "white",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eef0f4",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  noteCardPinned: {
    borderColor: "#a5e8ef",
    borderWidth: 1.5,
  },
  noteCardPressed: {
    opacity: 0.75,
  },
  noteCardInner: {
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  noteCardLeft: {
    flex: 1,
  },
  noteCardRight: {
    alignItems: "flex-end",
    minWidth: 36,
  },
  pinBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e0f2f1",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  noteContent: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  noteTime: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // Empty state
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 32,
    color: "#cbd5e1",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#94a3b8",
    marginBottom: 20,
    fontWeight: "500",
  },
  emptyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#3b8995",
    borderRadius: 20,
  },
  emptyButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
