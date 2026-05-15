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
        const isComplete = useProfileStore.getState().isProfileComplete();
        const hasFinishedOnboarding = onboardingStep === "completed" && isComplete;
        
        if (hasFinishedOnboarding) {
          router.replace("/(main)/(tabs)/dashboard");
        } else {
          // Resume from exactly where they left off
          const step = onboardingStep || "email";
          // Safety mapping: rename 'manual_review' to 'manual-review' for route consistency
          const route = step === "completed" ? "email" : step === "manual_review" ? "manual-review" : step;
          router.replace(`/(onboarding)/${route}`);
        }
      } else {
        router.replace("/(auth)");
      }
    }
  }, [isAuthLoading, isProfileLoading, session, onboardingStep]);

  return <View style={{ flex: 1, backgroundColor: "#0A0A0F" }} />;
}
