// components/focus/FocusScreen.tsx
import { usePomodoro } from "@/hooks/usePomodoro";
import { getCurrentEntry, getSlothMood } from "@/services/focusService";
import { useFocusStore } from "@/store/focusStore";
import { PlannerEntry } from "@/types/planner";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as Crypto from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type FocusScreenProps = {
  visible: boolean;
  entries: PlannerEntry[];
  onExit: () => void;
};

export function FocusScreen({ visible, entries, onExit }: FocusScreenProps) {
  const [currentEntry, setCurrentEntry] = useState<PlannerEntry | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [focusStartTime] = useState(Date.now());

  const addSession = useFocusStore((s) => s.addSession);
  const soundEnabled = useFocusStore((s) => s.soundEnabled);
  const toggleSound = useFocusStore((s) => s.toggleSound);
  const stats = useFocusStore((s) => s.stats);

  const { state: pomodoroState, start, pause } = usePomodoro();

  const pressStartTime = useRef<number | null>(null);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track which phase we're in via ref so the interval closure is never stale
  const phaseRef = useRef(0);
  const shakeLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);

  const slothMood = getSlothMood(currentEntry?.category);

  // ── Animated values ──
  const progressAnim = useRef(new Animated.Value(0)).current;
  const videoScale = useRef(new Animated.Value(1)).current;
  const extraDim = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;

  // Find current entry
  useEffect(() => {
    setCurrentEntry(getCurrentEntry(entries));
    const t = setInterval(
      () => setCurrentEntry(getCurrentEntry(entries)),
      60000
    );
    return () => clearInterval(t);
  }, [entries]);

  // ── Phase transitions ──
  function enterPhase1() {
    // Video zoom + light dim
    Animated.parallel([
      Animated.timing(videoScale, {
        toValue: 1.05,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(extraDim, {
        toValue: 0.2,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function enterPhase2() {
    // Gentle shake ±4px
    if (shakeLoopRef.current) shakeLoopRef.current.stop();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeX, {
          toValue: 4,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: -4,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 3,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: -3,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 0,
          duration: 70,
          useNativeDriver: true,
        }),
      ])
    );
    shakeLoopRef.current = loop;
    loop.start();
  }

  function enterPhase3() {
    // Stop gentle, start strong shake
    if (shakeLoopRef.current) shakeLoopRef.current.stop();
    shakeX.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeX, {
          toValue: 12,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: -12,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 9,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: -9,
          duration: 45,
          useNativeDriver: true,
        }),
        Animated.timing(shakeX, {
          toValue: 0,
          duration: 45,
          useNativeDriver: true,
        }),
      ])
    );
    shakeLoopRef.current = loop;
    loop.start();

    // Motion blur overlay + UI fade out
    Animated.parallel([
      Animated.timing(blurOpacity, {
        toValue: 0.4,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(uiOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(extraDim, {
        toValue: 0.5,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function resetAll() {
    if (shakeLoopRef.current) {
      shakeLoopRef.current.stop();
      shakeLoopRef.current = null;
    }
    phaseRef.current = 0;
    Animated.parallel([
      Animated.timing(videoScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(extraDim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(shakeX, { toValue: 0, useNativeDriver: true }),
      Animated.timing(blurOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(uiOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }

  function handlePressIn() {
    pressStartTime.current = Date.now();
    phaseRef.current = 0;

    tickInterval.current = setInterval(() => {
      if (!pressStartTime.current) return;
      const elapsed = Date.now() - pressStartTime.current;
      const pct = Math.min((elapsed / 3000) * 100, 100);

      Animated.timing(progressAnim, {
        toValue: pct,
        duration: 16,
        useNativeDriver: false,
      }).start();

      // Phase transitions – checked against ref, never stale
      if (elapsed >= 0 && phaseRef.current === 0) {
        phaseRef.current = 1;
        enterPhase1();
      }
      if (elapsed >= 1000 && phaseRef.current === 1) {
        phaseRef.current = 2;
        enterPhase2();
      }
      if (elapsed >= 2000 && phaseRef.current === 2) {
        phaseRef.current = 3;
        enterPhase3();
      }
      if (elapsed >= 3000) {
        handleExitComplete();
      }
    }, 32);
  }

  function handlePressOut() {
    pressStartTime.current = null;
    if (tickInterval.current) {
      clearInterval(tickInterval.current);
      tickInterval.current = null;
    }
    resetAll();
  }

  function handleExitComplete() {
    if (tickInterval.current) {
      clearInterval(tickInterval.current);
      tickInterval.current = null;
    }
    if (shakeLoopRef.current) {
      shakeLoopRef.current.stop();
      shakeLoopRef.current = null;
    }
    shakeX.setValue(0);
    setIsExiting(true);

    const durationSeconds = Math.floor((Date.now() - focusStartTime) / 1000);
    addSession({
      id: Crypto.randomUUID(),
      startedAt: focusStartTime,
      endedAt: Date.now(),
      entryId: currentEntry?.id,
      entryTitle: currentEntry?.title,
      category: currentEntry?.category,
      durationSeconds,
      completed: true,
      pomodoroCount: pomodoroState.completedPomodoros,
    });

    setTimeout(() => {
      onExit();
      setIsExiting(false);
      progressAnim.setValue(0);
      phaseRef.current = 0;
    }, 1000);
  }

  if (!visible) return null;

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <Pressable
        style={styles.container}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* ── Video: zooms + shakes ── */}
        <Animated.View
          style={[
            styles.videoContainer,
            { transform: [{ scale: videoScale }, { translateX: shakeX }] },
          ]}
        >
          <Video
            ref={videoRef}
            source={require("@/assets/videos/sloth-working-hq.mp4")}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted={!soundEnabled}
          />
        </Animated.View>

        {/* ── Base overlay ── */}
        <View style={styles.overlay} />

        {/* ── Phase dim (gets darker each phase) ── */}
        <Animated.View
          style={[
            styles.fillLayer,
            { backgroundColor: "black", opacity: extraDim },
          ]}
        />

        {/* ── Motion blur (phase 3): repeated white smear ── */}
        <Animated.View style={[styles.fillLayer, { opacity: blurOpacity }]}>
          <View style={styles.blurSmear} />
          <View style={[styles.blurSmear, { marginTop: 80, opacity: 0.5 }]} />
          <View style={[styles.blurSmear, { marginTop: 160, opacity: 0.3 }]} />
        </Animated.View>

        {/* ── UI (fades out in phase 3) ── */}
        <Animated.View style={[styles.mainContent, { opacity: uiOpacity }]}>
          {/* TOP */}
          <View style={styles.topSection}>
            {stats.currentStreak > 0 && !isExiting && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>
                  🔥 {stats.currentStreak} Tage
                  <MaterialCommunityIcons
                    name="fire"
                    size={20}
                    color="#F74920"
                  />
                  {stats.currentStreak}Tage
                </Text>
              </View>
            )}
            {!isExiting && (
              <Pressable onPress={toggleSound} style={styles.soundToggle}>
                <Ionicons
                  name={soundEnabled ? "volume-high" : "volume-mute"}
                  size={24}
                  color="rgba(255,255,255,0.9)"
                />
              </Pressable>
            )}
          </View>

          {/* MIDDLE */}
          <View style={styles.middleSection}>
            {!isExiting && (
              <>
                <View style={styles.moodContainer}>
                  <Text style={styles.activityText}>{slothMood.activity}</Text>
                  <Text style={styles.motivationText}>
                    {slothMood.motivationalText}
                  </Text>
                </View>
                <View style={styles.pomodoroContainer}>
                  <Text style={styles.pomodoroLabel}>
                    {pomodoroState.isBreak ? "Pause" : "Fokuszeit"}
                  </Text>
                  <Text style={styles.pomodoroTime}>
                    {formatTime(pomodoroState.timeRemaining)}
                  </Text>
                  <Pressable
                    onPress={pomodoroState.isActive ? pause : start}
                    style={styles.pomodoroButton}
                  >
                    <Ionicons
                      name={pomodoroState.isActive ? "pause" : "play"}
                      size={28}
                      color="white"
                    />
                  </Pressable>
                  <Text style={styles.pomodoroCount}>
                    🍅 {pomodoroState.completedPomodoros} Pomodoros
                  </Text>
                </View>
              </>
            )}
            {isExiting && (
              <View style={styles.exitStateContainer}>
                <Text style={styles.exitEmoji}>👀</Text>
                <Text style={styles.exitMessage}>
                  Das Faultier schaut sich um...
                </Text>
                <Text style={styles.exitCongrats}>Gut gemacht! 🎉</Text>
              </View>
            )}
          </View>

          {/* BOTTOM */}
          <View style={styles.bottomSection}>
            {currentEntry && !isExiting && (
              <View style={styles.entryCard}>
                <Text style={styles.entryLabel}>Fokussiert auf:</Text>
                <Text style={styles.entryTitle}>{currentEntry.title}</Text>
                {currentEntry.startTime && currentEntry.endTime && (
                  <Text style={styles.entryTime}>
                    {currentEntry.startTime} - {currentEntry.endTime}
                  </Text>
                )}
              </View>
            )}

            {!isExiting && (
              <View style={styles.progressWrapper}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {!isExiting && (
              <Text style={styles.hint}>
                Halte 3 Sekunden gedrückt zum Beenden
              </Text>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fcf7f4",
    justifyContent: "center",
    alignItems: "center",
  },
  video: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  fillLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  blurSmear: {
    width: "120%",
    height: 40,
    marginLeft: "-10%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    transform: [{ scaleX: 1.2 }],
  },
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  streakBadge: {
    backgroundColor: "rgba(239,68,68,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(239,68,68,0.6)",
  },
  streakText: { color: "#fca5a5", fontSize: 14, fontWeight: "700" },
  soundToggle: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
  },
  middleSection: { flex: 1, justifyContent: "center", alignItems: "center" },
  moodContainer: { alignItems: "center", marginBottom: 40 },
  activityText: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    marginBottom: 8,
    textAlign: "center",
  },
  motivationText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  pomodoroContainer: { alignItems: "center" },
  pomodoroLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pomodoroTime: {
    fontSize: 64,
    fontWeight: "bold",
    color: "white",
    fontVariant: ["tabular-nums"],
    marginBottom: 24,
  },
  pomodoroButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pomodoroCount: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  exitStateContainer: { alignItems: "center" },
  exitEmoji: { fontSize: 80, marginBottom: 20 },
  exitMessage: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    marginBottom: 8,
  },
  exitCongrats: { fontSize: 18, color: "rgba(255,255,255,0.8)" },
  bottomSection: { alignItems: "center" },
  entryCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
    minWidth: 280,
    maxWidth: "90%",
  },
  entryLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  entryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 6,
  },
  entryTime: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  progressWrapper: { width: "100%", marginBottom: 12 },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#3b8995", borderRadius: 3 },
  hint: { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" },
});
