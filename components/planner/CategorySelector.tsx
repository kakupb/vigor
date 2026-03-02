// components/planner/CategorySelector.tsx
import { PLANNER_CATEGORIES } from "@/constants/categories";
import { useCategoryIcon } from "@/hooks/useCategoryIcon";
import { PlannerCategory } from "@/types/planner";
import { Pressable, ScrollView, Text, View } from "react-native";

type CategorySelectorProps = {
  selected?: PlannerCategory;
  onSelect: (category: PlannerCategory | undefined) => void;
};

export function CategorySelector({
  selected,
  onSelect,
}: CategorySelectorProps) {
  const { renderIcon } = useCategoryIcon();

  return (
    <View>
      <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
        Kategorie (optional)
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
      >
        {/* "Keine Kategorie" Option */}
        <Pressable
          onPress={() => onSelect(undefined)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: !selected ? "#3b82f6" : "#e5e7eb",
            backgroundColor: !selected ? "#eff6ff" : "#f9fafb",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: !selected ? "600" : "400",
              color: !selected ? "#1e40af" : "#6b7280",
            }}
          >
            Keine
          </Text>
        </Pressable>

        {/* Category Options */}
        {PLANNER_CATEGORIES.map((cat) => {
          const isSelected = selected === cat.id;

          return (
            <Pressable
              key={cat.id}
              onPress={() => onSelect(cat.id)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: isSelected ? cat.color : "#e5e7eb",
                backgroundColor: isSelected ? cat.lightColor : "#f9fafb",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              {renderIcon(
                cat.iconFamily,
                cat.icon,
                16,
                isSelected ? cat.color : "#6b7280"
              )}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? "600" : "400",
                  color: isSelected ? cat.color : "#6b7280",
                }}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
