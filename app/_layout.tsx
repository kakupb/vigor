// app/_layout.tsx
// Root Layout — Auth-Guard + lädt alle Stores beim Start
//
// DEV_BYPASS: In __DEV__ (Expo Go / Metro) kann der Login übersprungen werden.
// Einfach DEV_BYPASS = true setzen, dann startet die App direkt im Tab-Navigator.
// Vor dem Release immer auf false zurücksetzen (oder CI-Check einbauen).
//
const DEV_BYPASS = __DEV__ && false; // ← auf false setzen für Login-Tests

import { useAuthStore } from "@/store/authStore";
import { useHealthMetricsStore } from "@/store/healthMetricsStore";
import { useUserStore } from "@/store/userStore";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";

LogBox.ignoreLogs([
  "com.apple.healthkit Code=5",
  "Authorization not determined",
]);

// ─── Auth-Guard ───────────────────────────────────────────────────────────────
function AuthGuard() {
  const { isAuthReady, session } = useAuthStore();
  const router = useRouter();
  const segments = useSegments() as string[];

  useEffect(() => {
    // Im Dev-Bypass-Modus: immer zu Today navigieren
    if (DEV_BYPASS) {
      const inAuthGroup = segments[0] === "(auth)";
      if (inAuthGroup) router.replace("/(tabs)/today");
      return;
    }

    if (!isAuthReady) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (session && inAuthGroup) {
      router.replace("/(tabs)/today");
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login" as any);
    }
  }, [session, isAuthReady, segments]);

  return null;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const { initialize, isAuthReady } = useAuthStore();
  const { loadUser, setName } = useUserStore();
  const loadMetrics = useHealthMetricsStore((s) => s.load);

  useEffect(() => {
    if (DEV_BYPASS) {
      // Kein Supabase-Call, kein Netzwerk nötig.
      // Lokale Stores (Habits, Planner, Notes) laden aus AsyncStorage.
      setName("Dev User");
      loadMetrics();
      return;
    }

    Promise.all([initialize(), loadUser(), loadMetrics()]);
  }, []);

  // Im Bypass-Modus sofort rendern — kein Splash nötig
  if (!DEV_BYPASS && !isAuthReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3b8995" />
      </View>
    );
  }

  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="note" />
        <Stack.Screen
          name="planner"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
