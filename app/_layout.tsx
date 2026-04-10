// app/_layout.tsx
const DEV_BYPASS = __DEV__ && false;
import { scheduleStreakAtRiskReminder } from "@/services/notificationService";
import { scheduleWeeklyReviewNotification } from "@/services/weeklyReviewService";
import { useAuthStore } from "@/store/authStore";
import { useCustomCategoryStore } from "@/store/customCategoryStore";
import { useFocusStore } from "@/store/focusStore";
import { useHabitStore } from "@/store/habitStore";
import { useHealthMetricsStore } from "@/store/healthMetricsStore";
import { useProjectStore } from "@/store/projectStore";
import { useSessionNoteStore } from "@/store/sessionNoteStore";
import { useUserStore } from "@/store/userStore";
import { getTodayTimestamp } from "@/utils/dateUtils";
import { getStreak } from "@/utils/getStreak";
import { isScheduledForToday } from "@/utils/scheduleUtils";
import * as Notifications from "expo-notifications";
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
  }, []);

  // ── Notification Deep Link ────────────────────────────────────────────────
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data;
        if (data?.habitId) {
          setTimeout(() => router.push(`/habit/${data.habitId}` as any), 300);
        }
        if (data?.type === "weekly-review") {
          setTimeout(() => router.push("/(tabs)/fortschritt" as any), 300);
        }
      }
    );
    // Kalt-Start: App war geschlossen
    Notifications.getLastNotificationResponseAsync().then(
      (response: Notifications.NotificationResponse | null) => {
        if (!response) return;
        const data = response.notification.request.content.data;
        if (data?.habitId)
          setTimeout(() => router.push(`/habit/${data.habitId}` as any), 500);
        if (data?.type === "weekly-review")
          setTimeout(() => router.push("/(tabs)/fortschritt" as any), 500);
      }
    );
    return () => sub.remove();
  }, []);

  // ── Auth-Navigation ───────────────────────────────────────────────────────
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
  const loadCustomCategories = useCustomCategoryStore((s) => s.load);
  const loadProjects = useProjectStore((s) => s.load);
  const loadSessionNotes = useSessionNoteStore((s) => s.load);

  useEffect(() => {
    if (DEV_BYPASS) {
      setName("Dev User");
      loadMetrics();
      loadStats();
      loadCustomCategories();
      loadProjects();
      loadSessionNotes();
      return;
    }
    Promise.all([
      initialize(),
      loadUser(),
      loadMetrics(),
      loadStats(),
      loadCustomCategories(),
      loadProjects(),
      loadSessionNotes(),
    ]);
    // Weekly Review Notification einmalig planen
    const { name } = useUserStore.getState();
    scheduleWeeklyReviewNotification(name);
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
