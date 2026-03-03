// app/_layout.tsx
import { useUserStore } from "@/store/userStore";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "com.apple.healthkit Code=5",
  "Authorization not determined",
]);

export default function RootLayout() {
  const loadUser = useUserStore((s) => s.loadUser);
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="note" />
        <Stack.Screen
          name="planner"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
      {/* dark = schwarze Uhrzeit/Icons auf weißem Hintergrund */}
      <StatusBar style="dark" />
    </>
  );
}
