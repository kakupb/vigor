// components/today/QuoteOfTheDay.tsx
import { useDailyQuote } from "@/hooks/useQuote";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export function QuoteOfTheDay() {
  const { quote, isLoading } = useDailyQuote();
  const [showAuthor, setShowAuthor] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#94a3b8" />
      </View>
    );
  }

  if (!quote) return null;

  return (
    <Pressable
      style={styles.container}
      onPress={() => setShowAuthor(!showAuthor)}
      accessibilityLabel="Zitat des Tages"
    >
      {/* Left accent */}
      <View style={styles.accent} />

      <View style={styles.inner}>
        <Text style={styles.quoteChar}>"</Text>
        <Text style={styles.quoteText}>{quote.text}</Text>

        {showAuthor && quote.author && (
          <Text style={styles.author}>— {quote.author}</Text>
        )}

        {!showAuthor && <Text style={styles.hint}>Tippe für Autor</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#eef0f4",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accent: {
    width: 4,
    backgroundColor: "#e2c87a",
  },
  inner: {
    flex: 1,
    padding: 16,
  },
  quoteChar: {
    fontSize: 32,
    lineHeight: 28,
    color: "#e2c87a",
    fontWeight: "700",
    marginBottom: 2,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#334155",
    fontStyle: "italic",
  },
  author: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 10,
    fontWeight: "600",
  },
  hint: {
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 8,
    fontWeight: "400",
  },
});
