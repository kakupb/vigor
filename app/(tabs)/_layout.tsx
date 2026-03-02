import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="today" options={{ title: "Heute" }} />
      <Tabs.Screen name="planner" options={{ title: "Planner" }} />
      <Tabs.Screen name="notes" options={{ title: "Notizen" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
    </Tabs>
  );
}
