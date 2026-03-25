// app/(tabs)/planner.tsx
import PlannerMonthView from "@/components/planner/month/PlannerMonthView";
import PlannerDayView from "@/components/planner/PlannerDayView";
import PlannerWeekView from "@/components/planner/PlannerWeekView";
import { dateToLocalString } from "@/utils/dateUtils";
import { useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PlannerView = "day" | "week" | "month";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const [currentView, setCurrentView] = useState<PlannerView>("day");
  const [selectedDate, setSelectedDate] = useState<string>(
    dateToLocalString(new Date())
  );

  const scrollViewRef = useRef<ScrollView>(null);

  function handleDaySelect(date: string) {
    setSelectedDate(date);
    setCurrentView("day");
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  }

  function handleViewChange(view: PlannerView) {
    setCurrentView(view);
    const pageIndex = { day: 0, week: 1, month: 2 }[view];
    scrollViewRef.current?.scrollTo({
      x: pageIndex * SCREEN_WIDTH,
      animated: true,
    });
  }

  function handleScroll(event: any) {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);

    const newView: PlannerView =
      pageIndex === 0 ? "day" : pageIndex === 1 ? "week" : "month";

    if (newView !== currentView) {
      setCurrentView(newView);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Segmented Control */}
      <View
        style={{
          flexDirection: "row",
          padding: 20,
          paddingBottom: 12,
          paddingTop: insets.top + 12,
          gap: 8,
          backgroundColor: "white",
        }}
      >
        {(["day", "week", "month"] as PlannerView[]).map((view) => {
          const isActive = currentView === view;
          const labels = { day: "Tag", week: "Woche", month: "Monat" };

          return (
            <Pressable
              key={view}
              onPress={() => handleViewChange(view)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: isActive ? "#3b8995" : "#f3f4f6",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: isActive ? "white" : "#6b7280",
                }}
              >
                {labels[view]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ✅ Simple ScrollView - No locks! */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
        bounces={false}
      >
        <View style={{ width: SCREEN_WIDTH }}>
          <PlannerDayView date={selectedDate} onDateChange={setSelectedDate} />
        </View>

        <View style={{ width: SCREEN_WIDTH }}>
          <PlannerWeekView onDaySelect={handleDaySelect} />
        </View>

        <View style={{ width: SCREEN_WIDTH }}>
          <PlannerMonthView onDaySelect={handleDaySelect} />
        </View>
      </ScrollView>
    </View>
  );
}
