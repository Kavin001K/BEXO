import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { OTPInput } from "@/components/ui/OTPInput";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (code.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: "sms",
      });
      if (err) throw err;
      // Auth state listener in _layout will handle navigation
    } catch (e: any) {
      setError(e.message ?? "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });
      if (err) throw err;
    } catch (e: any) {
      setError(e.message ?? "Could not resend");
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = phoneNumber
    ? phoneNumber.slice(0, 4) + "••••" + phoneNumber.slice(-3)
    : "your phone";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>

          <View style={[styles.iconBadge, { backgroundColor: colors.surface }]}>
            <Text style={styles.iconEmoji}>
              <Text style={{ fontSize: 32 }}>💬</Text>
            </Text>
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            Check your messages
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            We sent a 6-digit code to{" "}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {maskedPhone}
            </Text>
          </Text>

          <OTPInput
            length={6}
            onComplete={(c) => setCode(c)}
            onCodeChange={(c) => setCode(c)}
          />

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <BexoButton
            label="Verify & Continue"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length < 6}
          />

          <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resend}>
            <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
              {resending ? "Sending..." : "Didn't get it? "}
              {!resending && (
                <Text style={{ color: colors.primary, fontWeight: "600" }}>Resend</Text>
              )}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  scroll: {
    paddingHorizontal: 28,
    gap: 20,
    alignItems: "stretch",
  },
  back: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: "500" },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  iconEmoji: {},
  headline: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 15, lineHeight: 22 },
  error: { fontSize: 13, textAlign: "center" },
  resend: { alignItems: "center" },
  resendText: { fontSize: 14 },
});
