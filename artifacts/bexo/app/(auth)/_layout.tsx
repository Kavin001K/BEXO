import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="collect-email" />
      <Stack.Screen name="collect-phone" />
    </Stack>
  );
}
