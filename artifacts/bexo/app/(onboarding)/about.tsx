import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { FormField } from "@/components/ui/FormField";
import { useColors } from "@/hooks/useColors";
import { error as hapticError, tapMedium } from "@/lib/haptics";
import { useProfileStore } from "@/stores/useProfileStore";

export default function AboutScreen() {
  const colors = useColors();
  const { profile, updateProfile, setOnboardingStep } = useProfileStore();

  const [bio, setBio] = useState(profile?.bio || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!bio || bio.length < 20) {
      setError("Please tell us a bit more about yourself (min 20 characters)");
      await hapticError();
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateProfile({ bio });
      await tapMedium();
      setOnboardingStep("theme");
      router.push("/(onboarding)/theme");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      await hapticError();
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    setOnboardingStep("theme");
    router.push("/(onboarding)/theme");
  };

  return (
    <OnboardingShell
      stepKey="about"
      title="Tell us about yourself"
      subtitle="Share what you want the world to know — your passion, goals, or a fun fact."
      footer={
        <>
          <BexoButton label="Continue" onPress={handleContinue} loading={loading} />
          <TouchableOpacity style={styles.skipBtn} onPress={skip}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip for now</Text>
          </TouchableOpacity>
        </>
      }
    >
      <FormField
        label="Bio"
        placeholder="I'm a designer who loves building minimalist interfaces..."
        value={bio}
        onChangeText={(t) => {
          setBio(t);
          setError("");
        }}
        multiline
        numberOfLines={6}
        error={error || undefined}
        style={styles.textarea}
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  textarea: { minHeight: 160, textAlignVertical: "top" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
