// components/planner/CategorySelector.tsx
// Kategorie-Auswahl als Grid mit "+ Neue Kategorie"-Button.
// Unterstützt Standard- und Custom-Kategorien.

import { CreateCategorySheet } from "@/components/categories/CreateCategorySheet";
import { PLANNER_CATEGORIES } from "@/constants/categories";
import { useAppColors } from "@/hooks/useAppColors";
import { useCategoryIcon } from "@/hooks/useCategoryIcon";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
import { PlannerCategory } from "@/types/planner";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type CategorySelectorProps = {
  selected?: PlannerCategory | string;
  onSelect: (category: PlannerCategory | undefined, customId?: string) => void;
  horizontal?: boolean;
};

export function CategorySelector({
  selected,
  onSelect,
  horizontal = true,
}: CategorySelectorProps) {
  const c = useAppColors();
  const { renderIcon } = useCategoryIcon();
  const { categories: customCats, load } = useCustomCategoryStore();
  const [createVisible, setCreateVisible] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function handleSelect(catId: PlannerCategory | undefined, customId?: string) {
    Haptics.selectionAsync();
    onSelect(catId, customId);
  }

  const Container = horizontal ? ScrollView : View;
  const containerProps = horizontal
    ? {
        horizontal: true,
        showsHorizontalScrollIndicator: false,
        contentContainerStyle: { gap: 8, paddingBottom: 4 },
      }
    : {
        style: {
          flexDirection: "row" as const,
          flexWrap: "wrap" as const,
          gap: 8,
        },
      };

  return (
    <>
      <Container {...containerProps}>
        {/* Keine Kategorie */}
        <Pressable
          onPress={() => handleSelect(undefined)}
          style={[
            s.chip,
            !selected
              ? { backgroundColor: "#3b8995", borderColor: "#3b8995" }
              : {
                  backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
                  borderColor: c.borderDefault,
                },
          ]}
        >
          <Text
            style={[s.chipText, { color: !selected ? "#fff" : c.textMuted }]}
          >
            Keine
          </Text>
        </Pressable>

        {/* Standard-Kategorien */}
        {PLANNER_CATEGORIES.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => handleSelect(cat.id)}
              style={[
                s.chip,
                isSelected
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : {
                      backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
                      borderColor: c.borderDefault,
                    },
              ]}
            >
              <View style={{ opacity: isSelected ? 1 : 0.6 }}>
                {renderIcon(
                  cat.iconFamily,
                  cat.icon,
                  14,
                  isSelected ? "#fff" : cat.color
                )}
              </View>
              <Text
                style={[
                  s.chipText,
                  { color: isSelected ? "#fff" : c.textSecondary },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Custom-Kategorien */}
        {customCats.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => handleSelect("other", cat.id)}
              style={[
                s.chip,
                isSelected
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : {
                      backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
                      borderColor: c.borderDefault,
                    },
              ]}
            >
              <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
              <Text
                style={[
                  s.chipText,
                  { color: isSelected ? "#fff" : c.textSecondary },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}

        {/* + Neue Kategorie */}
        <Pressable
          onPress={() => setCreateVisible(true)}
          style={[
            s.chip,
            {
              backgroundColor: c.dark ? "#1e293b" : "#f1f5f9",
              borderColor: c.borderDefault,
              borderStyle: "dashed",
            },
          ]}
        >
          <Ionicons name="add" size={15} color={c.textMuted} />
          <Text style={[s.chipText, { color: c.textMuted }]}>Neu</Text>
        </Pressable>
      </Container>

      <CreateCategorySheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={(id) => handleSelect("other", id)}
      />
    </>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: "500" },
});
