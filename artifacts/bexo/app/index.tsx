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
        const hasFinishedOnboarding =
          onboardingStep === "completed" ||
          useProfileStore.getState().isOnboardingGateComplete();

        if (hasFinishedOnboarding) {
          if (onboardingStep !== "completed") {
            useProfileStore.getState().setOnboardingStep("completed");
          }
          router.replace("/(main)/(tabs)/dashboard");
        } else {
          // Resume from exactly where they left off
          const step = onboardingStep || "email";
          const route = step === "manual_review" ? "manual-review" : step;
          router.replace(`/(onboarding)/${route}`);
        }
      } else {
        router.replace("/(auth)");
      }
    }
  }, [isAuthLoading, isProfileLoading, session, onboardingStep]);

  return <View style={{ flex: 1, backgroundColor: "#F7F5F0" }} />;
}
