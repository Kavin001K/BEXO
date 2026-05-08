import {
  DM_Sans_400Regular,
  DM_Sans_500Medium,
  DM_Sans_700Bold,
  useFonts as useDMSansFonts,
} from "@expo-google-fonts/dm-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { session, isLoading } = useAuthStore();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="+not-found" />
      {!session && <Redirect href="/(auth)" />}
    </Stack>
  );
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  const [fontsLoaded, fontError] = useDMSansFonts({
    DM_Sans_400Regular,
    DM_Sans_500Medium,
    DM_Sans_700Bold,
  });

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
