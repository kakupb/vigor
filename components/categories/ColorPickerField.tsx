// components/categories/ColorPickerField.tsx

import { useAppColors } from "@/hooks/useAppColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Vollpalette — 9 Gruppen × 7 Töne
const PALETTE: { color: string; name: string }[][] = [
  [
    { color: "#94a3b8", name: "Silber" },
    { color: "#64748b", name: "Schiefer" },
    { color: "#475569", name: "Stahlblau" },
    { color: "#334155", name: "Dunkelgrau" },
    { color: "#1e293b", name: "Nachtblau" },
    { color: "#0f172a", name: "Marine" },
    { color: "#000000", name: "Schwarz" },
  ],
  [
    { color: "#fca5a5", name: "Lachsrot" },
    { color: "#f87171", name: "Hellrot" },
    { color: "#ef4444", name: "Rot" },
    { color: "#dc2626", name: "Lebhaftrot" },
    { color: "#b91c1c", name: "Kirschrot" },
    { color: "#991b1b", name: "Dunkelrot" },
    { color: "#7f1d1d", name: "Weinrot" },
  ],
  [
    { color: "#fdba74", name: "Pfirsich" },
    { color: "#fb923c", name: "Hellorange" },
    { color: "#f97316", name: "Orange" },
    { color: "#ea580c", name: "Lebhaftorange" },
    { color: "#c2410c", name: "Terrakotta" },
    { color: "#9a3412", name: "Kupfer" },
    { color: "#7c2d12", name: "Rostbraun" },
  ],
  [
    { color: "#fde047", name: "Hellgelb" },
    { color: "#facc15", name: "Gelb" },
    { color: "#eab308", name: "Gold" },
    { color: "#ca8a04", name: "Senf" },
    { color: "#a16207", name: "Ocker" },
    { color: "#854d0e", name: "Bernstein" },
    { color: "#713f12", name: "Dunkelgold" },
  ],
  [
    { color: "#86efac", name: "Mintgrün" },
    { color: "#4ade80", name: "Hellgrün" },
    { color: "#22c55e", name: "Grün" },
    { color: "#16a34a", name: "Lebhaftgrün" },
    { color: "#15803d", name: "Waldgrün" },
    { color: "#166534", name: "Dunkelgrün" },
    { color: "#14532d", name: "Tannengrün" },
  ],
  [
    { color: "#5eead4", name: "Aqua" },
    { color: "#2dd4bf", name: "Türkis" },
    { color: "#14b8a6", name: "Smaragd" },
    { color: "#0d9488", name: "Blaugrün" },
    { color: "#0f766e", name: "Petrol" },
    { color: "#115e59", name: "Dunkelpetrol" },
    { color: "#134e4a", name: "Malachit" },
  ],
  [
    { color: "#93c5fd", name: "Hellblau" },
    { color: "#60a5fa", name: "Eisblau" },
    { color: "#3b82f6", name: "Blau" },
    { color: "#2563eb", name: "Kobalt" },
    { color: "#1d4ed8", name: "Königsblau" },
    { color: "#1e40af", name: "Dunkelblau" },
    { color: "#1e3a8a", name: "Marineblau" },
  ],
  [
    { color: "#c4b5fd", name: "Lavendel" },
    { color: "#a78bfa", name: "Helllila" },
    { color: "#8b5cf6", name: "Lila" },
    { color: "#7c3aed", name: "Violett" },
    { color: "#6d28d9", name: "Dunkelviolett" },
    { color: "#5b21b6", name: "Indigo" },
    { color: "#4c1d95", name: "Pflaume" },
  ],
  [
    { color: "#f0abfc", name: "Hellpink" },
    { color: "#e879f9", name: "Pink" },
    { color: "#d946ef", name: "Magenta" },
    { color: "#c026d3", name: "Fuchsia" },
    { color: "#a21caf", name: "Dunkelrosa" },
    { color: "#86198f", name: "Orchidee" },
    { color: "#701a75", name: "Pflaumenpink" },
  ],
];

// Vorschau: 2 Reihen, ästhetisch verteilt — mittlere Sättigungsstufe jeder Gruppe
const PALETTE_PREVIEW: { color: string; name: string }[][] = [
  [
    PALETTE[6][2], // Blau
    PALETTE[4][2], // Grün
    PALETTE[5][2], // Smaragd
    PALETTE[2][2], // Orange
    PALETTE[3][2], // Gold
    PALETTE[1][2], // Rot
    PALETTE[7][2], // Lila
  ],
  [
    PALETTE[8][2], // Magenta
    PALETTE[6][4], // Königsblau
    PALETTE[4][4], // Waldgrün
    PALETTE[0][2], // Stahlblau
    PALETTE[2][4], // Terrakotta
    PALETTE[7][4], // Dunkelviolett
    PALETTE[0][6], // Schwarz
  ],
];

// Ist die Farbe so dunkel, dass weißer Text nötig ist?
function needsWhiteText(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function findColorName(hex: string): string {
  for (const row of PALETTE) {
    const found = row.find((c) => c.color.toLowerCase() === hex.toLowerCase());
    if (found) return found.name;
  }
  return "Eigene Farbe";
}

type Props = { color: string; onChange: (color: string) => void };

export function ColorPickerField({ color, onChange }: Props) {
  const c = useAppColors();
  const [showAll, setShowAll] = useState(false);
  const displayPalette = showAll ? PALETTE : PALETTE_PREVIEW;
  const colorName = findColorName(color);
  const textColor = needsWhiteText(color) ? "#fff" : "#1e293b";

  function renderCell(item: { color: string; name: string }) {
    const selected = color.toLowerCase() === item.color.toLowerCase();
    return (
      <Pressable
        key={item.color}
        onPress={() => {
          Haptics.selectionAsync();
          onChange(item.color);
        }}
        style={[
          s.cell,
          { backgroundColor: item.color },
          selected && s.cellSelected,
        ]}
      >
        {selected && (
          <Ionicons
            name="checkmark"
            size={11}
            color={needsWhiteText(item.color) ? "#fff" : "#1e293b"}
          />
        )}
      </Pressable>
    );
  }

  return (
    <View style={s.root}>
      {/* Vorschau mit Farbname */}
      <View style={[s.preview, { backgroundColor: color }]}>
        <Text style={[s.colorName, { color: "#fff" }]}>{colorName}</Text>
      </View>

      {/* Palette */}
      <View style={s.grid}>
        {displayPalette.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map(renderCell)}
          </View>
        ))}
      </View>

      {/* Mehr / Weniger */}
      <Pressable
        onPress={() => setShowAll(!showAll)}
        style={[
          s.moreBtn,
          {
            borderColor: c.borderDefault,
            backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
          },
        ]}
      >
        <Ionicons
          name={showAll ? "chevron-up" : "chevron-down"}
          size={14}
          color={c.textMuted}
        />
        <Text style={[s.moreBtnText, { color: c.textMuted }]}>
          {showAll ? "Weniger anzeigen" : "Alle Farben anzeigen"}
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 10 },
  preview: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  colorName: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  grid: { gap: 5 },
  row: { flexDirection: "row", gap: 5 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  cellSelected: { borderWidth: 3, borderColor: "rgba(255,255,255,0.85)" },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  moreBtnText: { fontSize: 13, fontWeight: "500" },
});
