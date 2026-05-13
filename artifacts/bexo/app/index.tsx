import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

export default function RootIndex() {
  const session = useAuthStore((s) => s.session);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const profile = useProfileStore((s) => s.profile);
  const isProfileLoading = useProfileStore((s) => s.isLoading);
  const onboardingStep = useProfileStore((s) => s.onboardingStep);

  useEffect(() => {
    if (!isAuthLoading && !isProfileLoading) {
      if (session) {
        const hasFinishedOnboarding = onboardingStep === "completed";
        const hasHandle = !!profile?.handle;
        
        if (hasFinishedOnboarding && hasHandle) {
          router.replace("/(main)/dashboard");
        } else {
          // Resume from exactly where they left off
          const step = onboardingStep || "email";
          // Safety mapping: rename 'contact' to 'email' if needed, though we already renamed the file
          const route = step === "completed" ? "email" : step;
          router.replace(`/(onboarding)/${route}`);
        }
      } else {
        router.replace("/(auth)");
      }
    }
  }, [isAuthLoading, isProfileLoading, session, onboardingStep]);

  return <View style={{ flex: 1, backgroundColor: "#0A0A0F" }} />;
}
