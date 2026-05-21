import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { FormField } from "@/components/ui/FormField";
import { useColors } from "@/hooks/useColors";
import { tapMedium } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { sanitizeError } from "@/lib/errorUtils";

export default function EmailScreen() {
  const colors = useColors();
  const { user, setCollectedEmail, collectedEmail } = useAuthStore();
  const setOnboardingStep = useProfileStore((s) => s.setOnboardingStep);

  const profile = useProfileStore((s) => s.profile);
  const [value, setValue] = useState(profile?.email || collectedEmail || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ((profile?.email || collectedEmail) && !value) {
      setValue(profile?.email || collectedEmail || "");
    }
  }, [profile?.email, collectedEmail, value]);

  const handleSuccess = () => {
    setOnboardingStep("photo");
    router.push("/(onboarding)/photo");
  };

  const validate = () => {
    if (!value.trim()) {
      setError("Please enter your email address");
      return false;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) {
      setError("Please enter a valid email address (e.g., name@example.com)");
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setError("");
    setLoading(true);

    await tapMedium();

    try {
      const cleanValue = value.trim();

      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", cleanValue)
        .neq("user_id", user?.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error("This email is already linked to another BEXO account. Please use a different one.");
      }

      setCollectedEmail(cleanValue);
      handleSuccess();
    } catch (e: unknown) {
      setError(sanitizeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      stepKey="email"
      title="What's your email?"
      subtitle="We'll use this to send you important updates about your website."
      footer={
        <>
          <BexoButton label="Continue" onPress={handleContinue} loading={loading} />
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => useAuthStore.getState().signOut()}
          >
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>
              Sign out & start fresh
            </Text>
          </TouchableOpacity>
        </>
      }
    >
      <FormField
        label="Email address"
        placeholder="you@example.com"
        value={value}
        onChangeText={(t) => {
          setValue(t);
          setError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={error || undefined}
        helper="Step 1 of 4: contact verification"
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  signOutBtn: { paddingVertical: 12, alignItems: "center" },
  signOutText: { fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
});
