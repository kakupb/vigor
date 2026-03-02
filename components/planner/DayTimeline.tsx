// components/planner/DayTimeline.tsx
import { getCategoryConfig } from "@/constants/categories";
import { usePlannerStore } from "@/store/plannerStore";
import { PlannerEntry } from "@/types/planner";
import { timeToMinutes } from "@/utils/dateUtils";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusScreen } from "../focus/FocusScreen";
import { SwipeableEntry } from "./SwipeableEntryt";
import {
  assignColumns,
  groupOverlappingEntries,
  TimedEntry,
} from "./timeline-helpers";
import { useTimelineTouch } from "./useTimelineTouch";

type DayTimelineProps = {
  entries: PlannerEntry[];
  onPressEntry?: (entry: PlannerEntry) => void;
  onLongPressEntry?: (entry: PlannerEntry) => void;
  onLongPressBackground?: (startTime?: string, endTime?: string) => void;
};

export default function DayTimeline({
  entries,
  onPressEntry,
  onLongPressEntry,
  onLongPressBackground,
}: DayTimelineProps) {
  const [mode, setMode] = useState<"focus" | "full">("focus");
  const insets = useSafeAreaInsets();

  const deleteEntry = usePlannerStore((s) => s.deleteEntry);
  const HOUR_HEIGHT = 80;
  const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT;
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0); // Track scroll position
  const [focusVisible, setFocusVisible] = useState(false); // ← NEU

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Auto-Scroll Handler
  function handleAutoScroll(direction: "up" | "down") {
    if (!scrollRef.current) return;

    const newOffset =
      direction === "up"
        ? Math.max(0, scrollOffsetRef.current - 10)
        : Math.min(TIMELINE_HEIGHT - 600, scrollOffsetRef.current + 10);

    scrollOffsetRef.current = newOffset;

    scrollRef.current.scrollTo({
      y: newOffset,
      animated: false,
    });
  }

  // Touch Handling
  const { highlightedSlot, isScrollLocked, setViewHeight, handlers } =
    useTimelineTouch({
      hourHeight: HOUR_HEIGHT,
      scrollOffset: scrollOffsetRef.current,
      onLongPress: (slot: any) => {
        // ✅ Slot hat jetzt Start + End!

        if (slot && onLongPressBackground) {
          const startTime = `${String(
            Math.floor(slot.startMinutes / 60)
          ).padStart(2, "0")}:${String(slot.startMinutes % 60).padStart(
            2,
            "0"
          )}`;
          const endTime = `${String(Math.floor(slot.endMinutes / 60)).padStart(
            2,
            "0"
          )}:${String(slot.endMinutes % 60).padStart(2, "0")}`;

          onLongPressBackground(startTime, endTime); // ✅ Pass both!
        } else {
          onLongPressBackground?.();
        }
      },
      onAutoScroll: handleAutoScroll,
    });

  // Prepared Entries
  const preparedEntries = useMemo(() => {
    const timed: TimedEntry[] = entries
      .filter((e) => e.startTime)
      .map((e) => {
        const startMin = timeToMinutes(e.startTime!);
        const endMin = e.endTime
          ? timeToMinutes(e.endTime)
          : startMin + (e.durationMinute ?? 30);

        return { ...e, startMin, endMin };
      });

    const groups = groupOverlappingEntries(timed);
    return assignColumns(groups);
  }, [entries]);

  // Auto-Scroll to current time
  const scrollToFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const y = (minutes / 60) * HOUR_HEIGHT - 2 * HOUR_HEIGHT;
      const offset = Math.max(0, y);

      scrollOffsetRef.current = offset;
      scrollRef.current?.scrollTo({
        y: offset,
        animated: true,
      });
    });
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      if (mode === "focus") {
        scrollToFocus();
      }
    }, [mode])
  );

  return (
    <View style={{ marginTop: 20, flex: 1 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Kalender</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Scroll Mode Toggle */}
          {/* <Pressable
            onPress={() => setMode(mode === "focus" ? "full" : "focus")}
          >
            <Text style={{ color: "#555", fontSize: 14 }}>
              {mode === "focus" ? "Fokus" : "Ganzer Tag"}
            </Text>
          </Pressable> */}

          {/* Focus Screen Button */}
          <Pressable onPress={() => setFocusVisible(true)}>
            <Text style={{ color: "#3b8995", fontWeight: "600", fontSize: 14 }}>
              Fokus Modus
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Timeline */}
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!isScrollLocked} // WICHTIG: Dynamisch lock/unlock
        nestedScrollEnabled={true}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          setViewHeight(height);
          if (mode === "focus") scrollToFocus();
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{
          //  height: TIMELINE_HEIGHT,
          paddingBottom: insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row" }}>
          {/* Hour Labels */}
          <View style={{ width: 40 }}>
            {hours.map((hour) => (
              <View
                key={hour}
                style={{ height: HOUR_HEIGHT, justifyContent: "flex-start" }}
              >
                <Text style={{ fontSize: 12, color: "#888" }}>
                  {String(hour).padStart(2, "0")}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Timeline Container */}
          <View
            style={{
              flex: 1,
              height: TIMELINE_HEIGHT,
              borderLeftWidth: 1,
              borderColor: "#ddd",
              position: "relative",
            }}
          >
            {Array.from({ length: 24 * 4 }).map((_, i) => {
              const minutes = i * 30;
              const isHour = minutes % 60 === 0;
              const isHalfHour = minutes % 30 === 0;

              return (
                <View
                  key={i}
                  style={{
                    position: "absolute",
                    top: (minutes / 60) * HOUR_HEIGHT,
                    left: -10,
                    right: 0,
                    height: 1,
                    backgroundColor: isHour
                      ? "#ddd"
                      : isHalfHour
                      ? "#eee"
                      : "#f5f5f5",
                  }}
                />
              );
            })}
            {/* Interactive Background */}
            <View
              {...handlers}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
              }}
            >
              <View style={{ width: "100%", height: "100%" }} />
            </View>

            {/* Highlighted Slot */}
            {highlightedSlot && (
              <View
                style={{
                  position: "absolute",
                  top: (highlightedSlot.startMinutes / 60) * HOUR_HEIGHT,
                  height:
                    ((highlightedSlot.endMinutes -
                      highlightedSlot.startMinutes) /
                      60) *
                    HOUR_HEIGHT,
                  left: 0,
                  right: 0,
                  backgroundColor: "rgba(160, 178, 207, 0.12)",
                  borderWidth: 2,
                  borderColor: "rgba(154, 168, 189, 0.3)",
                  borderStyle: "dashed",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              >
                {/* Zeit-Label */}
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    backgroundColor: "rgba(164, 180, 206, 0.9)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{ fontSize: 10, color: "white", fontWeight: "600" }}
                  >
                    {Math.floor(highlightedSlot.startMinutes / 60)}:
                    {String(highlightedSlot.startMinutes % 60).padStart(2, "0")}{" "}
                    - {Math.floor(highlightedSlot.endMinutes / 60)}:
                    {String(highlightedSlot.endMinutes % 60).padStart(2, "0")}
                  </Text>
                </View>

                {/* Visual Indicator: Scroll ist locked */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "rgba(59, 130, 246, 0.8)",
                  }}
                />
              </View>
            )}

            {/* Entries */}
            {preparedEntries.map((entry) => {
              const categoryConfig = getCategoryConfig(entry.category);

              const { startMin, endMin, columnIndex, columnCount } = entry;
              const durMin = Math.max(endMin - startMin, 0);
              //   const relativeStart = startMin - startHour * 60;

              //   if (relativeStart + durMin < 0 || relativeStart > totalMinutes) {
              //     return null;
              //   }

              const top = (startMin / 60) * HOUR_HEIGHT;
              const height = (durMin / 60) * HOUR_HEIGHT;
              const widthPercent = 100 / columnCount;
              const GAP = 4;

              const isVerySmall = height < 30;
              const isSmall = height >= 30 && height < 60;
              const isNormal = height >= 60;

              return (
                <View
                  key={entry.id}
                  style={{
                    position: "absolute",
                    top,
                    height,
                    left: `${columnIndex * widthPercent}%`,
                    width: `${widthPercent}%`,
                    paddingLeft: GAP,
                    paddingRight: GAP,
                    zIndex: 10,
                  }}
                >
                  <SwipeableEntry
                    entry={entry}
                    onDelete={deleteEntry}
                    onEdit={() => onLongPressEntry?.(entry)}
                    onToggleDone={() => onPressEntry?.(entry)}
                  >
                    <View
                      style={{
                        backgroundColor: entry.doneAt
                          ? "#d1fae5"
                          : categoryConfig.lightColor,
                        borderRadius: 8,
                        padding: isVerySmall ? 4 : isSmall ? 4 : 8,
                        height: isVerySmall ? "100%" : "100%",
                        borderLeftWidth: isVerySmall ? 3 : isSmall ? 3 : 4,
                        borderLeftColor: categoryConfig.color,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "600",
                          fontSize: isVerySmall ? 10 : isSmall ? 10 : 14,
                        }}
                      >
                        {entry.title}
                      </Text>
                      {!isVerySmall && (
                        <Text
                          style={{
                            fontSize: isSmall ? 10 : 12,
                            color: "#555",
                          }}
                        >
                          {entry.startTime} – {entry.endTime}
                        </Text>
                      )}
                    </View>
                  </SwipeableEntry>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      {/* ✨ Focus Screen Modal */}
      <FocusScreen
        visible={focusVisible}
        entries={entries}
        onExit={() => setFocusVisible(false)}
      />
    </View>
  );
}
