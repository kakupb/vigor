// components/health/healthTokens.ts

export const C = {
  bg: "#f0f2f7",
  card: "#ffffff",
  text: "#0d1117",
  sub: "#4b5563",
  muted: "#9ca3af",
  border: "#e5e7eb",
  // Sleep stages
  deep: "#6d28d9",
  deepBg: "#f5f3ff",
  core: "#1d4ed8",
  coreBg: "#eff6ff",
  rem: "#0e7490",
  remBg: "#ecfeff",
  awake: "#b45309",
  awakeBg: "#fffbeb",
  // Physio
  hr: "#b91c1c",
  hrBg: "#fff1f2",
  hrv: "#047857",
  hrvBg: "#f0fdf4",
  rr: "#0369a1",
  rrBg: "#f0f9ff",
  spo2: "#1d4ed8",
  spo2Bg: "#eff6ff",
  // Score
  great: "#059669",
  ok: "#d97706",
  bad: "#dc2626",
} as const;

export const STAGE_META: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  deep: { color: C.deep, bg: C.deepBg, label: "Tief" },
  core: { color: C.core, bg: C.coreBg, label: "Core" },
  rem: { color: C.rem, bg: C.remBg, label: "REM" },
  awake: { color: C.awake, bg: C.awakeBg, label: "Wach" },
};

export const scoreColor = (s: number): string =>
  s >= 80 ? C.great : s >= 55 ? C.ok : C.bad;

export const scoreLabel = (s: number): string =>
  s >= 85
    ? "Ausgezeichnet"
    : s >= 70
    ? "Gut"
    : s >= 55
    ? "Mäßig"
    : s >= 40
    ? "Schlecht"
    : "Sehr schlecht";
