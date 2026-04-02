// components/planner/SwipeableEntryt.tsx
import { PlannerEntry } from "@/types/planner";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type SwipeableEntryProps = {
  entry: PlannerEntry;
  onDelete: (id: string) => void;
  onLongPress?: () => void;
  onEdit: () => void;
  onToggleDone: () => void;
  children: React.ReactNode;
};

const DONE_THRESHOLD = 100;
const DELETE_THRESHOLD = 140;

export function SwipeableEntry({
  entry,
  onDelete,
  onEdit,
  onLongPress,
  onToggleDone,
  children,
}: SwipeableEntryProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const doneFill = useRef(new Animated.Value(0)).current;
  const deleteFill = useRef(new Animated.Value(0)).current;
  const hasTriggered = useRef(false);

  // Nur Animationen zurücksetzen — hasTriggered bleibt unangetastet
  function resetAnimations(duration = 250) {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: false }),
      Animated.timing(doneFill, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(deleteFill, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }),
    ]).start();
  }

  // Vollständiger Reset inkl. hasTriggered
  function resetAll(duration = 250) {
    hasTriggered.current = false;
    resetAnimations(duration);
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),

      onPanResponderGrant: () => {
        hasTriggered.current = false;
      },

      onPanResponderMove: (_, g) => {
        if (hasTriggered.current) return;
        const dx = g.dx;

        if (dx > 0) {
          doneFill.setValue(Math.min(dx, DONE_THRESHOLD));
          deleteFill.setValue(0);
        } else {
          deleteFill.setValue(Math.min(-dx, DELETE_THRESHOLD));
          doneFill.setValue(0);
        }
      },

      onPanResponderRelease: (_, g) => {
        if (hasTriggered.current) return;
        const dx = g.dx;

        if (dx > DONE_THRESHOLD * 0.6) {
          // ── Done ────────────────────────────────────────────────────────
          hasTriggered.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(doneFill, {
            toValue: 500,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onToggleDone();
            resetAll(250);
          });
        } else if (dx < -DELETE_THRESHOLD * 0.6) {
          // ── Delete: Animationen zurück, DANN Alert ───────────────────────
          hasTriggered.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

          // Nur Animationen zurücksetzen, hasTriggered bleibt true
          resetAnimations(200);

          setTimeout(() => {
            Alert.alert(
              "Eintrag löschen?",
              `"${entry.title}" wirklich löschen?`,
              [
                {
                  text: "Abbrechen",
                  style: "cancel",
                  onPress: () => {
                    hasTriggered.current = false; // jetzt erst freigeben
                  },
                },
                {
                  text: "Löschen",
                  style: "destructive",
                  onPress: () => {
                    onDelete(entry.id);
                    hasTriggered.current = false;
                  },
                },
              ]
            );
          }, 220);
        } else {
          // ── Zurückschnappen ──────────────────────────────────────────────
          resetAll(200);
        }
      },

      onPanResponderTerminate: () => {
        resetAll(200);
      },
    })
  ).current;

  const doneOpacity = doneFill.interpolate({
    inputRange: [0, DONE_THRESHOLD],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });
  const deleteOpacity = deleteFill.interpolate({
    inputRange: [0, DELETE_THRESHOLD],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });
  const doneIconOpacity = doneFill.interpolate({
    inputRange: [0, DONE_THRESHOLD * 0.4, DONE_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });
  const deleteIconOpacity = deleteFill.interpolate({
    inputRange: [0, DELETE_THRESHOLD * 0.4, DELETE_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.content, { transform: [{ translateX }] }]}
      >
        <Pressable
          onPress={onEdit}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={{ flex: 1 }}
        >
          {children}
        </Pressable>

        {/* Done Overlay — grün von links */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            styles.doneOverlay,
            { width: doneFill, opacity: doneOpacity },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.iconContainer,
            styles.doneIcon,
            { opacity: doneIconOpacity },
          ]}
        >
          <Text style={styles.iconText}>✓</Text>
        </Animated.View>

        {/* Delete Overlay — rot von rechts */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            styles.deleteOverlay,
            { width: deleteFill, opacity: deleteOpacity },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.iconContainer,
            styles.deleteIcon,
            { opacity: deleteIconOpacity },
          ]}
        >
          <Text style={styles.iconText}></Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    flex: 1,
  },
  content: {
    flex: 1,
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  doneOverlay: {
    left: 0,
    backgroundColor: "#d1fae5",
  },
  deleteOverlay: {
    right: 0,
    backgroundColor: "#fee2e2",
  },
  iconContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  doneIcon: {
    left: 8,
  },
  deleteIcon: {
    right: 8,
  },
  iconText: {
    fontSize: 20,
  },
});
