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
        if (onboardingStep === "completed") {
          router.replace("/(main)/dashboard");
        } else {
          // Always start onboarding at the contact screen to ensure 
          // email collection/verification is the first thing they see.
          router.replace("/(onboarding)/contact");
        }
      } else {
        router.replace("/(auth)");
      }
    }
  }, [isAuthLoading, isProfileLoading, session, onboardingStep]);

  return <View style={{ flex: 1, backgroundColor: "#0A0A0F" }} />;
}
