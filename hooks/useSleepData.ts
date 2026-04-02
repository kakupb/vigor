// hooks/useSleepData.ts
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useHealthAuth } from "./useHealthData";

let RNHealth: any = null;
try {
  RNHealth = require("react-native-health").default;
} catch {}

// ─── Sleep value constants ────────────────────────────────────────────────────
export const SV = {
  IN_BED: 0,
  ASLEEP_UNSPECIFIED: 1,
  AWAKE: 2,
  ASLEEP_CORE: 3,
  ASLEEP_DEEP: 4,
  ASLEEP_REM: 5,
} as const;

const STRING_MAP: Record<string, number> = {
  INBED: 0,
  ASLEEP: 1,
  AWAKE: 2,
  ASLEEP_UNSPECIFIED: 1,
  ASLEEP_CORE: 3,
  ASLEEP_DEEP: 4,
  ASLEEP_REM: 5,
};

function normVal(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return STRING_MAP[v.toUpperCase()] ?? 1;
  return 1;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type SleepStage =
  | "deep"
  | "core"
  | "rem"
  | "awake"
  | "inbed"
  | "unspecified";

function toStage(v: number): SleepStage {
  switch (v) {
    case SV.ASLEEP_DEEP:
      return "deep";
    case SV.ASLEEP_CORE:
      return "core";
    case SV.ASLEEP_REM:
      return "rem";
    case SV.AWAKE:
      return "awake";
    case SV.IN_BED:
      return "inbed";
    default:
      return "unspecified";
  }
}

function isSleep(v: number) {
  return (
    v === SV.ASLEEP_DEEP ||
    v === SV.ASLEEP_CORE ||
    v === SV.ASLEEP_REM ||
    v === SV.ASLEEP_UNSPECIFIED
  );
}

export type TSSample = { t: number; v: number };

export type SleepSample = {
  startDate: Date;
  endDate: Date;
  value: number;
  durationMin: number;
  stage: SleepStage;
};

export type SleepNight = {
  date: Date;
  dateLabel: string;
  bedtime: Date;
  wakeTime: Date;
  totalMinutes: number;
  inBedMinutes: number;
  deepMinutes: number;
  coreMinutes: number;
  remMinutes: number;
  awakeMinutes: number;
  awakenings: number;
  sleepScore: number;
  avgHeartRate: number;
  minHeartRate: number;
  avgHRV: number;
  avgRespiratoryRate: number;
  avgSpO2: number;
  wristTempDelta: number;
  restingHeartRate: number;
  samples: SleepSample[];
  hrSeries: TSSample[];
  hrvSeries: TSSample[];
  rrSeries: TSSample[];
  spo2Series: TSSample[];
};

export type SleepStats = {
  nights: SleepNight[];
  isLoading: boolean;
  avgDurationH: number;
  avgBedtime: string;
  avgWakeTime: string;
  bedtimeDeviationMin: number;
  avgSleepScore: number;
  debugLines: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mins(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / 60_000);
}
function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function toDateLabel(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}
function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// ─── Query helper (Promise wrapper) ──────────────────────────────────────────
async function querySamples(
  type: string,
  start: Date,
  end: Date
): Promise<any[]> {
  if (!RNHealth) return [];
  return new Promise((resolve) => {
    RNHealth.getSamples(
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        type,
        ascending: true,
      },
      (err: any, r: any[]) => resolve(err || !r ? [] : r)
    );
  });
}

// ─── Deduplicate overlapping sleep samples ────────────────────────────────────
function deduplicate(samples: SleepSample[]): SleepSample[] {
  const sorted = [...samples].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
  const result: SleepSample[] = [];
  for (const s of sorted) {
    const last = result[result.length - 1];
    if (last && s.startDate < last.endDate && s.value === last.value) continue;
    result.push(s);
  }
  return result;
}

