// constants/habitTemplates.ts
// Vorgefertigte Habits für den Onboarding-Flow.
// Nutzer wählen 1–N aus — werden direkt beim Abschluss des Onboardings angelegt.
// Bewusst universell: jeder Nutzer erkennt mindestens 2-3 davon.

import { HabitSchedule } from "@/types/habit";
import { PlannerCategory } from "@/types/planner";

export type HabitTemplate = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  category: PlannerCategory;
  kind: "boolean" | "count";
  unit?: string;
  dailyTarget?: number;
  schedule: HabitSchedule;
};

const DAILY: HabitSchedule = { repeatUnit: "day", repeatEvery: 1 };

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: "tpl_lernen",
    title: "Täglich lernen",
    emoji: "📚",
    description: "Lerneinheit abschließen",
    category: "brain",
    kind: "boolean",
    schedule: DAILY,
  },
  {
    id: "tpl_lesen",
    title: "30 Min lesen",
    emoji: "📖",
    description: "Buch oder Artikel",
    category: "brain",
    kind: "boolean",
    schedule: DAILY,
  },
  {
    id: "tpl_sport",
    title: "Sport & Bewegung",
    emoji: "🏃",
    description: "Mindestens 20 Min aktiv",
    category: "fitness",
    kind: "boolean",
    schedule: DAILY,
  },
  {
    id: "tpl_wasser",
    title: "Wasser trinken",
    emoji: "💧",
    description: "8 Gläser täglich",
    category: "health",
    kind: "count",
    unit: "Gläser",
    dailyTarget: 8,
    schedule: DAILY,
  },
  {
    id: "tpl_meditation",
    title: "Meditation",
    emoji: "🧘",
    description: "10 Min zur Ruhe kommen",
    category: "spirit",
    kind: "boolean",
    schedule: DAILY,
  },
  {
    id: "tpl_schlaf",
    title: "Früh schlafen",
    emoji: "😴",
    description: "Vor 23 Uhr ins Bett",
    category: "health",
    kind: "boolean",
    schedule: DAILY,
  },
];
