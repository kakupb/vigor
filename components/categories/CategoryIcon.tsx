import { useCategoryConfig } from "@/hooks/useCategoryConfig";
import { useCategoryIcon } from "@/hooks/useCategoryIcon";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
import { PlannerCategory } from "@/types/planner";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

type CategoryIconProps = {
  category?: PlannerCategory;
  customCategoryId?: string; // ← NEU
  size?: number;
  iconColor?: string;
  backgroundColor?: string;
  containerSize?: number;
};

export function CategoryIcon({
  category,
  customCategoryId, // ← NEU
  size = 24,
  iconColor = "white",
  backgroundColor,
  containerSize,
}: CategoryIconProps) {
  const { renderIcon } = useCategoryIcon();
  const config = useCategoryConfig(category, customCategoryId);
  const customCats = useCustomCategoryStore((s) => s.categories);
  const customCat = customCats.find((c) => c.id === customCategoryId);

  const bgColor = backgroundColor || config.color;
  const radius = (containerSize || 24) / 2;

  // Custom-Kategorie: Icon aus gespeichertem emoji-String rendern
  function renderCustomIcon() {
    if (!customCat) return null;
    const ico = customCat.emoji; // z.B. "ion:star-outline", "emoji:🎯", "text:AB", "image:..."

    if (ico.startsWith("ion:")) {
      return (
        <Ionicons name={ico.slice(4) as any} size={size} color={iconColor} />
      );
    }
    if (ico.startsWith("emoji:")) {
      return <Text style={{ fontSize: size * 0.75 }}>{ico.slice(6)}</Text>;
    }
    if (ico.startsWith("text:")) {
      const val = ico.slice(5);
      return (
        <Text
          style={{
            color: iconColor,
            fontWeight: "800",
            fontSize: val.length > 2 ? size * 0.45 : size * 0.6,
          }}
        >
          {val}
        </Text>
      );
    }
    if (ico.startsWith("image:")) {
      return (
        <Image
          source={{ uri: ico.slice(6) }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      );
    }
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: radius,
          backgroundColor: bgColor,
        },
      ]}
    >
      {customCat
        ? renderCustomIcon()
        : renderIcon(config.iconFamily, config.icon, size, iconColor)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
