// services/weeklyReviewService.ts
import * as Notifications from "expo-notifications";
import { requestNotificationPermission } from "./notificationService";

export async function scheduleWeeklyReviewNotification(
  userName: string | null
): Promise<void> {
  const result = await requestNotificationPermission();
  if (result !== "granted") return;

  // Alle alten Weekly-Review-Notifications entfernen
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.type === "weekly-review")
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const name = userName && userName !== "_onboarded" ? userName : null;
  const title = name
    ? `${name}, deine Woche wartet auf dich 📊`
    : "Dein Wochenrückblick ist bereit 📊";

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: "Sieh wie du diese Woche performt hast — Fokus, Habits, Streak.",
      data: { type: "weekly-review" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sonntag (1 = Sonntag in expo-notifications)
      hour: 18,
      minute: 0,
    },
  });
}

export type WeeklyStats = {
  weekLabel: string;
  focusMinutes: number;
  focusSessions: number;
  bestSessionMinutes: number;
  habitRate: number; // 0–1
  habitsCompleted: number;
  habitsTotal: number;
  topHabit: { title: string; streak: number } | null;
  streakStart: number; // Streak zu Wochenbeginn
  streakEnd: number; // Streak aktuell
  avgSleepScore: number | null;
};

export function computeWeeklyStats({
  sessions,
  habits,
  avgSleepScore,
}: {
  sessions: any[];
  habits: any[];
  avgSleepScore?: number;
}): WeeklyStats {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Montag
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekLabel = `${weekStart.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  })} – ${weekEnd.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  })}`;

  // Fokus-Sessions der Woche
  const weekSessions = sessions.filter(
    (s) =>
      s.startedAt >= weekStart.getTime() && s.startedAt <= weekEnd.getTime()
  );
  const focusMinutes = weekSessions.reduce(
    (sum, s) => sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
    0
  );
  const bestSessionMinutes = weekSessions.reduce(
    (max, s) =>
      Math.max(max, Math.floor((s.focusSeconds ?? s.durationSeconds) / 60)),
    0
  );

  // Habit-Rate der Woche
  let habitsCompleted = 0;
  let habitsTotal = 0;

  const weekDays: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    weekDays.push(d.getTime());
  }

  for (const { habit } of habits) {
    for (const ts of weekDays) {
      // Nur geplante Tage zählen
      const { wasScheduledOn } = require("@/utils/scheduleUtils");
      if (wasScheduledOn(ts, habit.schedule)) {
        habitsTotal++;
        if (habit.completedDates.includes(ts)) habitsCompleted++;
      }
    }
  }

  const habitRate = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;

  // Top Habit (höchster Streak)
  const topHabit = habits.reduce(
    (best: any, { habit, streak }: any) =>
      (streak ?? 0) > (best?.streak ?? 0)
        ? { title: habit.title, streak }
        : best,
    null
  );

  return {
    weekLabel,
    focusMinutes,
    focusSessions: weekSessions.length,
    bestSessionMinutes,
    habitRate,
    habitsCompleted,
    habitsTotal,
    topHabit,
    streakStart: 0, // wird nicht mehr getrackt rückwirkend
    streakEnd: 0,
    avgSleepScore: avgSleepScore ?? null,
  };
}
