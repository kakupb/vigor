import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
};

export function TagInput({ tags, onTagsChange }: Props) {
  const [inputValue, setInputValue] = useState("");

  function handleAddTag() {
    const newTag = inputValue.trim().toLocaleLowerCase();
    if (newTag && !tags.includes(newTag)) {
      onTagsChange([...tags, newTag]);
      setInputValue("");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tags</Text>

      {/* Tag Chips */}
      <View style={styles.tags}>
        {tags.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => handleRemoveTag(tag)}
            style={styles.tag}
          >
            <Text style={styles.tagText}>#{tag}</Text>
            <Text style={styles.tagRemove}>×</Text>
          </Pressable>
        ))}
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Tag hinzufügen..."
          style={styles.input}
          onSubmitEditing={handleAddTag}
        />
        <Pressable onPress={handleAddTag} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2f1",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    color: "#0e7490",
    fontWeight: "500",
  },
  tagRemove: {
    fontSize: 18,
    color: "#0e7490",
    fontWeight: "bold",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: "#3b8995",
    width: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "600",
  },
});
