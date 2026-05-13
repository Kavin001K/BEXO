import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { sanitizeError } from "@/lib/errorUtils";

export default function EmailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setCollectedEmail, collectedEmail } = useAuthStore();
  const setOnboardingStep = useProfileStore((s) => s.setOnboardingStep);

  const [value, setValue] = useState(collectedEmail || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync state if store changes (e.g., navigating back)
  useEffect(() => {
    if (collectedEmail && !value) {
      setValue(collectedEmail);
    }
  }, [collectedEmail]);

  const handleSuccess = () => {
    setOnboardingStep("photo");
    router.push("/(onboarding)/photo");
  };

  const validate = () => {
    if (!value.trim()) {
      setError("Please enter your email address");
      return false;
    }
    // Improved email regex for better validation
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
    
    // Safe haptics call
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) { /* ignore */ }
    }

    try {
      const cleanValue = value.trim();

      // 1. Check uniqueness in profiles table (still important even if we don't save yet)
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

      // 2. SAVE TO STORE INSTEAD OF DB
      setCollectedEmail(cleanValue);

      handleSuccess();
    } catch (e: any) {
      setError(sanitizeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#FA6AFA18", "transparent"]}
        style={styles.glow}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.stepRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary, width: 30 }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          What's your email?
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          We'll use this to send you important updates about your website.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
            Email Address
          </Text>
          <View style={styles.inputContainer}>
            <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
              <Feather 
                name="mail" 
                size={18} 
                color={colors.primary} 
              />
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.accent : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={value}
              onChangeText={(t) => { setValue(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={colors.primary}
            />
          </View>
          {error ? (
            <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 20 }}>
          <BexoButton
            label="Continue"
            onPress={handleContinue}
            loading={loading}
          />
          <Text style={[styles.info, { color: colors.mutedForeground }]}>
            Step 1 of 4: Contact Verification
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.signOutBtn} 
          onPress={() => useAuthStore.getState().signOut()}
        >
          <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>
            Sign Out & Start Fresh
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  scroll: { paddingHorizontal: 30, gap: 20 },
  stepRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  dot: { height: 6, borderRadius: 3 },
  headline: { fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  sub: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  field: { gap: 10, marginTop: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  inputContainer: { flexDirection: "row", gap: 12 },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  input: {
    flex: 1,
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: { fontSize: 13, fontWeight: "500", marginLeft: 4 },
  info: { textAlign: "center", marginTop: 16, fontSize: 12, fontWeight: "600", opacity: 0.5 },
  signOutBtn: { marginTop: 20, paddingVertical: 12, alignItems: "center" },
  signOutText: { fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
});
