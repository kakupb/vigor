// utils/weekUtils.ts

/**
 * Gibt Start und Ende einer Woche zurück (Montag-Sonntag)
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const current = new Date(date);

  // Montag = 1, Sonntag = 0 → Wir wollen Montag als Start
  const dayOfWeek = current.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sonntag → -6, sonst 1-dayOfWeek

  const monday = new Date(current);
  monday.setDate(current.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * Gibt Array von 7 Dates zurück (Mo-So) für eine Woche
 */
export function getWeekDays(date: Date): Date[] {
  const { start } = getWeekBounds(date);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return days;
}

/**
 * Formatiert Woche für Header (z.B. "6. - 12. Januar 2026")
 */
export function formatWeekLabel(date: Date): string {
  const { start, end } = getWeekBounds(date);

  const startDay = start.getDate();
  const endDay = end.getDate();

  const monthName = start.toLocaleDateString("de-DE", { month: "long" });
  const year = start.getFullYear();

  // Gleicher Monat
  if (start.getMonth() === end.getMonth()) {
    return `${startDay}. - ${endDay}. ${monthName} ${year}`;
  }

  // Über Monatswechsel
  const endMonthName = end.toLocaleDateString("de-DE", { month: "long" });
  return `${startDay}. ${monthName} - ${endDay}. ${endMonthName} ${year}`;
}

/**
 * Nächste Woche
 */
export function getNextWeek(date: Date): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + 7);
  return next;
}

/**
 * Vorherige Woche
 */
export function getPrevWeek(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(date.getDate() - 7);
  return prev;
}

/**
 * Ist das heute?
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Ist das diese Woche?
 */
export function isThisWeek(date: Date): boolean {
  const { start, end } = getWeekBounds(new Date());
  return date >= start && date <= end;
}
