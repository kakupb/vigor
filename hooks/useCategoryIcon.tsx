// hooks/useCategoryIcon.tsx
import {
  AntDesign,
  Entypo,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { ReactNode } from "react";

export function useCategoryIcon() {
  const renderIcon = (
    iconFamily: string,
    iconName: string,
    size: number,
    color: string
  ): ReactNode => {
    switch (iconFamily) {
      case "FontAwesome6":
        return (
          <FontAwesome6 name={iconName as any} size={size} color={color} />
        );
      case "MaterialIcons":
        return (
          <MaterialIcons name={iconName as any} size={size} color={color} />
        );
      case "MaterialCommunityIcons":
        return (
          <MaterialCommunityIcons
            name={iconName as any}
            size={size}
            color={color}
          />
        );
      case "Entypo":
        return <Entypo name={iconName as any} size={size} color={color} />;
      case "Ionicons":
        return <Ionicons name={iconName as any} size={size} color={color} />;
      case "AntDesign":
        return <AntDesign name={iconName as any} size={size} color={color} />;
      default:
        return null;
    }
  };

  return { renderIcon };
}
