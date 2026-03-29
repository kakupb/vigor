// hooks/useCategoryConfig.ts
import { getCategoryConfig } from "@/constants/categories";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
import { PlannerCategory } from "@/types/planner";

export function useCategoryConfig(
  category?: PlannerCategory,
  customCategoryId?: string
) {
  const customCats = useCustomCategoryStore((s) => s.categories);
  const customCat = customCats.find((c) => c.id === customCategoryId);
  if (customCat) {
    return {
      ...getCategoryConfig("other"),
      color: customCat.color,
      label: customCat.label,
      lightColor: customCat.color + "20",
    };
  }
  return getCategoryConfig(category);
}
