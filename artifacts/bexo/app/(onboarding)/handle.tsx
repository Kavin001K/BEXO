import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { FormField } from "@/components/ui/FormField";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";
import { handleSchema } from "@/lib/profileFields";
import { sanitizeError } from "@/lib/errorUtils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

export default function HandleScreen() {
  const colors = useColors();
  const { user, collectedEmail, collectedPhone } = useAuthStore();
  const { createProfile, checkHandle, setOnboardingStep } = useProfileStore();

  const profile = useProfileStore((s) => s.profile);
  const [handle, setHandle] = useState(profile?.handle || "");
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "",
  );
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(profile?.handle ? true : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isManualHandle, setIsManualHandle] = useState(!!profile?.handle);

  const slug = handle.toLowerCase().replace(/[^a-z0-9-]/g, "");

  React.useEffect(() => {
    if (!isManualHandle && fullName && !handle) {
      const suggested = fullName.toLowerCase().split(" ")[0].replace(/[^a-z0-9-]/g, "");
      if (suggested.length >= 3) {
        setHandle(suggested);
        performCheck(suggested);
      }
    }
  }, [fullName, handle, isManualHandle]);

  const performCheck = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const isAvail = await checkHandle(clean);
    setAvailable(isAvail);
    setChecking(false);
  };

  const handleChange = (val: string) => {
    setIsManualHandle(true);
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setHandle(clean);
    setAvailable(null);
    if (clean.length >= 3) performCheck(clean);
  };

  const handleBack = () => {
    void tapLight();
    setOnboardingStep("photo");
    router.replace("/(onboarding)/photo");
  };

  const handleContinue = async () => {
    if (!user) return;
    const parsedHandle = handleSchema.safeParse(slug);
    if (!parsedHandle.success) {
      const msg = parsedHandle.error.errors[0]?.message ?? "Invalid handle";
      setError(msg);
      return;
    }
    if (!fullName.trim()) {
      setError("Enter your full name");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const isStillAvail = await checkHandle(slug);
      if (!isStillAvail) {
        throw new Error("Sorry, this handle was just taken. Please try another.");
      }

      await createProfile({
        user_id: user.id,
        handle: slug,
        full_name: fullName.trim(),
        email: collectedEmail || user.email || null,
        phone: collectedPhone || user.phone || null,
        email_verified: true,
      });

      setOnboardingStep("dob");
      router.push("/(onboarding)/dob");
    } catch (e: unknown) {
      let msg = sanitizeError(e);
      if (msg.includes("unique_handle") || msg.includes("already exists")) {
        msg = "This handle was just taken by someone else! Please try a different one.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBorderColor =
    available === false ? colors.destructive : available ? colors.primary : colors.border;

  return (
    <OnboardingShell
      stepKey="handle"
      title="Own your website"
      subtitle="This is where the world will find your work. Make it yours."
      onBack={handleBack}
      footer={
        <>
          <BexoButton
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!available || !fullName.trim()}
          />
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
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>Edit photo or email</Text>

      <FormField
        label="Full name"
        placeholder="Kavin"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
      />

      <View style={styles.handleBlock}>
        <Text style={[styles.handleLabel, { color: colors.foreground }]}>Site URL</Text>
        <View style={styles.handleRow}>
          <TextInput
            style={[
              styles.handleInput,
              {
                backgroundColor: colors.surface,
                borderColor: handleBorderColor,
                color: colors.foreground,
              },
            ]}
            placeholder="kavin"
            placeholderTextColor={colors.mutedForeground}
            value={handle}
            onChangeText={handleChange}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={colors.primary}
          />
          <View style={styles.statusIcon}>
            {checking ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : available === true ? (
              <Feather name="check-circle" size={18} color={colors.primary} />
            ) : available === false ? (
              <Feather name="x-circle" size={18} color={colors.destructive} />
            ) : null}
          </View>
        </View>
      </View>

      {slug.length >= 3 && (
        <View style={[styles.urlPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="link" size={14} color={colors.mutedForeground} />
          <Text style={[styles.urlText, { color: colors.primary }]}>{slug}.mybexo.com</Text>
        </View>
      )}

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 18, marginTop: -12 },
  handleBlock: { gap: 8 },
  handleLabel: { fontSize: 14, fontWeight: "600" },
  handleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  handleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  statusIcon: { width: 24, alignItems: "center" },
  urlPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  urlText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  error: { fontSize: 13, fontWeight: "500" },
  signOutBtn: { paddingVertical: 12, alignItems: "center" },
  signOutText: { fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
});
