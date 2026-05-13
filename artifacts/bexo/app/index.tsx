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
        const isEmailVerified = profile?.email_verified || false;
        
        if (onboardingStep === "completed") {
          router.replace("/(main)/dashboard");
        } else if (!isEmailVerified || onboardingStep === "email") {
          router.replace("/(onboarding)/contact");
        } else {
          // Map remaining steps
          const stepRoutes: Record<string, string> = {
            photo: "/(onboarding)/photo",
            handle: "/(onboarding)/handle",
            dob: "/(onboarding)/dob",
            resume: "/(onboarding)/resume",
            manual: "/(onboarding)/manual",
            theme: "/(onboarding)/theme",
            font: "/(onboarding)/font",
            preference: "/(onboarding)/preference",
            generating: "/(onboarding)/generating",
          };
          
          const targetRoute = stepRoutes[onboardingStep] || "/(onboarding)/handle";
          router.replace(targetRoute as any);
        }
      } else {
        router.replace("/(auth)");
      }
    }
  }, [isAuthLoading, isProfileLoading, session, onboardingStep, profile?.email_verified]);

  return <View style={{ flex: 1, backgroundColor: "#0A0A0F" }} />;
}
