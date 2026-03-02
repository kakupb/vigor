// components/today/TodayEmptyState.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

type TodayEmptyStateProps = {
  icon?: string;
  message: string;
  buttonText: string;
  buttonColor: string;
  onPress: () => void;
};

export function TodayEmptyState({
  icon = "◇",
  message,
  buttonText,
  buttonColor,
  onPress,
}: TodayEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: buttonColor },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "white",
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eef0f4",
    borderStyle: "dashed",
  },
  icon: {
    fontSize: 28,
    marginBottom: 10,
    color: "#cbd5e1",
  },
  message: {
    fontSize: 15,
    color: "#94a3b8",
    marginBottom: 16,
    fontWeight: "500",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
