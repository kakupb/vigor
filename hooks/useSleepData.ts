// hooks/useSleepData.ts
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useHealthAuth } from "./useHealthData";

let _hk: any = null;
try {
  _hk = require("@kingstinct/react-native-healthkit");
} catch {}

// ─── Identifiers ──────────────────────────────────────────────────────────────
export const SLEEP_ANALYSIS = "HKCategoryTypeIdentifierSleepAnalysis" as const;
export const HEART_RATE_ID = "HKQuantityTypeIdentifierHeartRate" as const;
export const HRV_SDNN =
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN" as const;
export const RESPIRATORY_RATE =
  "HKQuantityTypeIdentifierRespiratoryRate" as const;
export const OXYGEN_SATURATION =
  "HKQuantityTypeIdentifierOxygenSaturation" as const;
export const RESTING_HEART_RATE =
  "HKQuantityTypeIdentifierRestingHeartRate" as const;
export const WRIST_TEMPERATURE =
  "HKQuantityTypeIdentifierAppleSleepingWristTemperature" as const;

export const SV = {
  IN_BED: 0,
  ASLEEP_UNSPECIFIED: 1,
  AWAKE: 2,
  ASLEEP_CORE: 3,
  ASLEEP_DEEP: 4,
  ASLEEP_REM: 5,
} as const;

const STRING_MAP: Record<string, number> = {
  HKCategoryValueSleepAnalysisInBed: 0,
  HKCategoryValueSleepAnalysisAsleep: 1,
  HKCategoryValueSleepAnalysisAsleepUnspecified: 1,
  HKCategoryValueSleepAnalysisAwake: 2,
  HKCategoryValueSleepAnalysisAsleepCore: 3,
  HKCategoryValueSleepAnalysisAsleepDeep: 4,
  HKCategoryValueSleepAnalysisAsleepREM: 5,
};

function normVal(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return STRING_MAP[v] ?? 1;
  return 1;
}

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

// ─── Time-series sample for charts ───────────────────────────────────────────
export type TSSample = { t: number; v: number }; // t = minutes since bedtime

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
  /** Raw time-series for charts (t = minutes since bedtime) */
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