// ─── Group samples into nights ────────────────────────────────────────────────
function groupNights(
  samples: SleepSample[]
): Array<{ start: Date; end: Date; samples: SleepSample[] }> {
  if (!samples.length) return [];
  const GAP_MS = 4 * 3_600_000;
  const nights: Array<{ start: Date; end: Date; samples: SleepSample[] }> = [];
  let current: { start: Date; end: Date; samples: SleepSample[] } | null = null;

  for (const s of samples) {
    if (!current || s.startDate.getTime() - current.end.getTime() > GAP_MS) {
      current = { start: s.startDate, end: s.endDate, samples: [s] };
      nights.push(current);
    } else {
      current.samples.push(s);
      if (s.endDate > current.end) current.end = s.endDate;
    }
  }

  const byDay = new Map<string, (typeof nights)[0][]>();
  for (const n of nights) {
    const wake = n.end;
    const k = `${wake.getFullYear()}-${wake.getMonth()}-${wake.getDate()}`;
    byDay.set(k, [...(byDay.get(k) ?? []), n]);
  }

  return Array.from(byDay.values())
    .map((sessions) => {
      const all = sessions.flatMap((s) => s.samples);
      const start = new Date(
        Math.min(...sessions.map((s) => s.start.getTime()))
      );
      const end = new Date(Math.max(...sessions.map((s) => s.end.getTime())));
      return { start, end, samples: all };
    })
    .filter(
      (sess) =>
        sess.samples
          .filter((s) => isSleep(s.value))
          .reduce((a, s) => a + s.durationMin, 0) >= 20
    );
}

// ─── Sleep score ──────────────────────────────────────────────────────────────
function score(
  n: Omit<
    SleepNight,
    "sleepScore" | "hrSeries" | "hrvSeries" | "rrSeries" | "spo2Series"
  >
): number {
  const h = n.totalMinutes / 60;
  if (h < 0.5) return 0;
  let durPts = 0;
  if (h >= 7) durPts = Math.min(40, 35 + (h - 7) * 2.5);
  else if (h >= 4) durPts = ((h - 4) / 3) * 35;
  const hasPhases = n.deepMinutes > 0 || n.remMinutes > 0;
  const t = n.totalMinutes || 1;
  const deepPts = hasPhases
    ? Math.min(20, (n.deepMinutes / t / 0.15) * 20)
    : 13;
  const remPts = hasPhases ? Math.min(20, (n.remMinutes / t / 0.2) * 20) : 13;
  const awakePenalty = Math.min(8, n.awakenings * 2);
  const hrvPts = n.avgHRV > 0 ? Math.min(10, (n.avgHRV / 45) * 10) : 6;
  const hrPts =
    n.avgHeartRate > 0
      ? Math.min(8, Math.max(0, ((75 - n.avgHeartRate) / 25) * 8))
      : 5;
  return Math.round(
    Math.max(
      0,
      Math.min(100, durPts + deepPts + remPts - awakePenalty + hrvPts + hrPts)
    )
  );
}

// ─── Build time-series ────────────────────────────────────────────────────────
function toSeries(
  samples: { value: number; startDate: Date }[],
  bedtime: Date
): TSSample[] {
  const bedMs = bedtime.getTime();
  return samples
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((s) => ({ t: (s.startDate.getTime() - bedMs) / 60_000, v: s.value }))
    .filter((s) => s.v > 0);
}

