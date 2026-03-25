// hooks/useAppColors.ts
// Zentrale Farbtokens für Light/Dark Mode.
// Jede Komponente ruft diesen Hook einmal auf — keine hardcoded Colors mehr.
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useAppColors() {
  const dark = useColorScheme() === "dark";

  return {
    dark,

    // Hintergründe
    pageBg: dark ? "#0f172a" : "#f8f9fb",
    cardBg: dark ? "#1e293b" : "#ffffff",
    cardBgDone: dark ? "#0d2e1e" : "#f0fdf8",
    headerBg: dark ? "#1e293b" : "#ffffff",
    inputBg: dark ? "#0f172a" : "#f1f5f9",
    subtleBg: dark ? "#1e293b" : "#f1f5f9",

    // Borders
    borderDefault: dark ? "#334155" : "#eef0f4",
    borderSubtle: dark ? "#1e293b" : "#f0f0f0",
    borderMuted: dark ? "#334155" : "#e2e8f0",
    borderDone: dark ? "#166534" : "#bbf7d0",

    // Text
    textPrimary: dark ? "#f1f5f9" : "#0f172a",
    textSecondary: dark ? "#94a3b8" : "#64748b",
    textMuted: dark ? "#64748b" : "#94a3b8",
    textDisabled: dark ? "#475569" : "#cbd5e1",

    // Interaktiv
    addButtonBg: dark ? "#1e293b" : "#f1f5f9",
    addButtonText: dark ? "#94a3b8" : "#475569",
    menuBtnBg: dark ? "#334155" : "#f1f5f9",

    // Note-spezifisch
    notePinnedBorder: dark ? "#0e7490" : "#a5e8ef",
    notePinnedBg: dark ? "#0c2733" : "#f0fbfc",
    pinBadgeBg: dark ? "#0e3a47" : "#e0f2f1",

    // Anytime badge
    anytimeBg: dark ? "#451a03" : "#fef9c3",
    anytimeText: dark ? "#fbbf24" : "#854d0e",
  } as const;
}
