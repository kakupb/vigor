// app/_layout.tsx
const DEV_BYPASS = __DEV__ && true;

import { scheduleStreakAtRiskReminder } from "@/services/notificationService";
import { useAuthStore } from "@/store/authStore";
import { useFocusStore } from "@/store/focusStore";
import { useHabitStore } from "@/store/habitStore";
import { useHealthMetricsStore } from "@/store/healthMetricsStore";
import { useUserStore } from "@/store/userStore";
import { getTodayTimestamp } from "@/utils/dateUtils";
import { getStreak } from "@/utils/getStreak";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";

LogBox.ignoreLogs([
  "com.apple.healthkit Code=5",
  "Authorization not determined",
]);
function AuthGuard() {
  const { isAuthReady, session } = useAuthStore();
  const router = useRouter();
  const segments = useSegments() as string[];

  // ── Streak-at-Risk: einmalig beim Mount ──────────────────────────────────
  useEffect(() => {
    const habits = useHabitStore.getState().habits;
    const { name } = useUserStore.getState();
    const todayOpen = habits
      .filter((h) => isScheduledForToday(h.schedule))
      .filter((h) => !h.completedDates.includes(getTodayTimestamp()));
    if (todayOpen.length > 0) {
      const top = todayOpen.reduce(
        (a, b) => (getStreak(b) > getStreak(a) ? b : a),
        todayOpen[0]
      );
      scheduleStreakAtRiskReminder({
        userName: name,
        habitTitle: top.title,
        streak: getStreak(top),
      });
    }
  }, []); // ← leeres Array: nur einmal

  // ── Auth-Navigation: eigener Effect ─────────────────────────────────────
  useEffect(() => {
    if (DEV_BYPASS) {
      const inAuthGroup = segments[0] === "(auth)";
      if (inAuthGroup) router.replace("/(tabs)/fokus" as any);
      return;
    }
    if (!isAuthReady) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (session && inAuthGroup) {
      router.replace("/(tabs)/fokus" as any);
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login" as any);
    }
  }, [session, isAuthReady, segments]);

  return null;
}

export default function RootLayout() {
  const { initialize, isAuthReady } = useAuthStore();
  const { loadUser, setName } = useUserStore();
  const loadMetrics = useHealthMetricsStore((s) => s.load);
  const loadStats = useFocusStore((s) => s.loadStats);

  useEffect(() => {
    if (DEV_BYPASS) {
      setName("Dev User");
      loadMetrics();
      loadStats();
      return;
    }
    Promise.all([initialize(), loadUser(), loadMetrics(), loadStats()]);
  }, []);

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
