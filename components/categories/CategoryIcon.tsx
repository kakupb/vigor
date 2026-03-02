import { getCategoryConfig } from "@/constants/categories";
import { useCategoryIcon } from "@/hooks/useCategoryIcon";
import { PlannerCategory } from "@/types/planner";
import { StyleSheet, View } from "react-native";

type CategoryIconProps = {
  category?: PlannerCategory;
  size?: number;
  iconColor?: string;
  backgroundColor?: string;
  containerSize?: number;
};

export function CategoryIcon({
  category,
  size = 24,
  iconColor = "white",
  backgroundColor,
  containerSize,
}: CategoryIconProps) {
  const config = getCategoryConfig(category);
  const { renderIcon } = useCategoryIcon();

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize || 24 / 2,
          backgroundColor: backgroundColor || config.color,
        },
      ]}
    >
      {renderIcon(config.iconFamily, config.icon, size, iconColor)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
