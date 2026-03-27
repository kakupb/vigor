// app/(tabs)/_layout.tsx
import { HapticTab } from "@/components/haptic-tab";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: {
  name: string;
  label: string;
  icon: IoniconName;
  iconActive: IoniconName;
}[] = [
  {
    name: "fokus",
    label: "Fokus",
    icon: "timer-outline",
    iconActive: "timer",
  },
  {
    name: "fortschritt",
    label: "Fortschritt",
    icon: "flame-outline",
    iconActive: "flame",
  },
  {
    name: "planen",
    label: "Planen",
    icon: "calendar-outline",
    iconActive: "calendar",
  },
  {
    name: "mehr",
    label: "Mehr",
    icon: "grid-outline",
    iconActive: "grid",
  },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

function CustomTabBar({ state, descriptors, navigation, insets }: any) {
  return (
    <View
      style={[
        tb.wrapper,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
      ]}
    >
      <View style={tb.bar}>
        {state.routes.map((route: any, index: number) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Fokus-Tab bekommt primäre Farbe
          const activeColor = tab.name === "fokus" ? "#3b8995" : "#3b8995";
          const activeBg = tab.name === "fokus" ? "#f0fbfc" : "#f0fbfc";

          return (
            <HapticTab
              key={route.key}
              onPress={onPress}
              style={tb.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <View
                style={[
                  tb.tabInner,
                  isFocused && {
                    ...tb.tabInnerActive,
                    backgroundColor: activeBg,
                  },
                ]}
              >
                <Ionicons
                  name={isFocused ? tab.iconActive : tab.icon}
                  size={22}
                  color={isFocused ? activeColor : "#94a3b8"}
                />
                <Text
                  style={[
                    tb.label,
                    isFocused && { ...tb.labelActive, color: activeColor },
                  ]}
                >
                  {tab.label}
                </Text>
              </View>
            </HapticTab>
          );
        })}
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  bar: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
  },
  tabInner: {
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 48,
  },
  tabInnerActive: {
    backgroundColor: "#f0fbfc",
  },
  label: {
    fontSize: 9,
    fontWeight: "500",
    color: "#94a3b8",
    letterSpacing: 0.2,
  },
  labelActive: {
    color: "#3b8995",
    fontWeight: "700",
  },
});
