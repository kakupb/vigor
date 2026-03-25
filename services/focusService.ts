// services/focusService.ts

import { SlothMood } from "@/types/focus";
import { PlannerCategory, PlannerEntry } from "@/types/planner";
import { timeToMinutes } from "@/utils/dateUtils";

/**
 * Findet den aktuellen Entry basierend auf der Zeit
 */
export function getCurrentEntry(entries: PlannerEntry[]): PlannerEntry | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    entries.find((entry) => {
      if (!entry.startTime) return false;

      const startMin = timeToMinutes(entry.startTime);
      const endMin = entry.endTime
        ? timeToMinutes(entry.endTime)
        : startMin + (entry.durationMinute ?? 30);

      return currentMinutes >= startMin && currentMinutes < endMin;
    }) || null
  );
}

/**
 * Faultier-Modi je nach Kategorie
 */
export const SLOTH_MOODS: Record<PlannerCategory | "default", SlothMood> = {
  work: {
    emoji: "💼",
    activity: "arbeitet konzentriert",
    motivationalText: "Finger auf die Tasten!",
  },
  fitness: {
    emoji: "🧘",
    activity: "macht Yoga",
    motivationalText: "Langsam, aber stetig!",
  },
  health: {
    emoji: "🥗",
    activity: "isst gesund",
    motivationalText: "Gesundheit geht vor!",
  },
  brain: {
    emoji: "📚",
    activity: "liest ein Buch",
    motivationalText: "Wissen wächst langsam!",
  },
  spirit: {
    emoji: "🧘‍♂️",
    activity: "meditiert",
    motivationalText: "Innere Ruhe finden...",
  },
  social: {
    emoji: "👋",
    activity: "trifft Freunde",
    motivationalText: "Soziale Zeit ist wichtig!",
  },
  finance: {
    emoji: "💰",
    activity: "zählt Münzen",
    motivationalText: "Finanzen im Griff!",
  },
  home: {
    emoji: "🧹",
    activity: "putzt",
    motivationalText: "Ordnung schaffen!",
  },
  creative: {
    emoji: "🎨",
    activity: "malt",
    motivationalText: "Kreativität braucht Zeit!",
  },
  other: {
    emoji: "😌",
    activity: "chillt",
    motivationalText: "Einfach mal sein!",
  },
  default: {
    emoji: "🦥",
    activity: "Fokus",
    motivationalText: "Auch wenn langsam, fokussiert!",
  },
};

/**
 * Gibt das passende Faultier-Mood für eine Kategorie
 */
export function getSlothMood(category?: PlannerCategory): SlothMood {
  return SLOTH_MOODS[category || "default"] || SLOTH_MOODS.default;
}

/**
 * Pomodoro Standard-Zeiten
 */
export const POMODORO_CONFIG = {
  workDuration: 25 * 60, // 25 Minuten
  breakDuration: 5 * 60, // 5 Minuten
  longBreakDuration: 15 * 60, // 15 Minuten nach 4 Pomodoros
  longBreakAfter: 4,
};
