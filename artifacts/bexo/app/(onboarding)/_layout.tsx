import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen
        name="email"
        options={{
          presentation: "modal",
          ...(Platform.OS === "ios" ? { animation: "slide_from_bottom" as const } : {}),
        }}
      />
      <Stack.Screen name="contact" />
      <Stack.Screen name="photo" />
      <Stack.Screen name="handle" />
      <Stack.Screen name="dob" />
      <Stack.Screen name="resume" />
      <Stack.Screen name="manual" />
      <Stack.Screen name="cards" />
      <Stack.Screen name="theme" />
      <Stack.Screen name="font" />
      <Stack.Screen name="preference" />
      <Stack.Screen name="generating" />
    </Stack>
  );
}
