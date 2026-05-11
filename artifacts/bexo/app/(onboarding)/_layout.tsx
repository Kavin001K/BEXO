import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="contact" />
      <Stack.Screen name="photo" />
      <Stack.Screen name="handle" />
      <Stack.Screen name="resume" />
      <Stack.Screen name="cards" />
      <Stack.Screen name="generating" />
    </Stack>
  );
}
