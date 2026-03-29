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

// ─── Streak-at-Risk: täglicher Check um 21 Uhr ───────────────────────────────
// Aufrufen beim App-Start + nach jeder Habit-Änderung (cancelAndReschedule-Pattern)
export async function scheduleStreakAtRiskReminder({
  userName,
  habitTitle,
  streak,
}: {
  userName: string | null;
  habitTitle: string;
  streak: number;
}): Promise<void> {
  const result = await requestNotificationPermission();
  if (result !== "granted") return;

  // Alle alten Streak-Reminders entfernen
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.type === "streak-at-risk")
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const name = userName && userName !== "_onboarded" ? userName : null;
  const title = name
    ? `${name}, dein Streak ist in Gefahr! 🔥`
    : "Streak in Gefahr! 🔥";
  const body =
    streak > 3
      ? `${streak} Tage ${habitTitle} – gib nicht auf!`
      : `Schließ ${habitTitle} heute noch ab.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: "streak-at-risk" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

// Abbrechen wenn alle Habits des Tages erledigt sind
export async function cancelStreakAtRiskReminder(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.type === "streak-at-risk")
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
export async function scheduleHabitReminder({
  habitId,
  habitTitle,
  hour,
  minute,
  weekdays,
  userName, // ← NEU
  streak, // ← NEU
}: {
  habitId: string;
  habitTitle: string;
  hour: number;
  minute: number;
  weekdays?: number[];
  userName?: string | null; // ← NEU
  streak?: number; // ← NEU
}): Promise<PermissionResult> {
  await cancelHabitReminders(habitId);
  const result = await requestNotificationPermission();
  if (result !== "granted") return result;

  const days = weekdays ?? [1, 2, 3, 4, 5, 6, 7];

  // Personalisierter Body
  const name = userName && userName !== "_onboarded" ? userName : null;
  const body = buildReminderBody(habitTitle, streak ?? 0, name);

  await Promise.all(
    days.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${habitTitle}`,
          body,
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

// ─── Variierter Body-Text ─────────────────────────────────────────────────────
function buildReminderBody(
  habitTitle: string,
  streak: number,
  name: string | null
): string {
  const greeting = name ? `${name}, ` : "";

  if (streak === 0)
    return `${greeting}Zeit für ${habitTitle}. Starte deinen Streak heute!`;
  if (streak === 1) return `${greeting}Tag 1 von ${habitTitle} – bleib dabei!`;
  if (streak < 7)
    return `${greeting}${streak} Tage ${habitTitle}. Reiß nicht ab! 🔥`;
  if (streak < 30)
    return `${greeting}${streak}-Tage-Streak! ${habitTitle} wartet auf dich.`;
  return `${greeting}${streak} Tage am Stück. ${habitTitle} – du weißt was zu tun ist.`;
}
