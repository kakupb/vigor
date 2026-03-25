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
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
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
  onExit: () => void;
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
  const [focusStartTime] = useState(Date.now());
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

  // ── Bell-Sound ─────────────────────────────────────────────────────────────
  // Datei hinzufügen: assets/sounds/bell.mp3
  const bellPlayer = useAudioPlayer(require("@/assets/sounds/bell.mp3"));
  function playBell() {
    try {
      bellPlayer.seekTo(0);
      bellPlayer.play();
    } catch (e) {
      /* ignore */
    }
  }

  const {
    state: pomodoroState,
    start,
    pause,
    reset,
  } = usePomodoro(pomodoroConfig, playBell);

  // ── Refs für Touch-Handler (kein stale closure) ────────────────────────────
  // ALLE Werte, die in den Touch-Handlern benötigt werden, via Refs bereitstellen
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
  const focusStartTimeRef = useRef(focusStartTime);
  const audioPlayerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);

  // Refs immer synchron halten
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

  // ── Animated values (stabil) ──────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const videoScale = useRef(new Animated.Value(1)).current;
  const extraDim = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const blurOpacity = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;

  // ── Animationsfunktionen – über Refs aufgerufen, deshalb stabile Refs nötig
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
    audioPlayerRef.current?.pause();
    setIsExiting(true);

    const entry = currentEntryRef.current;
    const ps = pomodoroStateRef.current;
    const t0 = focusStartTimeRef.current;
    const dur = Math.floor((Date.now() - t0) / 1000);

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

    setTimeout(() => {
      onExitRef.current();
      setIsExiting(false);
      progressAnim.setValue(0);
      phaseRef.current = 0;
      resetRef.current();
    }, 1000);
  }, []);

  // ── Stabile Refs zu den useCallback-Funktionen ────────────────────────────
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

  // ── Touch-Handler: EINMALIG erstellt (leere Deps) ─────────────────────────
  // Alle Werte kommen aus Refs → kein stale closure möglich
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
  }, []); // ← leere Deps: nie neu erstellt, kein stale closure

  const handleTouchEnd = useCallback(() => {
    pressStartTime.current = null;
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    doResetAllRef.current();
  }, []); // ← leere Deps

  // ── Audio ─────────────────────────────────────────────────────────────────
  const audioPlayer = useAudioPlayer(null);
  audioPlayerRef.current = audioPlayer;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (!visible || !soundEnabled || selectedSound === "none") {
      audioPlayer.pause();
      return;
    }
    const file = SOUND_FILES[selectedSound];
    if (!file) {
      audioPlayer.pause();
      return;
    }
    try {
      audioPlayer.replace(file);
      audioPlayer.loop = true;
      audioPlayer.volume = 0.6;
      audioPlayer.play();
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }, [soundEnabled, selectedSound, visible]);

  useEffect(() => {
    if (!visible) audioPlayer.pause();
  }, [visible]);

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
      audioPlayer.pause();
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

  // ── Doppeltippen ──────────────────────────────────────────────────────────
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
        {/* Hintergrund */}
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

        {/* Haupt-UI */}
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
          {/* TOP */}
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

          {/* MITTE */}
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

          {/* UNTEN */}
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

            {/* Sound-Controls */}
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

            {/* ── Exit-Zone: nur visueller Fortschrittsbalken ── */}
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

        {/* Settings-Sheet */}
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
              <StepperCard
                iconLib="ion"
                iconName="timer-outline"
                label="Fokus"
                value={pomodoroConfig.workMinutes}
                unit="Min"
                min={1}
                max={90}
                step={5}
                onDoubleTap={() =>
                  openEdit({
                    key: "workMinutes",
                    label: "Fokus-Dauer",
                    min: 1,
                    max: 90,
                    value: pomodoroConfig.workMinutes,
                  })
                }
                onChange={(v) =>
                  setPomodoroConfig({
                    ...useFocusStore.getState().pomodoroConfig,
                    workMinutes: v,
                  })
                }
              />
              <StepperCard
                iconLib="ion"
                iconName="cafe-outline"
                label="Kurze Pause"
                value={pomodoroConfig.breakMinutes}
                unit="Min"
                min={1}
                max={30}
                step={1}
                onDoubleTap={() =>
                  openEdit({
                    key: "breakMinutes",
                    label: "Kurze Pause",
                    min: 1,
                    max: 30,
                    value: pomodoroConfig.breakMinutes,
                  })
                }
                onChange={(v) =>
                  setPomodoroConfig({
                    ...useFocusStore.getState().pomodoroConfig,
                    breakMinutes: v,
                  })
                }
              />
              <StepperCard
                iconLib="ion"
                iconName="moon-outline"
                label="Lange Pause"
                value={pomodoroConfig.longBreakMinutes}
                unit="Min"
                min={1}
                max={60}
                step={5}
                onDoubleTap={() =>
                  openEdit({
                    key: "longBreakMinutes",
                    label: "Lange Pause",
                    min: 1,
                    max: 60,
                    value: pomodoroConfig.longBreakMinutes,
                  })
                }
                onChange={(v) =>
                  setPomodoroConfig({
                    ...useFocusStore.getState().pomodoroConfig,
                    longBreakMinutes: v,
                  })
                }
              />
              <StepperCard
                iconLib="mci"
                iconName="repeat"
                label="Zykluslänge"
                sublabel="Einheiten bis lange Pause"
                value={pomodoroConfig.longBreakAfter}
                unit="Einh."
                min={2}
                max={8}
                step={1}
                onDoubleTap={() =>
                  openEdit({
                    key: "longBreakAfter",
                    label: "Zykluslänge",
                    min: 2,
                    max: 8,
                    value: pomodoroConfig.longBreakAfter,
                  })
                }
                onChange={(v) =>
                  setPomodoroConfig({
                    ...useFocusStore.getState().pomodoroConfig,
                    longBreakAfter: v,
                  })
                }
              />
            </View>
          </View>
        )}

        {/* ── Edit-Modal: KeyboardAvoidingView schiebt das Sheet über die Tastatur ── */}
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
                  keyboardType="number-pad" // ← nur Zahlen, keine Buchstaben
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

  // Edit-Modal
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
