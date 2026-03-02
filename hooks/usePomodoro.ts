// hooks/usePomodoro.ts

import { POMODORO_CONFIG } from "@/services/focusService";
import { PomodoroState } from "@/types/focus";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>({
    isActive: false,
    timeRemaining: POMODORO_CONFIG.workDuration,
    isBreak: false,
    completedPomodoros: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second
  useEffect(() => {
    if (state.isActive) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.timeRemaining <= 1) {
            // Timer finished!
            handleTimerComplete(prev);
            return prev;
          }

          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1,
          };
        });
      }, 1000) as any;
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isActive]);

  function handleTimerComplete(currentState: PomodoroState) {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (currentState.isBreak) {
      // Break finished → Start work
      setState({
        isActive: false,
        timeRemaining: POMODORO_CONFIG.workDuration,
        isBreak: false,
        completedPomodoros: currentState.completedPomodoros,
      });
    } else {
      // Work finished → Start break
      const newCount = currentState.completedPomodoros + 1;
      const isLongBreak = newCount % POMODORO_CONFIG.longBreakAfter === 0;

      setState({
        isActive: false,
        timeRemaining: isLongBreak
          ? POMODORO_CONFIG.longBreakDuration
          : POMODORO_CONFIG.breakDuration,
        isBreak: true,
        completedPomodoros: newCount,
      });
    }
  }

  function start() {
    setState((prev) => ({ ...prev, isActive: true }));
  }

  function pause() {
    setState((prev) => ({ ...prev, isActive: false }));
  }

  function reset() {
    setState({
      isActive: false,
      timeRemaining: POMODORO_CONFIG.workDuration,
      isBreak: false,
      completedPomodoros: 0,
    });
  }

  function skip() {
    handleTimerComplete(state);
  }

  return {
    state,
    start,
    pause,
    reset,
    skip,
  };
}
