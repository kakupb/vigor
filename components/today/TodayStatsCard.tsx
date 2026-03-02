import { THEME } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

type TodayStatsCardProps = {
  label: string;
  completed: number;
  total: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
};

export function TodayStatsCard({
  label,
  completed,
  total,
  color,
  backgroundColor,
  borderColor,
}: TodayStatsCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={[styles.value, { color }]}>
        {completed}/{total}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  label: {
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
