// services/notificationService.ts
// Benötigt: npx expo install expo-notifications
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionResult =
  | "granted"
  | "denied_ask_again" // Abgelehnt, kann erneut gefragt werden (unwahrscheinlich auf iOS)
  | "denied_permanent"; // Dauerhaft abgelehnt → Einstellungen öffnen

// ─── Berechtigungen anfragen ──────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("habits", {
      name: "Habit Erinnerungen",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing, canAskAgain } =
    await Notifications.getPermissionsAsync();
  if (existing === "granted") return "granted";

  // iOS: Nur ein einziges Mal kann der Dialog angezeigt werden
  if (!canAskAgain) return "denied_permanent";

  const { status } = await Notifications.requestPermissionsAsync();
  if (status === "granted") return "granted";
  return "denied_permanent";
}

/**
 * Öffnet die iOS-Einstellungen für die App direkt auf der Notifications-Seite.
 * Aufrufen wenn requestNotificationPermission() → "denied_permanent"
 */
export function openNotificationSettings(): void {
  Linking.openSettings();
}

// ─── Notification für ein Habit planen ───────────────────────────────────────
export async function scheduleHabitReminder({
  habitId,
  habitTitle,
  hour,
  minute,
  weekdays,
}: {
  habitId: string;
  habitTitle: string;
  hour: number;
  minute: number;
  weekdays?: number[]; // 1=Mo ... 7=So (ISO-Wochentag)
}): Promise<PermissionResult> {
  await cancelHabitReminders(habitId);

  const result = await requestNotificationPermission();
  if (result !== "granted") return result;

  const days = weekdays ?? [1, 2, 3, 4, 5, 6, 7];

  await Promise.all(
    days.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ " + habitTitle,
          body: "Zeit für dein tägliches Habit!",
          data: { habitId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        },
      })
    )
  );

  return "granted";
}

// ─── Notifications für ein Habit löschen ─────────────────────────────────────
export async function cancelHabitReminders(habitId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.habitId === habitId)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function cancelAllHabitReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getHabitReminderTime(
  habitId: string
): Promise<{ hour: number; minute: number } | null> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const match = scheduled.find((n) => n.content.data?.habitId === habitId);
  if (!match) return null;
  const trigger = match.trigger as any;
  return { hour: trigger.hour ?? 8, minute: trigger.minute ?? 0 };
}
