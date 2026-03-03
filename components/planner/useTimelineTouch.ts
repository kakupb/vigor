import { useEffect, useRef, useState } from "react";

type TouchSlot = {
  startMinutes: number;
  endMinutes: number;
};

type UseTimelineTouchProps = {
  hourHeight: number;
  onLongPress: (slot?: { startMinutes: number; endMinutes: number }) => void;
  scrollOffset: number;
  onScrollLockChange?: (locked: boolean) => void;
  onAutoScroll?: (direction: "up" | "down") => void;
  highlightDelay?: number;
  autoScrollEdgeThreshold?: number;
  longPressDuration?: number;
  movementThreshold?: number;
};

export function useTimelineTouch({
  hourHeight,
  onLongPress,
  scrollOffset,
  onScrollLockChange,
  onAutoScroll,
  longPressDuration = 1500,
  movementThreshold = 18,
  highlightDelay = 400,
  autoScrollEdgeThreshold = 110,
}: UseTimelineTouchProps) {
  const [highlightedSlot, setHighlightedSlot] = useState<TouchSlot | null>(
    null
  );
  const [isScrollLocked, setIsScrollLocked] = useState(false);

  const touchStartRef = useRef<{
    x: number;
    y: number;
    locationY: number;
  } | null>(null);

  const anchorMinutesRef = useRef<number | null>(null); // ✅ NEU: Anchor Point
  const isDraggingRef = useRef(false); // ✅ NEU: Drag State

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const hasMoved = useRef(false);
  const isHighlightVisible = useRef(false);
  const viewHeightRef = useRef(600);

  /**
   * Berechnet Minutes von locationY
   */
  function locationYToMinutes(locationY: number): number {
    const minutesFromTop = (locationY / hourHeight) * 60;
    return Math.round(minutesFromTop / 15) * 15; // Snap to 30min
  }

  /**
   * ✅ NEU: Berechnet Box basierend auf Anchor + Current
   */
  function calculateDynamicSlot(
    anchorMinutes: number,
    currentMinutes: number
  ): TouchSlot {
    const start = Math.min(anchorMinutes, currentMinutes);
    const end = Math.max(anchorMinutes, currentMinutes);

    // Min 30 min duration
    const adjustedEnd = Math.max(end, start + 15);

    return {
      startMinutes: start,
      endMinutes: adjustedEnd,
    };
  }

  function showHighlight(slot: TouchSlot) {
    if (isHighlightVisible.current) return;

    isHighlightVisible.current = true;
    setHighlightedSlot(slot);
    setIsScrollLocked(true);
    onScrollLockChange?.(true);
  }

  function hideHighlight() {
    isHighlightVisible.current = false;
    setHighlightedSlot(null);
    setIsScrollLocked(false);
    onScrollLockChange?.(false);

    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }

  function checkAutoScroll(absoluteLocationY: number) {
    if (!isHighlightVisible.current || !isDraggingRef.current) return;

    const viewportRelativeY = absoluteLocationY - scrollOffset;

    // Nahe am oberen Rand des Viewports?
    if (viewportRelativeY < autoScrollEdgeThreshold) {
      if (!autoScrollTimerRef.current) {
        autoScrollTimerRef.current = setInterval(() => {
          onAutoScroll?.("up");
        }, 50);
      }
      return;
    }

    // Nahe am unteren Rand des Viewports?
    if (viewportRelativeY > viewHeightRef.current - autoScrollEdgeThreshold) {
      if (!autoScrollTimerRef.current) {
        autoScrollTimerRef.current = setInterval(() => {
          onAutoScroll?.("down");
        }, 50);
      }
      return;
    }

    // In der Mitte → Kein Auto-Scroll
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }

  function handleTouchStart(event: any) {
    const touch = event.nativeEvent;

    touchStartRef.current = {
      x: touch.pageX,
      y: touch.pageY,
      locationY: touch.locationY,
    };
    hasMoved.current = false;
    isDraggingRef.current = false;

    // ✅ Setze Anchor beim ersten Touch
    const anchorMinutes = locationYToMinutes(touch.locationY);
    anchorMinutesRef.current = anchorMinutes;

    // Nach highlightDelay: Zeige initiale Box
    highlightTimerRef.current = setTimeout(() => {
      if (
        !hasMoved.current &&
        touchStartRef.current &&
        anchorMinutesRef.current !== null
      ) {
        const slot = {
          startMinutes: anchorMinutesRef.current,
          endMinutes: anchorMinutesRef.current + 30,
        };
        showHighlight(slot);
        isDraggingRef.current = true; // ✅ Jetzt kann gedragged werden!
      }
    }, highlightDelay);

    // Long Press Timer wird NICHT mehr genutzt für Add!
    // Wir öffnen Add beim Release!
  }

  function handleTouchMove(event: any) {
    const touch = event.nativeEvent;
    const touchY = touch.locationY;

    if (!touchStartRef.current) return;

    // Movement Detection (nur für Cancel)
    const deltaX = Math.abs(touch.pageX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.pageY - touchStartRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // ✅ Wenn Bewegung VOR Highlight → Cancel
    if (distance > movementThreshold && !isHighlightVisible.current) {
      hasMoved.current = true;
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
      return;
    }

    // ✅ Wenn Highlight sichtbar UND Dragging → Update Box!
    if (isDraggingRef.current && anchorMinutesRef.current !== null) {
      const currentMinutes = locationYToMinutes(touchY);
      const dynamicSlot = calculateDynamicSlot(
        anchorMinutesRef.current,
        currentMinutes
      );
      setHighlightedSlot(dynamicSlot);
      checkAutoScroll(touchY); // Use original locationY for edge detection
    }
  }

  function handleTouchEnd() {
    // ✅ Wenn Dragging aktiv war → Öffne Add mit Zeiten!
    if (isDraggingRef.current && highlightedSlot) {
      onLongPress(highlightedSlot);
    }

    // Cleanup
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }

    hideHighlight();
    touchStartRef.current = null;
    anchorMinutesRef.current = null;
    isDraggingRef.current = false;
    hasMoved.current = false;
  }

  function setViewHeight(height: number) {
    viewHeightRef.current = height;
  }

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, []);

  return {
    highlightedSlot,
    isScrollLocked,
    setViewHeight,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
