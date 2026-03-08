// app/_layout.tsx
// Root Layout — Auth-Guard + lädt alle Stores beim Start
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
  const loadUser = useUserStore((s) => s.loadUser);
  const loadMetrics = useHealthMetricsStore((s) => s.load);

  useEffect(() => {
    // Alles parallel laden beim App-Start
    Promise.all([
      initialize(), // Supabase Session + onAuthStateChange
      loadUser(), // Nutzerprofil
      loadMetrics(), // Health-Metriken Konfiguration
    ]);
  }, []);

  // Splash-Screen solange Auth nicht bereit
  if (!isAuthReady) {
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
