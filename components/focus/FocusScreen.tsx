// components/focus/FocusScreen.tsx
import { usePomodoro } from "@/hooks/usePomodoro";
import { getSlothMood } from "@/services/focusService";
import {
  AMBIENT_SOUNDS,
  AmbientSound,
  SOUND_FILES,
  useFocusStore,
} from "@/store/focusStore";
import { PlannerEntry } from "@/types/planner";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Crypto from "expo-crypto";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FocusScreenProps = {
  visible: boolean;
  entries: PlannerEntry[];
  onExit: (durationSeconds: number) => void;
};

type Sheet = "none" | "settings";
type EditTarget = {
  key: "workMinutes" | "breakMinutes" | "longBreakMinutes" | "longBreakAfter";
  label: string;
  min: number;
  max: number;
  value: number;
} | null;

const PLAYABLE_SOUNDS = AMBIENT_SOUNDS.filter((s) => s.id !== "none");

export function FocusScreen({ visible, entries, onExit }: FocusScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentEntry, setCurrentEntry] = useState<PlannerEntry | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  // Startzeit — null bis der User auf Play drückt
  const actualStartTimeRef = useRef<number | null>(null);
  const [activeSheet, setActiveSheet] = useState<Sheet>("none");
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editValue, setEditValue] = useState("");

  const addSession = useFocusStore((s) => s.addSession);
  const soundEnabled = useFocusStore((s) => s.soundEnabled);
  const selectedSound = useFocusStore((s) => s.selectedSound);
  const pomodoroConfig = useFocusStore((s) => s.pomodoroConfig);
  const stats = useFocusStore((s) => s.stats);
  const setSound = useFocusStore((s) => s.setSound);
  const setPomodoroConfig = useFocusStore((s) => s.setPomodoroConfig);

  // ── Audio (expo-av) ────────────────────────────────────────────────────────
  const bellSoundRef = useRef<Audio.Sound | null>(null);
  const ambientSoundRef = useRef<Audio.Sound | null>(null);

  // Bell-Sound laden
  useEffect(() => {
    Audio.Sound.createAsync(require("@/assets/sounds/bell.mp3"), {
      shouldPlay: false,
    })
      .then(({ sound }) => {
        bellSoundRef.current = sound;
      })
      .catch(() => {});

    return () => {
      bellSoundRef.current?.unloadAsync();
      ambientSoundRef.current?.unloadAsync();
    };
  }, []);

  // Audio-Modus setzen
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
  }, []);

  async function playBell() {
    try {
      if (bellSoundRef.current) {
        await bellSoundRef.current.setPositionAsync(0);
        await bellSoundRef.current.playAsync();
      }
    } catch {}
  }

  // Ambient Sound
  useEffect(() => {
    async function updateAmbient() {
      try {
        // Vorherigen Sound stoppen
        if (ambientSoundRef.current) {
          await ambientSoundRef.current.stopAsync();
          await ambientSoundRef.current.unloadAsync();
          ambientSoundRef.current = null;
        }

        if (!visible || !soundEnabled || selectedSound === "none") return;

        const file = SOUND_FILES[selectedSound];
        if (!file) return;

        const { sound } = await Audio.Sound.createAsync(file, {
          shouldPlay: true,
          isLooping: true,
          volume: 0.6,
        });
        ambientSoundRef.current = sound;
      } catch (e) {
        console.warn("Ambient sound error:", e);
      }
    }
    updateAmbient();
  }, [soundEnabled, selectedSound, visible]);

  const {
    state: pomodoroState,
    start: startTimer,
    pause,
    reset: resetTimer,
  } = usePomodoro(pomodoroConfig, playBell);

  // Startzeit erst setzen wenn Play gedrückt wird
  function start() {
    if (!actualStartTimeRef.current) {
      actualStartTimeRef.current = Date.now();
    }
    startTimer();
  }

  function reset() {
    actualStartTimeRef.current = null;
    resetTimer();
  }

  // ── Refs ──────────────────────────────────────────────────────────────────
  const pressStartTime = useRef<number | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(0);
  const shakeLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const activeSheetRef = useRef<Sheet>("none");
  const isExitingRef = useRef(false);
  const currentEntryRef = useRef<PlannerEntry | null>(null);
  const pomodoroStateRef = useRef(pomodoroState);
  const addSessionRef = useRef(addSession);
  const onExitRef = useRef(onExit);
  const resetRef = useRef(reset);

  useEffect(() => {
    activeSheetRef.current = activeSheet;
  }, [activeSheet]);
  useEffect(() => {
    isExitingRef.current = isExiting;
  }, [isExiting]);
  useEffect(() => {
    currentEntryRef.current = currentEntry;
  }, [currentEntry]);
  useEffect(() => {
    pomodoroStateRef.current = pomodoroState;
  }, [pomodoroState]);
  useEffect(() => {
    addSessionRef.current = addSession;
  }, [addSession]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);
  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  // ── Animated values ───────────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const videoScale = useRef(new Animated.Value(1)).current;
  const extraDim = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;

  const enterPhase1 = useCallback(() => {
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
  }, []);

  const enterPhase2 = useCallback(() => {
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
  }, []);

  const enterPhase3 = useCallback(() => {
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
  }, []);

  const doResetAll = useCallback(() => {
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
  }, []);

  const doExitComplete = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (shakeLoopRef.current) {
      shakeLoopRef.current.stop();
      shakeLoopRef.current = null;
    }
    shakeX.setValue(0);
    ambientSoundRef.current?.stopAsync();
    setIsExiting(true);

    const entry = currentEntryRef.current;
    const ps = pomodoroStateRef.current;
    const t0 = actualStartTimeRef.current ?? Date.now();
    const dur = Math.floor((Date.now() - t0) / 1000);

    // Nur Sessions >= 60 Sekunden speichern
    if (dur >= 60) {
      addSessionRef.current({
        id: Crypto.randomUUID(),
        startedAt: t0,
        endedAt: Date.now(),
        entryId: entry?.id,
        entryTitle: entry?.title,
        category: entry?.category,
        durationSeconds: dur,
        completed: true,
        pomodoroCount: ps.completedPomodoros,
      });
    }

    setTimeout(() => {
      onExitRef.current(dur);
      setIsExiting(false);
      progressAnim.setValue(0);
      phaseRef.current = 0;
      resetRef.current();
    }, 1000);
  }, []);

  const enterPhase1Ref = useRef(enterPhase1);
  const enterPhase2Ref = useRef(enterPhase2);
  const enterPhase3Ref = useRef(enterPhase3);
  const doResetAllRef = useRef(doResetAll);
  const doExitCompleteRef = useRef(doExitComplete);
  useEffect(() => {
    enterPhase1Ref.current = enterPhase1;
  }, [enterPhase1]);
  useEffect(() => {
    enterPhase2Ref.current = enterPhase2;
  }, [enterPhase2]);
  useEffect(() => {
    enterPhase3Ref.current = enterPhase3;
  }, [enterPhase3]);
  useEffect(() => {
    doResetAllRef.current = doResetAll;
  }, [doResetAll]);
  useEffect(() => {
    doExitCompleteRef.current = doExitComplete;
  }, [doExitComplete]);

  const handleTouchStart = useCallback(() => {
    if (activeSheetRef.current !== "none") return;
    if (isExitingRef.current) return;
    pressStartTime.current = Date.now();
    phaseRef.current = 0;
    tickIntervalRef.current = setInterval(() => {
      if (!pressStartTime.current) return;
      const elapsed = Date.now() - pressStartTime.current;
      const pct = Math.min((elapsed / 3000) * 100, 100);
      progressAnim.setValue(pct);
      if (elapsed >= 0 && phaseRef.current === 0) {
        phaseRef.current = 1;
        enterPhase1Ref.current();
      }
      if (elapsed >= 1000 && phaseRef.current === 1) {
        phaseRef.current = 2;
        enterPhase2Ref.current();
      }
      if (elapsed >= 2000 && phaseRef.current === 2) {
        phaseRef.current = 3;
        enterPhase3Ref.current();
      }
      if (elapsed >= 3000) {
        doExitCompleteRef.current();
      }
    }, 32);
  }, []);

  const handleTouchEnd = useCallback(() => {
    pressStartTime.current = null;
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    doResetAllRef.current();
  }, []);

  // ── Sound-Navigation ──────────────────────────────────────────────────────
  function getSoundIndex() {
    return PLAYABLE_SOUNDS.findIndex((s) => s.id === selectedSound);
  }
  function handleSoundPrev() {
    const i = getSoundIndex();
    if (i <= 0) setSound("none");
    else setSound(PLAYABLE_SOUNDS[i - 1].id as AmbientSound);
  }
  function handleSoundNext() {
    const i = getSoundIndex();
    if (i === -1) setSound(PLAYABLE_SOUNDS[0].id as AmbientSound);
    else if (i < PLAYABLE_SOUNDS.length - 1)
      setSound(PLAYABLE_SOUNDS[i + 1].id as AmbientSound);
  }
  function handleSoundToggle() {
    if (selectedSound === "none")
      setSound(PLAYABLE_SOUNDS[0].id as AmbientSound);
    else if (soundEnabled) {
      ambientSoundRef.current?.stopAsync();
      useFocusStore.getState().toggleSound();
    } else useFocusStore.getState().toggleSound();
  }

  // ── Video ─────────────────────────────────────────────────────────────────
  const player = useVideoPlayer(
    require("@/assets/videos/sloth-working-hq.mp4"),
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );
  const slothMood = getSlothMood(currentEntry?.category);

  function openEdit(target: NonNullable<EditTarget>) {
    setEditTarget(target);
    setEditValue(String(target.value));
  }
  function commitEdit() {
    if (!editTarget) return;
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(
        editTarget.min,
        Math.min(editTarget.max, parsed)
      );
      const cfg = useFocusStore.getState().pomodoroConfig;
      setPomodoroConfig({ ...cfg, [editTarget.key]: clamped });
    }
    setEditTarget(null);
    Keyboard.dismiss();
  }

  if (!visible) return null;

  const fmt = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const soundIdx = getSoundIndex();
  const currentSoundInfo = soundIdx >= 0 ? PLAYABLE_SOUNDS[soundIdx] : null;
  const isPlaying = soundEnabled && selectedSound !== "none";
  const canPrev = soundIdx > 0 || isPlaying;
  const canNext = soundIdx < PLAYABLE_SOUNDS.length - 1;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View
        style={s.root}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <Animated.View
          style={[
            s.videoBg,
            { transform: [{ scale: videoScale }, { translateX: shakeX }] },
          ]}
        >
          <VideoView
            player={player}
            style={s.video}
            contentFit="contain"
            nativeControls={false}
          />
        </Animated.View>
        <View style={s.overlay} />
        <Animated.View
          style={[s.fillLayer, { backgroundColor: "black", opacity: extraDim }]}
        />
        <Animated.View style={[s.fillLayer, { opacity: blurOpacity }]}>
          <View style={s.blurSmear} />
          <View style={[s.blurSmear, { marginTop: 80, opacity: 0.5 }]} />
          <View style={[s.blurSmear, { marginTop: 160, opacity: 0.3 }]} />
        </Animated.View>

        <Animated.View
          style={[
            s.main,
            {
              opacity: uiOpacity,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={s.topRow}>
            {stats.currentStreak > 0 && !isExiting ? (
              <View style={s.streakBadge}>
                <MaterialCommunityIcons name="fire" size={14} color="#F74920" />
                <Text style={s.streakText}>{stats.currentStreak} Tage</Text>
              </View>
            ) : (
              <View />
            )}
            <Pressable
              onPress={() =>
                setActiveSheet(activeSheet === "settings" ? "none" : "settings")
              }
              style={[s.iconBtn, activeSheet === "settings" && s.iconBtnActive]}
            >
              <Ionicons
                name="settings-outline"
                size={19}
                color="rgba(255,255,255,0.85)"
              />
            </Pressable>
          </View>

          <View style={s.middle}>
            {!isExiting && (
              <>
                <View style={s.moodBox}>
                  <Text style={s.activityText}>{slothMood.activity}</Text>
                  <Text style={s.motivText}>{slothMood.motivationalText}</Text>
                </View>
                <View style={s.timerBox}>
                  <View style={s.phaseRow}>
                    <Ionicons
                      name={
                        pomodoroState.isBreak ? "cafe-outline" : "timer-outline"
                      }
                      size={13}
                      color="rgba(255,255,255,0.55)"
                    />
                    <Text style={s.phaseLabel}>
                      {pomodoroState.isBreak ? "Pause" : "Fokuszeit"}
                    </Text>
                  </View>
                  <Text style={s.timerDigits}>
                    {fmt(pomodoroState.timeRemaining)}
                  </Text>
                  <Pressable
                    onPress={pomodoroState.isActive ? pause : start}
                    style={s.playBtn}
                  >
                    <Ionicons
                      name={pomodoroState.isActive ? "pause" : "play"}
                      size={28}
                      color="white"
                    />
                  </Pressable>
                  <View style={s.countRow}>
                    <MaterialCommunityIcons
                      name="circle-slice-8"
                      size={11}
                      color="rgba(255,255,255,0.38)"
                    />
                    <Text style={s.countText}>
                      {pomodoroState.completedPomodoros} abgeschlossen
                    </Text>
                  </View>
                </View>
              </>
            )}
            {isExiting && (
              <View style={s.exitBox}>
                <Ionicons
                  name="eye-outline"
                  size={64}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={s.exitMsg}>Bis bald</Text>
                <Text style={s.exitCongrats}>und gut gemacht!</Text>
              </View>
            )}
          </View>

          <View style={s.bottom}>
            {currentEntry && !isExiting && (
              <View style={s.entryCard}>
                <Text style={s.entryMeta}>Fokussiert auf</Text>
                <Text style={s.entryTitle}>{currentEntry.title}</Text>
                {currentEntry.startTime && currentEntry.endTime && (
                  <Text style={s.entryTime}>
                    {currentEntry.startTime} – {currentEntry.endTime}
                  </Text>
                )}
              </View>
            )}
            {!isExiting && (
              <View style={s.soundBlock}>
                <View style={s.soundBtns}>
                  <Pressable
                    onPress={handleSoundPrev}
                    disabled={!canPrev}
                    hitSlop={14}
                    style={!canPrev ? s.dimmed : undefined}
                  >
                    <Ionicons name="play-skip-back" size={17} color="white" />
                  </Pressable>
                  <Pressable onPress={handleSoundToggle} hitSlop={10}>
                    <Ionicons
                      name={isPlaying ? "pause-circle" : "play-circle"}
                      size={38}
                      color="white"
                    />
                  </Pressable>
                  <Pressable
                    onPress={handleSoundNext}
                    disabled={!canNext}
                    hitSlop={14}
                    style={!canNext ? s.dimmed : undefined}
                  >
                    <Ionicons
                      name="play-skip-forward"
                      size={17}
                      color="white"
                    />
                  </Pressable>
                </View>
                <Text style={s.soundLabel}>
                  {isPlaying && currentSoundInfo
                    ? currentSoundInfo.label
                    : "Kein Sound"}
                </Text>
              </View>
            )}
            {!isExiting && (
              <View style={s.exitZone}>
                <View style={s.progressTrack}>
                  <Animated.View
                    style={[
                      s.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={s.hint}>Gedrückt halten zum Beenden</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {activeSheet === "settings" && (
          <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Pomodoro-Einstellungen</Text>
              <Pressable onPress={() => setActiveSheet("none")} hitSlop={12}>
                <Ionicons
                  name="close"
                  size={20}
                  color="rgba(255,255,255,0.4)"
                />
              </Pressable>
            </View>
            <View style={s.grid}>
              {[
                {
                  key: "workMinutes" as const,
                  icon: "timer-outline",
                  lib: "ion" as const,
                  label: "Fokus",
                  min: 1,
                  max: 90,
                  step: 5,
                  value: pomodoroConfig.workMinutes,
                },
                {
                  key: "breakMinutes" as const,
                  icon: "cafe-outline",
                  lib: "ion" as const,
                  label: "Kurze Pause",
                  min: 1,
                  max: 30,
                  step: 1,
                  value: pomodoroConfig.breakMinutes,
                },
                {
                  key: "longBreakMinutes" as const,
                  icon: "moon-outline",
                  lib: "ion" as const,
                  label: "Lange Pause",
                  min: 1,
                  max: 60,
                  step: 5,
                  value: pomodoroConfig.longBreakMinutes,
                },
                {
                  key: "longBreakAfter" as const,
                  icon: "repeat",
                  lib: "mci" as const,
                  label: "Zykluslänge",
                  min: 2,
                  max: 8,
                  step: 1,
                  value: pomodoroConfig.longBreakAfter,
                },
              ].map((item) => (
                <StepperCard
                  key={item.key}
                  iconLib={item.lib}
                  iconName={item.icon}
                  label={item.label}
                  value={item.value}
                  unit={item.key === "longBreakAfter" ? "Einh." : "Min"}
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  onDoubleTap={() =>
                    openEdit({
                      key: item.key,
                      label: item.label,
                      min: item.min,
                      max: item.max,
                      value: item.value,
                    })
                  }
                  onChange={(v) =>
                    setPomodoroConfig({
                      ...useFocusStore.getState().pomodoroConfig,
                      [item.key]: v,
                    })
                  }
                />
              ))}
            </View>
          </View>
        )}

        {editTarget !== null && (
          <View style={s.editOverlay}>
            <Pressable style={s.editBackdrop} onPress={commitEdit} />
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "position" : "height"}
              keyboardVerticalOffset={0}
            >
              <View
                style={[s.editSheet, { paddingBottom: insets.bottom + 24 }]}
              >
                <View style={s.editHandle} />
                <Text style={s.editTitle}>{editTarget.label}</Text>
                <Text style={s.editHint}>
                  {editTarget.min}–{editTarget.max} Minuten
                </Text>
                <TextInput
                  style={s.editInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="number-pad"
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={commitEdit}
                  maxLength={2}
                />
                <Pressable style={s.editConfirm} onPress={commitEdit}>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={s.editConfirmText}>Übernehmen</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── StepperCard ──────────────────────────────────────────────────────────────
type StepperCardProps = {
  iconLib: "ion" | "mci";
  iconName: string;
  label: string;
  sublabel?: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onDoubleTap: () => void;
  onChange: (v: number) => void;
};
function StepperCard({
  iconLib,
  iconName,
  label,
  sublabel,
  value,
  unit,
  min,
  max,
  step,
  onDoubleTap,
  onChange,
}: StepperCardProps) {
  const lastTap = useRef(0);
  function handleValuePress() {
    const now = Date.now();
    if (now - lastTap.current < 350) onDoubleTap();
    lastTap.current = now;
  }
  const Icon = iconLib === "ion" ? Ionicons : MaterialCommunityIcons;
  return (
    <View style={sc.card}>
      <View style={sc.top}>
        {/* @ts-ignore */}
        <Icon name={iconName} size={15} color="rgba(255,255,255,0.5)" />
        <Text style={sc.label}>{label}</Text>
      </View>
      {sublabel ? <Text style={sc.sublabel}>{sublabel}</Text> : null}
      <Pressable onPress={handleValuePress}>
        <Text style={sc.value}>
          {value}
          <Text style={sc.unit}> {unit}</Text>
        </Text>
      </Pressable>
      <View style={sc.row}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          style={[sc.btn, value <= min && sc.btnOff]}
          hitSlop={10}
          disabled={value <= min}
        >
          <Ionicons
            name="remove"
            size={17}
            color={
              value <= min ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)"
            }
          />
        </Pressable>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          style={[sc.btn, value >= max && sc.btnOff]}
          hitSlop={10}
          disabled={value >= max}
        >
          <Ionicons
            name="add"
            size={17}
            color={
              value >= max ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)"
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  videoBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fcf7f4",
    justifyContent: "center",
    alignItems: "center",
  },
  video: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.52)",
  },
  fillLayer: { ...StyleSheet.absoluteFillObject },
  blurSmear: {
    width: "120%",
    height: 40,
    marginLeft: "-10%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
  },
  main: { flex: 1, justifyContent: "space-between", paddingHorizontal: 26 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239,68,68,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  streakText: { color: "#fca5a5", fontSize: 12, fontWeight: "700" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnActive: { backgroundColor: "#3b8995" },
  middle: { flex: 1, justifyContent: "center", alignItems: "center" },
  moodBox: { alignItems: "center", marginBottom: 32 },
  activityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 5,
    textAlign: "center",
  },
  motivText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  timerBox: { alignItems: "center" },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  phaseLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.4,
  },
  timerDigits: {
    fontSize: 72,
    fontWeight: "bold",
    color: "white",
    fontVariant: ["tabular-nums"],
    marginBottom: 22,
  },
  playBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#3b8995",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  countRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  countText: { fontSize: 12, color: "rgba(255,255,255,0.38)" },
  exitBox: { alignItems: "center", gap: 12 },
  exitMsg: { fontSize: 18, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
  exitCongrats: { fontSize: 15, color: "rgba(255,255,255,0.65)" },
  bottom: { alignItems: "center", gap: 14 },
  entryCard: {
    backgroundColor: "rgba(255,255,255,0.09)",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 13,
    alignItems: "center",
    minWidth: 230,
    maxWidth: "90%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  entryMeta: {
    fontSize: 10,
    color: "rgba(255,255,255,0.38)",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 2,
  },
  entryTime: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  soundBlock: { alignItems: "center", gap: 6 },
  soundBtns: { flexDirection: "row", alignItems: "center", gap: 22 },
  dimmed: { opacity: 0.22 },
  soundLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  exitZone: { width: "100%", alignItems: "center", paddingVertical: 10 },
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 7,
  },
  progressFill: { height: "100%", backgroundColor: "#3b8995", borderRadius: 2 },
  hint: { fontSize: 11, color: "rgba(255,255,255,0.28)", textAlign: "center" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,10,20,0.97)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 4 },
  editOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  editBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  editSheet: {
    backgroundColor: "rgb(18,18,30)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 32,
    paddingTop: 16,
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  editHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 8,
  },
  editTitle: { fontSize: 17, fontWeight: "700", color: "white" },
  editHint: { fontSize: 13, color: "rgba(255,255,255,0.38)" },
  editInput: {
    fontSize: 56,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    minWidth: 130,
    borderBottomWidth: 2,
    borderBottomColor: "#3b8995",
    paddingBottom: 2,
    marginVertical: 8,
  },
  editConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b8995",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  editConfirmText: { fontSize: 15, fontWeight: "600", color: "white" },
});

const sc = StyleSheet.create({
  card: {
    width: "47.5%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 5 },
  label: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  sublabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.32)",
    textAlign: "center",
  },
  value: { fontSize: 24, fontWeight: "700", color: "white" },
  unit: { fontSize: 11, color: "rgba(255,255,255,0.32)", fontWeight: "400" },
  row: { flexDirection: "row", gap: 10 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  btnOff: { backgroundColor: "rgba(255,255,255,0.03)" },
});
