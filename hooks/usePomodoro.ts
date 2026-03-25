// hooks/usePomodoro.ts
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

export type PomodoroConfig = {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakAfter: number;
};

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfter: 4,
};

export type PomodoroState = {
  isActive: boolean;
  timeRemaining: number;
  isBreak: boolean;
  completedPomodoros: number;
};

export function usePomodoro(
  config: PomodoroConfig = DEFAULT_POMODORO_CONFIG,
  onPhaseComplete?: () => void
) {
  const [state, setState] = useState<PomodoroState>({
    isActive: false,
    timeRemaining: config.workMinutes * 60,
    isBreak: false,
    completedPomodoros: 0,
  });

  const stateRef = useRef(state);
  const configRef = useRef(config);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPhaseCompleteRef = useRef(onPhaseComplete);

  useEffect(() => {
    onPhaseCompleteRef.current = onPhaseComplete;
  }, [onPhaseComplete]);

  // Auto-reset wenn workMinutes sich ändert und Timer pausiert
  useEffect(() => {
    const prevWork = configRef.current.workMinutes;
    configRef.current = config;
    if (
      config.workMinutes !== prevWork &&
      !stateRef.current.isActive &&
      !stateRef.current.isBreak
    ) {
      const next: PomodoroState = {
        isActive: false,
        timeRemaining: config.workMinutes * 60,
        isBreak: false,
        completedPomodoros: stateRef.current.completedPomodoros,
      };
      stateRef.current = next;
      setState(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.workMinutes,
    config.breakMinutes,
    config.longBreakMinutes,
    config.longBreakAfter,
  ]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const tick = useCallback(() => {
    const cur = stateRef.current;
    if (cur.timeRemaining <= 1) {
      stopInterval();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPhaseCompleteRef.current?.();
      if (cur.isBreak) {
        const next: PomodoroState = {
          isActive: false,
          timeRemaining: configRef.current.workMinutes * 60,
          isBreak: false,
          completedPomodoros: cur.completedPomodoros,
        };
        stateRef.current = next;
        setState(next);
      } else {
        const n = cur.completedPomodoros + 1;
        const long = n % configRef.current.longBreakAfter === 0;
        const next: PomodoroState = {
          isActive: false,
          timeRemaining:
            (long
              ? configRef.current.longBreakMinutes
              : configRef.current.breakMinutes) * 60,
          isBreak: true,
          completedPomodoros: n,
        };
        stateRef.current = next;
        setState(next);
      }
    } else {
      const next = { ...cur, timeRemaining: cur.timeRemaining - 1 };
      stateRef.current = next;
      setState(next);
    }
  }, []);

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }
  function start() {
    if (intervalRef.current) return;
    stateRef.current = { ...stateRef.current, isActive: true };
    setState((p) => ({ ...p, isActive: true }));
    intervalRef.current = setInterval(tick, 1000);
  }
  function pause() {
    stopInterval();
    stateRef.current = { ...stateRef.current, isActive: false };
    setState((p) => ({ ...p, isActive: false }));
  }
  function reset(explicitConfig?: PomodoroConfig) {
    stopInterval();
    const cfg = explicitConfig ?? configRef.current;
    const next: PomodoroState = {
      isActive: false,
      timeRemaining: cfg.workMinutes * 60,
      isBreak: false,
      completedPomodoros: 0,
    };
    stateRef.current = next;
    setState(next);
  }
  function skip() {
    pause();
    const cur = stateRef.current;
    if (cur.isBreak) {
      const next: PomodoroState = {
        isActive: false,
        timeRemaining: configRef.current.workMinutes * 60,
        isBreak: false,
        completedPomodoros: cur.completedPomodoros,
      };
      stateRef.current = next;
      setState(next);
    } else {
      const n = cur.completedPomodoros + 1;
      const long = n % configRef.current.longBreakAfter === 0;
      const next: PomodoroState = {
        isActive: false,
        timeRemaining:
          (long
            ? configRef.current.longBreakMinutes
            : configRef.current.breakMinutes) * 60,
        isBreak: true,
        completedPomodoros: n,
      };
      stateRef.current = next;
      setState(next);
    }
  }

  useEffect(() => () => stopInterval(), []);
  return { state, start, pause, reset, skip };
}
