// constants/habitStyles.ts

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const TYPOGRAPHY = {
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  streak: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
};

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};

// constants/habitStyles.ts

export const HABIT_COLORS = {
  completed: {
    background: "#ecfdf5",
    border: "#6ee7b7",
    accent: "#10b981",
    text: "#065f46",
    gradient: ["#10b981", "#059669"] as const, // ✅ ADD
  },
  incomplete: {
    background: "#f9fafb",
    border: "#e5e7eb",
    accent: "#6b7280",
    text: "#374151",
    gradient: ["#ffffff", "#f9fafb"] as const, // ✅ ADD
  },
  danger: {
    background: "#fef2f2",
    border: "#fca5a5",
    accent: "#ef4444",
  },
};

// ✅ ADD: Modern button styles
export const MODERN_BUTTON = {
  large: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  medium: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  small: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
};

// ✅ ADD: Modern shadows (layered)
export const MODERN_SHADOWS = {
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};
