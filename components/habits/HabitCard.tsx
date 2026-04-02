// components/habits/HabitCard.tsx
import { useCategoryConfig } from "@/hooks/useCategoryConfig";
import { PlannerCategory } from "@/types/planner";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CategoryIcon } from "../categories/CategoryIcon";

type HabitCardProps = {
  title: string;
  completed: boolean;
  streak: number;
  kind: "boolean" | "count";
  unit?: string;
  dailyTarget?: number;
  category?: PlannerCategory;
  todayAmount: number;
  expanded: boolean;
  customCategoryId?: string;
  onIncrease: (amount: number) => void;
  onToggle: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onExpand: () => void;
  onSetAmount: (value: number) => void;
};

export function HabitCard({
  title,
  completed,
  streak,
  kind,
  unit,
  dailyTarget,
  category,
  todayAmount,
  expanded,
  onIncrease,
  onToggle,
  onDelete,
  onDetail,
  onEdit,
  onExpand,
  onSetAmount,
  customCategoryId,
}: HabitCardProps) {
  const [barWidth, setBarWidth] = useState(0);
  const categoryConfig = useCategoryConfig(category, customCategoryId);

  const progress =
    kind === "count" && dailyTarget && dailyTarget > 0
      ? Math.min(todayAmount / dailyTarget, 1)
      : completed
      ? 1
      : 0;

  // Animations mit eingebautem Animated
  const cardScale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(1)).current;

  function handleToggle() {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 0.8, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onToggle();
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => kind === "count",
    onPanResponderMove: (
      e: GestureResponderEvent,
      _gesture: PanResponderGestureState
    ) => {
      if (!dailyTarget || barWidth === 0) return;
      const touchX = e.nativeEvent.locationX;
      const percent = Math.min(Math.max(touchX / barWidth, 0), 1);
      const newValue = Math.round(percent * dailyTarget);
      onSetAmount(newValue);
    },
  });

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <Pressable
        onPress={onExpand}
        onPressIn={() =>
          Animated.timing(cardScale, {
            toValue: 0.98,
            duration: 100,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(cardScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
        style={[
          styles.card,
          {
            backgroundColor: categoryConfig.lightColor,
            borderLeftWidth: 4,
            borderLeftColor: categoryConfig.color,
          },
        ]}
      >
        {/* COLLAPSED */}
        {!expanded && (
          <View style={styles.collapsedContent}>
            <View style={styles.collapsedLeft}>
              <CategoryIcon
                category={category}
                customCategoryId={customCategoryId}
                size={18}
                containerSize={36}
              />
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <View style={styles.collapsedRight}>
              {streak > 0 && (
                <View style={{ flexDirection: "row" }}>
                  <MaterialCommunityIcons
                    name="fire"
                    size={18}
                    color="#F74920"
                  />
                  <Text style={styles.streakText}>{streak}</Text>
                </View>
              )}
              {/* ← NEU: onPress direkt togglen statt expandieren */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleToggle(); // direkt abhaken!
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[
                  styles.progressCircle,
                  {
                    borderColor: categoryConfig.color,
                    backgroundColor: completed
                      ? categoryConfig.color
                      : "transparent",
                  },
                ]}
              >
                {completed && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* EXPANDED */}
        {expanded && (
          <Pressable
            onPress={onExpand}
            onLongPress={onDetail}
            style={styles.expandedContent}
          >
            <View style={styles.expandedHeader}>
              <View style={styles.expandedHeaderLeft}>
                <CategoryIcon
                  customCategoryId={customCategoryId}
                  category={category}
                  size={24}
                  containerSize={36}
                />
                <View>
                  <Text style={styles.titleLarge}>{title}</Text>
                  <Text style={styles.categoryLabel}>
                    {categoryConfig.label}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onEdit} style={styles.editButton}>
                <Feather name="edit-3" size={20} color={categoryConfig.color} />
              </Pressable>
            </View>

            {streak > 0 && (
              <View style={styles.streakSection}>
                <MaterialCommunityIcons name="fire" size={20} color="#F74920" />
                <Text style={styles.streakLabel}>{streak} Tage Streak</Text>
              </View>
            )}

            {/* BOOLEAN */}
            {kind === "boolean" && (
              <View style={styles.booleanSection}>
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  <Pressable
                    onPress={handleToggle}
                    style={[
                      styles.checkButton,
                      {
                        backgroundColor: completed
                          ? categoryConfig.color
                          : "white",
                        borderColor: categoryConfig.color,
                      },
                    ]}
                  >
                    {completed ? (
                      <Ionicons name="checkmark" size={28} color="white" />
                    ) : (
                      <View style={styles.checkButtonInner} />
                    )}
                  </Pressable>
                </Animated.View>
                <Text
                  style={[
                    styles.statusText,
                    { color: completed ? categoryConfig.color : "#9ca3af" },
                  ]}
                >
                  {completed ? "✓ Erledigt" : "Noch offen"}
                </Text>
              </View>
            )}

            {/* COUNT */}
            {kind === "count" && (
              <View style={styles.countSection}>
                <View style={styles.countDisplay}>
                  <Text style={styles.countNumber}>{todayAmount}</Text>
                  <Text style={styles.countTarget}>
                    / {dailyTarget} {unit}
                  </Text>
                </View>

                <View
                  onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                  {...panResponder.panHandlers}
                  style={styles.progressBarContainer}
                >
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: categoryConfig.color,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.countControls}>
                  <Pressable
                    onPress={() => onIncrease(-1)}
                    style={[
                      styles.countButton,
                      { borderColor: categoryConfig.color },
                    ]}
                  >
                    <AntDesign
                      name="minus"
                      size={20}
                      color={categoryConfig.color}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => onIncrease(1)}
                    style={[
                      styles.countButton,
                      {
                        backgroundColor: categoryConfig.color,
                        borderColor: categoryConfig.color,
                      },
                    ]}
                  >
                    <AntDesign name="plus" size={20} color="white" />
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable onPress={onDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Löschen</Text>
            </Pressable>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  collapsedContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
  },
  collapsedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  collapsedRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  expandedContent: {
    padding: 20,
  },
  expandedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  expandedHeaderLeft: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  titleLarge: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  editButton: {
    padding: 8,
  },
  streakSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  booleanSection: {
    alignItems: "center",
    marginTop: 12,
  },
  checkButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  checkButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
  },
  countSection: {
    marginTop: 8,
  },
  countDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 16,
  },
  countNumber: {
    fontSize: 48,
    fontWeight: "700",
    color: "#111",
  },
  countTarget: {
    fontSize: 20,
    color: "#6b7280",
    marginLeft: 4,
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  countControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  countButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  deleteButton: {
    marginTop: 24,
    padding: 12,
    alignItems: "center",
  },
  deleteText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "600",
  },
});
