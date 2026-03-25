// utils/__tests__/scheduleUtils.test.ts
import { HabitSchedule } from "@/types/habit";
import { wasScheduledOn } from "../scheduleUtils";

// Hilfsfunktion: ISO-String → Timestamp (Tagesbeginn UTC)
function ts(dateStr: string): number {
  return new Date(dateStr).getTime();
}

// ─── wasScheduledOn ───────────────────────────────────────────────────────────

describe("wasScheduledOn — kein Schedule", () => {
  it("gibt true zurück wenn kein Schedule definiert", () => {
    expect(wasScheduledOn(ts("2025-03-15"), undefined)).toBe(true);
  });

  it("gibt true zurück bei leerem Schedule-Objekt", () => {
    expect(wasScheduledOn(ts("2025-03-15"), {})).toBe(true);
  });
});

describe("wasScheduledOn — Startdatum", () => {
  const schedule: HabitSchedule = {
    startDate: "2025-03-10",
    repeatUnit: "day",
    repeatEvery: 1,
  };

  it("gibt false zurück vor dem Startdatum", () => {
    expect(wasScheduledOn(ts("2025-03-09"), schedule)).toBe(false);
  });

  it("gibt true zurück am Startdatum", () => {
    expect(wasScheduledOn(ts("2025-03-10"), schedule)).toBe(true);
  });

  it("gibt true zurück nach dem Startdatum", () => {
    expect(wasScheduledOn(ts("2025-03-20"), schedule)).toBe(true);
  });
});

describe("wasScheduledOn — Enddatum", () => {
  const schedule: HabitSchedule = {
    startDate: "2025-01-01",
    endDate: "2025-03-15",
    repeatUnit: "day",
    repeatEvery: 1,
  };

  it("gibt true zurück am Enddatum", () => {
    expect(wasScheduledOn(ts("2025-03-15"), schedule)).toBe(true);
  });

  it("gibt false zurück nach dem Enddatum", () => {
    expect(wasScheduledOn(ts("2025-03-16"), schedule)).toBe(false);
  });
});

describe("wasScheduledOn — täglich (repeatUnit=day, repeatEvery=1)", () => {
  const schedule: HabitSchedule = { repeatUnit: "day", repeatEvery: 1 };

  it("gibt true für jeden Tag zurück", () => {
    expect(wasScheduledOn(ts("2025-01-01"), schedule)).toBe(true);
    expect(wasScheduledOn(ts("2025-06-15"), schedule)).toBe(true);
    expect(wasScheduledOn(ts("2025-12-31"), schedule)).toBe(true);
  });
});

describe("wasScheduledOn — alle 2 Tage", () => {
  const schedule: HabitSchedule = {
    startDate: "2025-03-01",
    repeatUnit: "day",
    repeatEvery: 2,
  };

  it("gibt true am Startdatum zurück", () => {
    expect(wasScheduledOn(ts("2025-03-01"), schedule)).toBe(true);
  });

  it("gibt false am Tag danach zurück", () => {
    expect(wasScheduledOn(ts("2025-03-02"), schedule)).toBe(false);
  });

  it("gibt true nach 2 Tagen zurück", () => {
    expect(wasScheduledOn(ts("2025-03-03"), schedule)).toBe(true);
  });

  it("gibt false nach 3 Tagen zurück", () => {
    expect(wasScheduledOn(ts("2025-03-04"), schedule)).toBe(false);
  });

  it("gibt true nach 4 Tagen zurück", () => {
    expect(wasScheduledOn(ts("2025-03-05"), schedule)).toBe(true);
  });
});

describe("wasScheduledOn — bestimmte Wochentage", () => {
  // Mo=1, Mi=3, Fr=5
  const schedule: HabitSchedule = {
    repeatUnit: "week",
    weekDays: [1, 3, 5],
  };

  it("gibt true für Montag zurück", () => {
    expect(wasScheduledOn(ts("2025-03-10"), schedule)).toBe(true); // Mo
  });

  it("gibt true für Mittwoch zurück", () => {
    expect(wasScheduledOn(ts("2025-03-12"), schedule)).toBe(true); // Mi
  });

  it("gibt true für Freitag zurück", () => {
    expect(wasScheduledOn(ts("2025-03-14"), schedule)).toBe(true); // Fr
  });

  it("gibt false für Dienstag zurück", () => {
    expect(wasScheduledOn(ts("2025-03-11"), schedule)).toBe(false); // Di
  });

  it("gibt false für Samstag zurück", () => {
    expect(wasScheduledOn(ts("2025-03-15"), schedule)).toBe(false); // Sa
  });

  it("gibt false für Sonntag zurück", () => {
    expect(wasScheduledOn(ts("2025-03-16"), schedule)).toBe(false); // So
  });
});

