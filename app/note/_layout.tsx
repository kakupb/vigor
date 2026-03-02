import { Stack } from "expo-router";

export default function NotesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" />
      <Stack.Screen name="edit/[id]" />
    </Stack>
  );
}