export function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
function toDateLabel(d: Date) {
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
function minsToStr(m: number) {
  const n = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(
    Math.floor(n % 60)
  ).padStart(2, "0")}`;
}

// ─── iPhone+Watch deduplication (fixes the 16h double-counting bug) ───────────
function deduplicate(raw: SleepSample[]): SleepSample[] {
  const watchPhases = raw.filter(
    (s) =>
      s.value === SV.ASLEEP_DEEP ||
      s.value === SV.ASLEEP_CORE ||
      s.value === SV.ASLEEP_REM
  );
  if (!watchPhases.length) return raw.filter((s) => s.value !== SV.IN_BED);

  return raw.filter((s) => {
    if (
      s.value === SV.ASLEEP_DEEP ||
      s.value === SV.ASLEEP_CORE ||
      s.value === SV.ASLEEP_REM ||
      s.value === SV.AWAKE
    )
      return true;
    if (s.value === SV.IN_BED || s.value === SV.ASLEEP_UNSPECIFIED) {
      const dur = s.endDate.getTime() - s.startDate.getTime();
      if (dur <= 0) return false;
      let overlap = 0;
      for (const w of watchPhases) {
        const oS = Math.max(s.startDate.getTime(), w.startDate.getTime());
        const oE = Math.min(s.endDate.getTime(), w.endDate.getTime());
        if (oE > oS) overlap += oE - oS;
      }
      return overlap / dur < 0.1;
    }
    return true;
  });
}

// ─── Group into nightly sessions ──────────────────────────────────────────────
function groupNights(
  samples: SleepSample[]
): { start: Date; end: Date; samples: SleepSample[] }[] {
  if (!samples.length) return [];
  const sorted = [...samples].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
  const raw: { start: Date; end: Date; samples: SleepSample[] }[] = [];
  let cur = {
    start: sorted[0].startDate,
    end: sorted[0].endDate,
    samples: [sorted[0]],
  };
  for (let i = 1; i < sorted.length; i++) {
    const s = sorted[i];
    if (mins(cur.end, s.startDate) > 90) {
      raw.push(cur);
      cur = { start: s.startDate, end: s.endDate, samples: [s] };
    } else {
      cur.end = new Date(Math.max(cur.end.getTime(), s.endDate.getTime()));
      cur.samples.push(s);
    }
  }
  raw.push(cur);

  // Merge sessions on same wake-up calendar day
  const byDay = new Map<string, (typeof raw)[0][]>();
  for (const sess of raw) {
    const k = `${sess.end.getFullYear()}-${sess.end.getMonth()}-${sess.end.getDate()}`;
    const ex = byDay.get(k) ?? [];
    ex.push(sess);
    byDay.set(k, ex);
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

// ─── Sleep score — realistic targets ─────────────────────────────────────────
// Targets: 7h = full duration, 15% deep, 20% REM.
// iPhone-only (no Watch phases): baseline points so score isn't penalised.
function score(
  n: Omit<
    SleepNight,
    "sleepScore" | "hrSeries" | "hrvSeries" | "rrSeries" | "spo2Series"
  >
): number {
  const h = n.totalMinutes / 60;
  if (h < 0.5) return 0;

  // Duration (40 pts): full at 7 h, tapers below 4 h and above 9.5 h
  let durPts = 0;
  if (h >= 7) durPts = Math.min(40, 35 + (h - 7) * 2.5);
  else if (h >= 4) durPts = ((h - 4) / 3) * 35;

  // Phases — baseline when no Watch data so iPhone users aren't penalised
  const hasPhases = n.deepMinutes > 0 || n.remMinutes > 0;
  const t = n.totalMinutes || 1;
  const deepPts = hasPhases
    ? Math.min(20, (n.deepMinutes / t / 0.15) * 20)
    : 13;
  const remPts = hasPhases ? Math.min(20, (n.remMinutes / t / 0.2) * 20) : 13;

  // Awakenings: –2 each, max –8
  const awakePenalty = Math.min(8, n.awakenings * 2);

  // HRV (10 pts): default 6 when no Watch
  const hrvPts = n.avgHRV > 0 ? Math.min(10, (n.avgHRV / 45) * 10) : 6;

  // HR (8 pts): default 5 when no Watch; optimal 50–65 bpm
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

// ─── Multi-variant query (tries all known API signatures) ─────────────────────
async function rawSleepQuery(
  start: Date,
  end: Date,
  logs: string[]
): Promise<any[]> {
  const hk = _hk?.default ?? _hk;
  if (!hk) {
    logs.push("_hk=null");
    return [];
  }

  const fns = Object.keys(_hk ?? {})
    .filter(
      (k) =>
        typeof (_hk as any)[k] === "function" &&
        k.toLowerCase().includes("query")
    )
    .slice(0, 8);
  logs.push(`fns:${fns.join(",")}`);

  const tries: [string, () => Promise<any>][] = [
    [
      "qCS(str,{from,to})",
      () => hk.queryCategorySamples?.(SLEEP_ANALYSIS, { from: start, to: end }),
    ],
    [
      "qCS(str,{start,end})",
      () =>
        hk.queryCategorySamples?.(SLEEP_ANALYSIS, {
          startDate: start,
          endDate: end,
        }),
    ],
    [
      "qCS(str,{from,to,lim})",
      () =>
        hk.queryCategorySamples?.(SLEEP_ANALYSIS, {
          from: start,
          to: end,
          limit: 1000,
        }),
    ],
    [
      "_hk.qCS(str,{from,to})",
      () =>
        _hk.queryCategorySamples?.(SLEEP_ANALYSIS, { from: start, to: end }),
    ],
    [
      "_hk.def.qCS(str,{from,to})",
      () =>
        _hk?.default?.queryCategorySamples?.(SLEEP_ANALYSIS, {
          from: start,
          to: end,
        }),
    ],
  ];

  for (const [label, fn] of tries) {
    try {
      const res = await fn();
      const n = Array.isArray(res) ? res.length : res != null ? "?" : 0;
      logs.push(`${label}→${n}`);
      if (Array.isArray(res) && res.length > 0) {
        logs.push(`keys:${Object.keys(res[0]).join(",")}`);
        logs.push(`val:${JSON.stringify(res[0].value)}`);
        return res;
      }
    } catch (e: any) {
      logs.push(`${label} ERR:${String(e?.message ?? e).slice(0, 50)}`);
    }
  }
  return [];
}

// ─── Robust quantity sample query ─────────────────────────────────────────────
// Tries multiple unit strings + API signatures. Logs failures to debug array.
async function safeQS(
  id: string,
  start: Date,
  end: Date,
  units: string[],
  logs: string[]
): Promise<{ value: number; startDate: Date; endDate: Date }[]> {
  const hk = _hk?.default ?? _hk;
  if (!hk) return [];

  const fn = hk.queryQuantitySamples ?? _hk?.queryQuantitySamples;
  if (!fn) {
    logs.push(`${id.slice(-14)}: no queryQuantitySamples`);
    return [];
  }

  // Extract meaningful value from various library response shapes
  const toVal = (s: any): number => {
    if (typeof s.quantity === "number") return s.quantity;
    if (typeof s.quantity?.quantity === "number") return s.quantity.quantity;
    if (typeof s.value === "number") return s.value;
    return 0;
  };

  for (const unit of units) {
    for (const params of [
      { from: start, to: end, unit },
      { startDate: start, endDate: end, unit },
      { from: start, to: end, unit, ascending: false, limit: 2000 },
    ]) {
      try {
        const r = await fn.call(hk, id, params);
        if (Array.isArray(r) && r.length > 0) {
          logs.push(`${id.slice(-14)} unit=${unit} → ${r.length}`);
          return r
            .map((s: any) => ({
              value: toVal(s),
              startDate: new Date(s.startDate),
              endDate: new Date(s.endDate ?? s.startDate),
            }))
            .filter((s) => s.value > 0);
        }
      } catch (e: any) {
        logs.push(
          `${id.slice(-14)} unit=${unit} ERR: ${String(e?.message ?? e).slice(
            0,
            60
          )}`
        );
      }
    }
  }
  logs.push(`${id.slice(-14)}: no data (tried ${units.join(",")})`);
  return [];
}

// ─── Build time-series relative to bedtime (t = minutes from bedtime) ────────
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

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useSleepAnalysis(days = 14): SleepStats {
  const { isAuthorized } = useHealthAuth();
  const [nights, setNights] = useState<SleepNight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthorized || Platform.OS !== "ios" || !_hk) return;
    setIsLoading(true);
    const start = new Date(Date.now() - days * 86_400_000);
    const end = new Date();
    const logs: string[] = [`auth:true days:${days}`];

    (async () => {
      try {
        const raw = await rawSleepQuery(start, end, logs);
        if (!raw.length) {
          setDebugLines([...logs]);
          setNights([]);
          return;
        }

        const mapped: SleepSample[] = raw.map((s: any) => {
          const st = new Date(s.startDate),
            en = new Date(s.endDate);
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
        logs.push(
          `dedup:${deduped.length} removed:${mapped.length - deduped.length}`
        );

        const sessions = groupNights(deduped);
        logs.push(`nights:${sessions.length}`);
        if (!sessions.length) {
          setDebugLines([...logs]);
          setNights([]);
          return;
        }

        // Fetch all physio data for the whole period once, then slice per night
        const [hrAll, hrvAll, rrAll, spo2All, tempAll, restHrAll] =
          await Promise.all([
            safeQS(
              HEART_RATE_ID,
              start,
              end,
              ["count/min", "bpm", "beats/min"],
              logs
            ),
            safeQS(HRV_SDNN, start, end, ["ms", "milliseconds"], logs),
            safeQS(
              RESPIRATORY_RATE,
              start,
              end,
              ["count/min", "breaths/min"],
              logs
            ),
            safeQS(OXYGEN_SATURATION, start, end, ["%", "percent"], logs),
            safeQS(WRIST_TEMPERATURE, start, end, ["degC", "°C"], logs),
            safeQS(
              RESTING_HEART_RATE,
              start,
              end,
              ["count/min", "bpm", "beats/min"],
              logs
            ),
          ]);

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

          const sortedS = [...S].sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime()
          );
          let wakeCount = 0,
            wasAsleep = false;
          for (const s of sortedS) {
            if (isSleep(s.value)) {
              wasAsleep = true;
            } else if (s.value === SV.AWAKE && wasAsleep) {
              wakeCount++;
              wasAsleep = false;
            }
          }

          // ±30 min padding so HR samples just outside sleep window are included
          const PAD_MS = 30 * 60_000;
          const rangeStart = new Date(sess.start.getTime() - PAD_MS);
          const rangeEnd = new Date(sess.end.getTime() + PAD_MS);
          const inRangeFilter = (s: { startDate: Date }) =>
            s.startDate >= rangeStart && s.startDate <= rangeEnd;

          const hrV = hrAll.filter(inRangeFilter).map((s) => s.value);
          const hrvV = hrvAll.filter(inRangeFilter).map((s) => s.value);
          const rrV = rrAll.filter(inRangeFilter).map((s) => s.value);
          const spo2R = spo2All.filter(inRangeFilter).map((s) => s.value);
          const spo2V = spo2R.map((v) => (v <= 1 ? v * 100 : v));
          const tempV = tempAll.filter(inRangeFilter).map((s) => s.value);
          const ds = new Date(sess.start);
          ds.setHours(0, 0, 0, 0);
          const de = new Date(sess.end);
          de.setHours(23, 59, 59);
          const restV = restHrAll
            .filter((s) => s.startDate >= ds && s.startDate <= de)
            .map((s) => s.value);

          // Build time-series for charts - filter to this night first, then build
          const hrSeries = toSeries(hrAll.filter(inRangeFilter), sess.start);
          const hrvSeries = toSeries(hrvAll.filter(inRangeFilter), sess.start);
          const rrSeries = toSeries(rrAll.filter(inRangeFilter), sess.start);
          const spo2Series = toSeries(
            spo2All
              .filter(inRangeFilter)
              .map((s) => ({
                ...s,
                value: s.value <= 1 ? s.value * 100 : s.value,
              })),
            sess.start
          );
          // Debug: log series sizes for this night
          const nd = toDateLabel(sess.end);
          logs.push(
            `${nd}: HR=${hrSeries.length} HRV=${hrvSeries.length} RR=${rrSeries.length} SpO2=${spo2Series.length}`
          );

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
            wristTempDelta: Math.round(avg(tempV) * 10) / 10,
            restingHeartRate: Math.round(avg(restV)),
            samples: S,
          };
          return {
            ...base,
            sleepScore: score(base),
            hrSeries,
            hrvSeries,
            rrSeries,
            spo2Series,
          };
        });

        result.sort((a, b) => b.date.getTime() - a.date.getTime());
        logs.push(`✓ ${result.length} nights`);
        setNights(result);
        setDebugLines([...logs]);
      } catch (e: any) {
        const msg = String(e?.message ?? e).slice(0, 100);
        logs.push(`ERR:${msg}`);
        setDebugLines([...logs]);
        setNights([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthorized, days]);

  const l7 = nights.slice(0, 7);
  const avgH = l7.length
    ? Math.round((avg(l7.map((n) => n.totalMinutes)) / 60) * 10) / 10
    : 0;

  // ── Circular-time median for bedtime ────────────────────────────────────────
  // Bedtimes cross midnight (e.g. 23:30 = 1410, 00:15 = 15).
  // Naive average gives nonsense (~720 = noon). Fix: shift times < 12:00
  // by +1440 so they land on the "same night" number line, then take median.
  function circShift(m: number): number {
    return m < 720 ? m + 1440 : m;
  }
  function medianOf(arr: number[]): number {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  const rawBed = l7.map((n) =>
    circShift(n.bedtime.getHours() * 60 + n.bedtime.getMinutes())
  );
  const rawWake = l7.map(
    (n) => n.wakeTime.getHours() * 60 + n.wakeTime.getMinutes()
  );
  const medBed = medianOf(rawBed);
  const medWake = medianOf(rawWake);

  // Deviation = median absolute deviation around the median bedtime (robust)
  const bedMAD =
    l7.length > 1
      ? Math.round(medianOf(rawBed.map((m) => Math.abs(m - medBed))))
      : 0;

  const sc = l7.length ? Math.round(avg(l7.map((n) => n.sleepScore))) : 0;

  return {
    nights,
    isLoading,
    debugLines,
    avgDurationH: avgH,
    avgBedtime: minsToStr(medBed),
    avgWakeTime: minsToStr(medWake),
    bedtimeDeviationMin: bedMAD,
    avgSleepScore: sc,
  };
}

export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
