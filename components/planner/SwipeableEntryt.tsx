// components/planner/SwipeableEntryt.tsx
import { PlannerEntry } from "@/types/planner";
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

const DELETE_THRESHOLD = -80;
const DONE_THRESHOLD = 120;

export function SwipeableEntry({
  entry,
  onDelete,
  onEdit,
  onLongPress,
  onToggleDone,
  children,
}: SwipeableEntryProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const fillWidth = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        currentX.current = (translateX as any)._value;
      },
      onPanResponderMove: (_, g) => {
        const newX = currentX.current + g.dx;
        if (newX > 0) {
          translateX.setValue(0);
          fillWidth.setValue(Math.min(DONE_THRESHOLD, newX));
        } else {
          translateX.setValue(newX);
          fillWidth.setValue(0);
        }
      },
      onPanResponderRelease: (_, g) => {
        const curX = (translateX as any)._value;
        const curFill = (fillWidth as any)._value;

        // Swipe Left → Delete
        if (curX < DELETE_THRESHOLD / 2) {
          Animated.spring(translateX, {
            toValue: DELETE_THRESHOLD,
            useNativeDriver: false,
          }).start();
        }
        // Swipe Right → Done
        else if (curFill > DONE_THRESHOLD * 0.5) {
          Animated.timing(fillWidth, {
            toValue: 300,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            onToggleDone();
            Animated.timing(fillWidth, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }).start();
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          });
        }
        // Snap back
        else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          Animated.timing(fillWidth, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const fillOpacity = fillWidth.interpolate({
    inputRange: [0, DONE_THRESHOLD],
    outputRange: [0, 0.35],
    extrapolate: "clamp",
  });

  function handleDelete() {
    Alert.alert("Löschen?", `"${entry.title}" wirklich löschen?`, [
      {
        text: "Abbrechen",
        style: "cancel",
        onPress: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        },
      },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => onDelete(entry.id),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Delete Button */}
      <View style={styles.deleteContainer}>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>🗑️</Text>
        </Pressable>
      </View>

      {/* Swipeable Content */}
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

        {/* Green fill overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fillOverlay,
            { width: fillWidth, opacity: fillOpacity },
          ]}
        />
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
  deleteContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    position: "relative",
  },
  fillOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
  },
});
