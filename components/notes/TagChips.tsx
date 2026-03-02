// components/notes/TagChips.tsx
import { StyleSheet, Text, View } from "react-native";

type Props = {
  tags: string[];
  maxVisible?: number;
};

export function TagChips({ tags, maxVisible = 3 }: Props) {
  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <View style={styles.container}>
      {visibleTags.map((tag, index) => (
        <View key={index} style={styles.tagChip}>
          <Text style={styles.tagChipText}>#{tag}</Text>
        </View>
      ))}
      {remainingCount > 0 && (
        <Text style={styles.moreTagsText}>+{remainingCount}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    backgroundColor: "#e0f2f1",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tagChipText: {
    fontSize: 11,
    color: "#0e7490",
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 11,
    color: "#9ca3af",
    alignSelf: "center",
  },
});
