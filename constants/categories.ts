import { PlannerCategory } from "@/types/planner";

type CategoryConfig = {
  id: PlannerCategory;
  label: string;
  color: string;
  lightColor: string;
  icon: string;
  iconFamily:
    | "FontAwesome6"
    | "MaterialIcons"
    | "MaterialCommunityIcons"
    | "Entypo"
    | "Ionicons"
    | "AntDesign";
};

export const PLANNER_CATEGORIES: CategoryConfig[] = [
  {
    id: "work",
    label: "Arbeit",
    color: "#3b82f6", // Blue
    lightColor: "#dbeafe",
    icon: "briefcase",
    iconFamily: "Entypo",
  },
  {
    id: "fitness",
    label: "Fitness",
    color: "#f59e0b", // Orange
    lightColor: "#fef3c7",
    icon: "fitness-center",
    iconFamily: "MaterialIcons",
  },
  {
    id: "health",
    label: "Gesundheit",
    color: "#10b981", // Green
    lightColor: "#d1fae5",
    icon: "fitness",
    iconFamily: "Ionicons",
  },
  {
    id: "brain",
    label: "Lernen",
    color: "#8b5cf6", // Purple
    lightColor: "#ede9fe",
    icon: "brain",
    iconFamily: "MaterialCommunityIcons",
  },
  {
    id: "spirit",
    label: "Achtsamkeit",
    color: "#ec4899", // Pink
    lightColor: "#fce7f3",
    icon: "peace",
    iconFamily: "FontAwesome6",
  },
  {
    id: "social",
    label: "Soziales",
    color: "#06b6d4", // Cyan
    lightColor: "#cffafe",
    icon: "people",
    iconFamily: "Ionicons",
  },
  {
    id: "finance",
    label: "Finanzen",
    color: "#84cc16", // Lime
    lightColor: "#ecfccb",
    icon: "currency-usd",
    iconFamily: "MaterialCommunityIcons",
  },
  {
    id: "home",
    label: "Haushalt",
    color: "#f97316", // Orange-Red
    lightColor: "#ffedd5",
    icon: "home",
    iconFamily: "Ionicons",
  },
  {
    id: "creative",
    label: "Kreativ",
    color: "#d946ef", // Fuchsia
    lightColor: "#fae8ff",
    icon: "color-palette",
    iconFamily: "Ionicons",
  },
  {
    id: "other",
    label: "Sonstiges",
    color: "#6b7280", // Gray
    lightColor: "#f3f4f6",
    icon: "ellipse",
    iconFamily: "Ionicons",
  },
];

export function isValidCategory(cat: string): cat is PlannerCategory {
  return PLANNER_CATEGORIES.some((c) => c.id === cat);
}

export function sanitizeCategory(cat?: string): PlannerCategory {
  if (!cat || !isValidCategory(cat)) return "other";
  return cat;
}

export function getCategoryConfig(category?: PlannerCategory): CategoryConfig {
  return (
    PLANNER_CATEGORIES.find((c) => c.id === category) ||
    PLANNER_CATEGORIES[PLANNER_CATEGORIES.length - 1]
  );
}
