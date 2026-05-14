import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="email" />
      <Stack.Screen name="photo" />
      <Stack.Screen name="handle" />
      <Stack.Screen name="dob" />
      <Stack.Screen name="resume" />
      <Stack.Screen name="manual-review" />
      <Stack.Screen name="manual" />
      <Stack.Screen name="cards" />
      <Stack.Screen name="theme" />
      <Stack.Screen name="font" />
      <Stack.Screen name="preference" />
      <Stack.Screen name="generating" />
    </Stack>
  );
}