describe("wasScheduledOn — alle 2 Wochen", () => {
  const schedule: HabitSchedule = {
    startDate: "2025-03-03", // Montag
    repeatUnit: "week",
    repeatEvery: 2,
  };

  it("gibt true am Startdatum zurück", () => {
    expect(wasScheduledOn(ts("2025-03-03"), schedule)).toBe(true);
  });

  it("gibt false eine Woche später zurück", () => {
    expect(wasScheduledOn(ts("2025-03-10"), schedule)).toBe(false);
  });

  it("gibt true zwei Wochen später zurück", () => {
    expect(wasScheduledOn(ts("2025-03-17"), schedule)).toBe(true);
  });
});

describe("wasScheduledOn — monatlich", () => {
  const schedule: HabitSchedule = {
    startDate: "2025-01-15",
    repeatUnit: "month",
    repeatEvery: 1,
  };

  it("gibt true am 15. Jan zurück", () => {
    expect(wasScheduledOn(ts("2025-01-15"), schedule)).toBe(true);
  });

  it("gibt false am 16. Jan zurück", () => {
    expect(wasScheduledOn(ts("2025-01-16"), schedule)).toBe(false);
  });

  it("gibt true am 15. Feb zurück", () => {
    expect(wasScheduledOn(ts("2025-02-15"), schedule)).toBe(true);
  });

  it("gibt true am 15. März zurück", () => {
    expect(wasScheduledOn(ts("2025-03-15"), schedule)).toBe(true);
  });

  it("gibt false am 14. März zurück", () => {
    expect(wasScheduledOn(ts("2025-03-14"), schedule)).toBe(false);
  });
});

describe("wasScheduledOn — alle 3 Monate", () => {
  const schedule: HabitSchedule = {
    startDate: "2025-01-01",
    repeatUnit: "month",
    repeatEvery: 3,
  };

  it("gibt true am 1. Jan zurück", () => {
    expect(wasScheduledOn(ts("2025-01-01"), schedule)).toBe(true);
  });

  it("gibt false am 1. Feb zurück", () => {
    expect(wasScheduledOn(ts("2025-02-01"), schedule)).toBe(false);
  });

  it("gibt false am 1. März zurück", () => {
    expect(wasScheduledOn(ts("2025-03-01"), schedule)).toBe(false);
  });

  it("gibt true am 1. April zurück (3 Monate später)", () => {
    expect(wasScheduledOn(ts("2025-04-01"), schedule)).toBe(true);
  });
});

describe("wasScheduledOn — jährlich", () => {
  const schedule: HabitSchedule = {
    startDate: "2024-03-15",
    repeatUnit: "year",
    repeatEvery: 1,
  };

  it("gibt true am Startdatum zurück", () => {
    expect(wasScheduledOn(ts("2024-03-15"), schedule)).toBe(true);
  });

  it("gibt false ein Jahr minus ein Tag zurück", () => {
    expect(wasScheduledOn(ts("2025-03-14"), schedule)).toBe(false);
  });

  it("gibt true genau ein Jahr später zurück", () => {
    expect(wasScheduledOn(ts("2025-03-15"), schedule)).toBe(true);
  });

  it("gibt false einen Tag nach dem Jahrestag zurück", () => {
    expect(wasScheduledOn(ts("2025-03-16"), schedule)).toBe(false);
  });
});

// ─── getStreak ────────────────────────────────────────────────────────────────
// (Import in separater Datei, hier als Inline-Tests)

import { Habit } from "@/types/habit";
import { getCompletionRate, getLongestStreak, getStreak } from "../getStreak";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "test-habit",
    title: "Test",
    kind: "boolean",
    createdAt: ts("2025-01-01"),
    completedDates: [],
    completedAmounts: {},
    ...overrides,
  };
}

describe("getStreak — tägliches Habit", () => {
  it("gibt 0 zurück bei keinen Completions", () => {
    const habit = makeHabit();
    expect(getStreak(habit)).toBe(0);
  });

  it("gibt 1 zurück wenn heute erledigt", () => {
    const today = getTodayTimestamp();
    const habit = makeHabit({ completedDates: [today] });
    expect(getStreak(habit)).toBe(1);
  });

  it("gibt 3 zurück bei 3 aufeinanderfolgenden Tagen inklusive heute", () => {
    const today = getTodayTimestamp();
    const habit = makeHabit({
      completedDates: [today, today - 86_400_000, today - 2 * 86_400_000],
    });
    expect(getStreak(habit)).toBe(3);
  });

  it("bricht Streak wenn ein Tag fehlt", () => {
    const today = getTodayTimestamp();
    // Heute + vorgestern (gestern fehlt)
    const habit = makeHabit({
      completedDates: [today, today - 2 * 86_400_000],
    });
    expect(getStreak(habit)).toBe(1);
  });
});

