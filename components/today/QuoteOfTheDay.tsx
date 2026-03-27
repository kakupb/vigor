// components/today/QuoteOfTheDay.tsx
// Schlichtes einzeiliges Zitat — kein aufgeblähter Block.

import { useAppColors } from "@/hooks/useAppColors";
import { useDailyQuote } from "@/hooks/useQuote";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function QuoteOfTheDay() {
  const { quote, isLoading } = useDailyQuote();
  const c = useAppColors();
  const [showAuthor, setShowAuthor] = useState(false);

  if (isLoading || !quote) return null;

  return (
    <Pressable
      onPress={() => setShowAuthor(!showAuthor)}
      style={[s.row, { borderColor: c.borderDefault }]}
      accessibilityLabel="Zitat des Tages"
    >
      <View style={[s.accent, { backgroundColor: "#e2c87a" }]} />
      <Text
        style={[s.text, { color: c.textSecondary }]}
        numberOfLines={showAuthor ? undefined : 2}
      >
        <Text style={[s.quote, { color: "#e2c87a" }]}>"</Text>
        {quote.text}
        {showAuthor && quote.author ? (
          <Text style={[s.author, { color: c.textMuted }]}>
            {" "}
            — {quote.author}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    minHeight: 36,
  },
  accent: { width: 3, alignSelf: "stretch" },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quote: { fontSize: 14, fontWeight: "700", fontStyle: "normal" },
  author: { fontStyle: "normal", fontWeight: "600" },
});
