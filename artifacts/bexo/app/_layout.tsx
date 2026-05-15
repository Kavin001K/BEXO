import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { Montserrat_700Bold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import { PlayfairDisplay_700Bold, PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display";
import { Poppins_600SemiBold, Poppins_800ExtraBold } from "@expo-google-fonts/poppins";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { Syne_700Bold, Syne_800ExtraBold } from "@expo-google-fonts/syne";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Font from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { Feather, AntDesign } from "@expo/vector-icons";

import { ComingSoonGateway } from "@/components/ComingSoonGateway";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    let cancelled = false;

    Font.loadAsync({
      DMSans_400Regular,
      DMSans_500Medium,
      DMSans_700Bold,
      JetBrainsMono_400Regular,
      JetBrainsMono_700Bold,
      Montserrat_700Bold,
      Montserrat_800ExtraBold,
      PlayfairDisplay_700Bold,
      PlayfairDisplay_900Black,
      Poppins_600SemiBold,
      Poppins_800ExtraBold,
      SpaceGrotesk_700Bold,
      Syne_700Bold,
      Syne_800ExtraBold,
      ...Feather.font,
      ...AntDesign.font,
    })
      .catch(() => {
        // Font loading failed (e.g. no network). Continue with system fonts.
      })
      .finally(() => {
        if (!cancelled) setFontsReady(true);
      });

    const timeout = setTimeout(() => {
      if (!cancelled) setFontsReady(true);
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (fontsReady && !isAuthLoading) {
      SplashScreen.hideAsync().catch(() => {
        /* already hidden or unavailable */
      });
    }
  }, [fontsReady, isAuthLoading]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <BottomSheetModalProvider>
                <ComingSoonGateway>
                  <RootLayoutNav />
                </ComingSoonGateway>
              </BottomSheetModalProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
