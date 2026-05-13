import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

import { useAuthStore } from "@/stores/useAuthStore";
import { isBootstrapHandle, useProfileStore } from "@/stores/useProfileStore";

function profileNeedsEmail(email: string | null | undefined): boolean {
  const e = email?.trim();
  if (!e) return true;
  return e.endsWith("@bexo.local");
}

export default function RootIndex() {
  const session = useAuthStore((s) => s.session);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const profile = useProfileStore((s) => s.profile);
  const isProfileLoading = useProfileStore((s) => s.isLoading);
  const onboardingStep = useProfileStore((s) => s.onboardingStep);

  useEffect(() => {
    if (isAuthLoading || isProfileLoading) return;

    if (!session) {
      router.replace("/(auth)");
      return;
    }

    if (!profile) {
      router.replace("/(onboarding)/email");
      return;
    }

    if (profileNeedsEmail(profile.email)) {
      router.replace("/(onboarding)/email");
      return;
    }

    if (!profile.avatar_url?.trim()) {
      router.replace("/(onboarding)/photo");
      return;
    }

    if (!profile.handle?.trim() || isBootstrapHandle(profile.handle)) {
      router.replace("/(onboarding)/handle");
      return;
    }

    if (profile.handle && onboardingStep === "completed") {
      router.replace("/(main)/dashboard");
      return;
    }

    const routes: Record<string, string> = {
      email: "/(onboarding)/email",
      photo: "/(onboarding)/photo",
      handle: "/(onboarding)/handle",
      dob: "/(onboarding)/dob",
      resume: "/(onboarding)/resume",
      manual: "/(onboarding)/manual",
      about: "/(onboarding)/about",
      theme: "/(onboarding)/theme",
      font: "/(onboarding)/font",
      preference: "/(onboarding)/preference",
      generating: "/(onboarding)/generating",
    };

    const path = onboardingStep ? routes[onboardingStep] : undefined;
    if (path) {
      router.replace(path as Parameters<typeof router.replace>[0]);
      return;
    }

    router.replace("/(onboarding)/contact");
  }, [
    isAuthLoading,
    isProfileLoading,
    session,
    profile,
    profile?.email,
    profile?.avatar_url,
    profile?.handle,
    onboardingStep,
  ]);

  return <View style={{ flex: 1, backgroundColor: "#0A0A0F" }} />;
}
