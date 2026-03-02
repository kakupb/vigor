// utils/calendarUtils.ts

export function getCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];

  // 1. Ersten Tag des Monats bestimmen
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();

  // Montag-basiert (0 = Montag, 6 = Sonntag)
  const firstWeekdayMondayBased = firstWeekday === 0 ? 6 : firstWeekday - 1;

  // 2. Vormonat auffüllen (Tage vor dem 1. des Monats)
  for (let i = firstWeekdayMondayBased - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // 3. Aktueller Monat (alle Tage)
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day)); // ✅ Korrekt!
  }

  // 4. Nachmonat auffüllen (auf genau 42 Tage = 6 Wochen)
  const TOTAL_CELLS = 42;
  const remainingCells = TOTAL_CELLS - days.length;

  for (let day = 1; day <= remainingCells; day++) {
    days.push(new Date(year, month + 1, day)); // ✅ Nächster Monat!
  }

  return days;
}

export function groupIntoWeeks(days: Date[]): Date[][] {
  const DAYS_PER_WEEK = 7;
  const weeks: Date[][] = [];

  for (let i = 0; i < days.length; i += DAYS_PER_WEEK) {
    weeks.push(days.slice(i, i + DAYS_PER_WEEK));
  }

  return weeks;
}

/**
 * Prüft ob ein Datum im angegebenen Monat liegt
 */
export function isDateInMonth(date: Date, month: number): boolean {
  return date.getMonth() === month;
}

/**
 * Prüft ob ein Jahr/Monat der aktuelle Monat ist
 */
export function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return now.getMonth() === month && now.getFullYear() === year;
}
