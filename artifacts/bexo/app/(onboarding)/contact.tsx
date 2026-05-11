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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { sanitizeError } from "@/lib/errorUtils";

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setCollectedEmail, setCollectedPhone } = useAuthStore();
  const setOnboardingStep = useProfileStore((s) => s.setOnboardingStep);

  const needsPhone = !!user?.email && !user?.phone;
  const needsEmail = !!user?.phone && !user?.email;
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If user already has both, skip to next
  useEffect(() => {
    if (user?.email && user?.phone) {
      handleSuccess();
    }
  }, [user]);

  const handleSuccess = () => {
    setOnboardingStep("photo");
    router.push("/(onboarding)/photo");
  };

  const validate = () => {
    if (!value.trim()) {
      setError(`Please enter your ${needsPhone ? "phone number" : "email address"}`);
      return false;
    }
    if (needsPhone) {
      // Basic phone regex
      if (!/^\+?[1-9]\d{1,14}$/.test(value.trim().replace(/\s/g, ""))) {
        setError("Please enter a valid phone number with country code (e.g. +1...)");
        return false;
      }
    } else {
      // Email regex
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        setError("Please enter a valid email address");
        return false;
      }
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setError("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const cleanValue = value.trim();
      const column = needsPhone ? "phone" : "email";

      // 1. Check uniqueness in profiles table
      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq(column, cleanValue)
        .neq("user_id", user?.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error(`This ${column} is already linked to another BEXO account. Please use a different one.`);
      }

      // 2. Save to store for persistence during onboarding
      if (needsPhone) {
        setCollectedPhone(cleanValue);
      } else {
        setCollectedEmail(cleanValue);
      }

      // 3. Create/Update profile record
      const payload: any = {
        user_id: user?.id,
        [column]: cleanValue,
      };
      
      // Ensure we don't overwrite if profile exists
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (upsertError) throw upsertError;

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
        colors={[isGoogle ? "#6AFAFA18" : "#FA6AFA18", "transparent"]}
        style={styles.glow}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 60,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary, width: 30 }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            {isGoogle ? "Verify your phone" : "Verify your email"}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {isGoogle 
              ? "We need your phone number to secure your account and send important updates."
              : "We need your email to send you your portfolio analytics and career opportunities."}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              {isGoogle ? "Phone Number" : "Email Address"}
            </Text>
            <View style={styles.inputContainer}>
              <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                <Feather 
                  name={needsPhone ? "phone" : "mail"} 
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
                placeholder={needsPhone ? "+1 234 567 8900" : "you@example.com"}
                placeholderTextColor={colors.mutedForeground}
                value={value}
                onChangeText={(t) => { setValue(t); setError(""); }}
                keyboardType={needsPhone ? "phone-pad" : "email-address"}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
});