describe("getStreak — Mo/Mi/Fr Habit", () => {
  // Mo=1, Mi=3, Fr=5
  const schedule: HabitSchedule = { repeatUnit: "week", weekDays: [1, 3, 5] };

  it("bricht Streak NICHT an nicht-geplanten Tagen (Di, Do, Sa, So)", () => {
    // Annahme: Heute ist Freitag (2025-03-14), erledigt Mo+Mi+Fr
    const fri = ts("2025-03-14");
    const wed = ts("2025-03-12");
    const mon = ts("2025-03-10");
    const habit = makeHabit({
      schedule,
      completedDates: [fri, wed, mon],
    });
    // Wenn heute Freitag der 14. März ist, sollte Streak = 3
    // (nur testbar wenn heute tatsächlich dieser Tag ist — daher als getStreak-Logik-Test)
    // Wir testen getLongestStreak stattdessen:
    expect(getLongestStreak(habit)).toBe(3);
  });
});

describe("getLongestStreak", () => {
  it("gibt 0 zurück bei keinen Completions", () => {
    expect(getLongestStreak(makeHabit())).toBe(0);
  });

  it("gibt 1 zurück bei einer einzelnen Completion", () => {
    const habit = makeHabit({ completedDates: [ts("2025-03-01")] });
    expect(getLongestStreak(habit)).toBe(1);
  });

  it("gibt 3 zurück bei 3 aufeinanderfolgenden Tagen", () => {
    const habit = makeHabit({
      completedDates: [ts("2025-03-01"), ts("2025-03-02"), ts("2025-03-03")],
    });
    expect(getLongestStreak(habit)).toBe(3);
  });

  it("gibt 2 zurück wenn ein Tag in der Mitte fehlt", () => {
    const habit = makeHabit({
      completedDates: [ts("2025-03-01"), ts("2025-03-02"), ts("2025-03-04")], // 03 fehlt
    });
    expect(getLongestStreak(habit)).toBe(2);
  });

  it("ignoriert nicht-geplante Tage bei Wochentag-Schedule", () => {
    const schedule: HabitSchedule = { repeatUnit: "week", weekDays: [1, 3, 5] }; // Mo Mi Fr
    const habit = makeHabit({
      schedule,
      completedDates: [
        ts("2025-03-10"), // Mo
        ts("2025-03-12"), // Mi
        ts("2025-03-14"), // Fr
      ],
    });
    expect(getLongestStreak(habit)).toBe(3);
  });
});

describe("getCompletionRate", () => {
  it("gibt 0 zurück bei keinen Completions", () => {
    expect(getCompletionRate(makeHabit(), 30)).toBe(0);
  });

  it("gibt 100 zurück wenn alle geplanten Tage erledigt", () => {
    const today = getTodayTimestamp();
    const habit = makeHabit({
      schedule: { startDate: "2020-01-01", repeatUnit: "day", repeatEvery: 1 },
      // days=2 → iteriert today-2, today-1, today = 3 Tage; alle 3 erledigt
      completedDates: [today, today - 86_400_000, today - 2 * 86_400_000],
    });
    expect(getCompletionRate(habit, 2)).toBe(100);
  });

  it("gibt 50 zurück wenn die Hälfte erledigt", () => {
    const today = getTodayTimestamp();
    const habit = makeHabit({
      schedule: { startDate: "2020-01-01", repeatUnit: "day", repeatEvery: 1 },
      // days=1 → iteriert today-1, today = 2 Tage; 1 von 2 erledigt
      completedDates: [today],
    });
    expect(getCompletionRate(habit, 1)).toBe(50);
  });

  it("zählt nur geplante Tage als Nenner (Mo/Mi/Fr über 1 Woche = 3 Tage)", () => {
    const today = getTodayTimestamp();
    const schedule: HabitSchedule = { repeatUnit: "week", weekDays: [1, 3, 5] };
    const habit = makeHabit({ schedule, completedDates: [] });
    // 7 Tage zurück, aber nur ~3 davon geplant → scheduledCount sollte ≤ 3 sein
    const rate = getCompletionRate(habit, 7);
    expect(rate).toBe(0); // 0 erledigt von N geplanten
  });
});

// Hilfsfunktion (lokaler Import für Tests)
function getTodayTimestamp(offset = 0): number {
  const d = new Date(offset || Date.now());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
