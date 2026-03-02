import { Stack } from "expo-router";

export default function PlannerLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="add" options={{ title: "Eintrag hinzufügen" }} />
      <Stack.Screen name="edit/[id]" options={{ title: "Bearbeiten" }} />
    </Stack>
  );
}