// ─── Format helpers (exported for UI) ────────────────────────────────────────
export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
export function formatTime(d: Date): string {
  return toTimeStr(d);
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useSleepAnalysis(days = 14): SleepStats {
  const { isAuthorized } = useHealthAuth();
  const [nights, setNights] = useState<SleepNight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthorized || Platform.OS !== "ios" || !RNHealth) return;
    setIsLoading(true);
    const start = new Date(Date.now() - days * 86_400_000);
    const end = new Date();
    const logs: string[] = [`auth:true days:${days}`];

    (async () => {
      try {
        // Sleep samples
        const rawSleep = await new Promise<any[]>((resolve) => {
          RNHealth.getSleepSamples(
            { startDate: start.toISOString(), endDate: end.toISOString() },
            (err: any, r: any[]) => resolve(err || !r ? [] : r)
          );
        });

        if (!rawSleep.length) {
          logs.push("no sleep data");
          setDebugLines([...logs]);
          setNights([]);
          setIsLoading(false);
          return;
        }

        const mapped: SleepSample[] = rawSleep.map((s: any) => {
          const st = new Date(s.startDate);
          const en = new Date(s.endDate);
          const v = normVal(s.value);
          return {
            startDate: st,
            endDate: en,
            value: v,
            durationMin: Math.round(mins(st, en)),
            stage: toStage(v),
          };
        });
        logs.push(`raw:${mapped.length}`);

        const deduped = deduplicate(mapped);
        const sessions = groupNights(deduped);
        logs.push(`nights:${sessions.length}`);

        if (!sessions.length) {
          setDebugLines([...logs]);
          setNights([]);
          setIsLoading(false);
          return;
        }

        // Fetch physio data
        const [hrRaw, hrvRaw, rrRaw, spo2Raw, restHrRaw] = await Promise.all([
          querySamples("HeartRate", start, end),
          querySamples("HeartRateVariabilitySDNN", start, end),
          querySamples("RespiratoryRate", start, end),
          querySamples("OxygenSaturation", start, end),
          querySamples("RestingHeartRate", start, end),
        ]);

        const toTyped = (r: any[]) =>
          r
            .map((s: any) => ({
              value: s.value ?? 0,
              startDate: new Date(s.startDate ?? s.start),
            }))
            .filter((s) => s.value > 0);

        const hrAll = toTyped(hrRaw);
        const hrvAll = toTyped(hrvRaw);
        const rrAll = toTyped(rrRaw);
        const spo2All = toTyped(spo2Raw).map((s) => ({
          ...s,
          value: s.value <= 1 ? s.value * 100 : s.value,
        }));
        const restHrAll = toTyped(restHrRaw);

        const result: SleepNight[] = sessions.map((sess) => {
          const S = sess.samples;
          const deep = S.filter((s) => s.value === SV.ASLEEP_DEEP).reduce(
            (a, s) => a + s.durationMin,
            0
          );
          const core = S.filter((s) => s.value === SV.ASLEEP_CORE).reduce(
            (a, s) => a + s.durationMin,
            0
          );
          const rem = S.filter((s) => s.value === SV.ASLEEP_REM).reduce(
            (a, s) => a + s.durationMin,
            0
          );
          const unspec = S.filter(
            (s) => s.value === SV.ASLEEP_UNSPECIFIED
          ).reduce((a, s) => a + s.durationMin, 0);
          const awake = S.filter((s) => s.value === SV.AWAKE).reduce(
            (a, s) => a + s.durationMin,
            0
          );
          const inbed = S.filter((s) => s.value === SV.IN_BED).reduce(
            (a, s) => a + s.durationMin,
            0
          );
          const hasPhases = deep > 0 || core > 0 || rem > 0;
          const totalMin = deep + core + rem + (hasPhases ? 0 : unspec);

          let wakeCount = 0,
            wasAsleep = false;
          for (const s of [...S].sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime()
          )) {
            if (isSleep(s.value)) {
              wasAsleep = true;
            } else if (s.value === SV.AWAKE && wasAsleep) {
              wakeCount++;
              wasAsleep = false;
            }
          }

          const PAD_MS = 30 * 60_000;
          const rangeStart = new Date(sess.start.getTime() - PAD_MS);
          const rangeEnd = new Date(sess.end.getTime() + PAD_MS);
          const inRange = (s: { startDate: Date }) =>
            s.startDate >= rangeStart && s.startDate <= rangeEnd;

          const hrV = hrAll.filter(inRange).map((s) => s.value);
          const hrvV = hrvAll.filter(inRange).map((s) => s.value);
          const rrV = rrAll.filter(inRange).map((s) => s.value);
          const spo2V = spo2All.filter(inRange).map((s) => s.value);
          const ds = new Date(sess.start);
          ds.setHours(0, 0, 0, 0);
          const de = new Date(sess.end);
          de.setHours(23, 59, 59);
          const restV = restHrAll
            .filter((s) => s.startDate >= ds && s.startDate <= de)
            .map((s) => s.value);

          const base: Omit<
            SleepNight,
            "sleepScore" | "hrSeries" | "hrvSeries" | "rrSeries" | "spo2Series"
          > = {
            date: sess.end,
            dateLabel: toDateLabel(sess.end),
            bedtime: sess.start,
            wakeTime: sess.end,
            totalMinutes: totalMin,
            inBedMinutes: totalMin + inbed + awake,
            deepMinutes: deep,
            coreMinutes: core,
            remMinutes: rem,
            awakeMinutes: awake,
            awakenings: wakeCount,
            avgHeartRate: Math.round(avg(hrV)),
            minHeartRate: hrV.length ? Math.round(Math.min(...hrV)) : 0,
            avgHRV: Math.round(avg(hrvV) * 10) / 10,
            avgRespiratoryRate: Math.round(avg(rrV) * 10) / 10,
            avgSpO2: Math.round(avg(spo2V) * 10) / 10,
            wristTempDelta: 0,
            restingHeartRate: Math.round(avg(restV)),
            samples: S,
          };

          return {
            ...base,
            sleepScore: score(base),
            hrSeries: toSeries(hrAll.filter(inRange), sess.start),
            hrvSeries: toSeries(hrvAll.filter(inRange), sess.start),
            rrSeries: toSeries(rrAll.filter(inRange), sess.start),
            spo2Series: toSeries(spo2All.filter(inRange), sess.start),
          };
        });

        result.sort((a, b) => b.date.getTime() - a.date.getTime());
        logs.push(`✓ ${result.length} nights`);
        setNights(result);
        setDebugLines([...logs]);
      } catch (e: any) {
        logs.push(`ERR:${String(e?.message ?? e).slice(0, 100)}`);
        setDebugLines([...logs]);
        setNights([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthorized, days]);

  const l7 = nights.slice(0, 7);
  const avgH = l7.length ? avg(l7.map((n) => n.totalMinutes)) / 60 : 0;

  function avgTimeStr(dates: Date[]): string {
    if (!dates.length) return "--";
    const avgMs = avg(
      dates.map((d) => {
        const t = new Date(d);
        t.setFullYear(2000, 0, 1);
        return t.getTime();
      })
    );
    return toTimeStr(new Date(avgMs));
  }

  const bedtimes = l7.map((n) => n.bedtime);
  const avgBedtimeMs = bedtimes.length
    ? avg(
        bedtimes.map((d) => {
          const t = new Date(d);
          t.setFullYear(2000, 0, 1);
          return t.getTime();
        })
      )
    : 0;
  const devMs = bedtimes.length
    ? Math.sqrt(
        avg(
          bedtimes.map((d) => {
            const t = new Date(d);
            t.setFullYear(2000, 0, 1);
            return Math.pow(t.getTime() - avgBedtimeMs, 2);
          })
        )
      )
    : 0;

  return {
    nights,
    isLoading,
    avgDurationH: Math.round(avgH * 10) / 10,
    avgBedtime: avgTimeStr(bedtimes),
    avgWakeTime: avgTimeStr(l7.map((n) => n.wakeTime)),
    bedtimeDeviationMin: Math.round(devMs / 60_000),
    avgSleepScore: l7.length ? Math.round(avg(l7.map((n) => n.sleepScore))) : 0,
    debugLines,
  };
}
