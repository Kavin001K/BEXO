import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const OTP_LENGTH = 4;
const OTP_EXPIRY_SECS = 10 * 60; // 10 minutes

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { phoneNumber, otpSentAt, setOtpSentAt, isOtpExpired, getOtpRemainingSeconds } = useAuthStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(OTP_EXPIRY_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const secs = getOtpRemainingSeconds();
      setRemaining(secs);
      if (secs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [otpSentAt]);

  const expired = remaining <= 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    if (code.length < OTP_LENGTH) {
      setError("Enter the 4-digit code");
      return;
    }
    if (isOtpExpired()) {
      setError("This OTP has expired. Request a new one.");
      return;
    }
    setError("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Verify OTP via edge function
      const resp = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/phone-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: "verify", phone: phoneNumber, code }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Verification failed");

      // Sign in with phone + OTP as password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        phone: phoneNumber,
        password: code,
      });
      if (signInErr) throw signInErr;

      router.replace("/(auth)/collect-email");
    } catch (e: any) {
      setError(e.message ?? "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setCode("");
    try {
      const resp = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/phone-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: "send", phone: phoneNumber }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Could not resend");
      setOtpSentAt(Date.now());
      setRemaining(OTP_EXPIRY_SECS);
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
        colors={["#25D36618", "transparent"]}
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

          <View style={[styles.iconBadge, { backgroundColor: "#25D36622" }]}>
            <Feather name="message-circle" size={32} color="#25D366" />
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            Check your WhatsApp
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            We sent a 4-digit code via WhatsApp to{" "}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {maskedPhone}
            </Text>
          </Text>

          {/* Timer */}
          <View style={[styles.timerRow, { backgroundColor: expired ? "#FA6A6A18" : "#25D36618" }]}>
            <Feather
              name={expired ? "alert-circle" : "clock"}
              size={14}
              color={expired ? "#FA6A6A" : "#25D366"}
            />
            <Text
              style={[styles.timerText, { color: expired ? "#FA6A6A" : "#25D366" }]}
            >
              {expired ? "OTP expired" : `Expires in ${formatTime(remaining)}`}
            </Text>
          </View>

          <OTPInput
            length={OTP_LENGTH}
            onComplete={(c) => setCode(c)}
            onCodeChange={(c) => setCode(c)}
          />

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <BexoButton
            label={loading ? "Verifying..." : "Verify & Continue"}
            onPress={handleVerify}
            loading={loading}
            disabled={code.length < OTP_LENGTH}
          />

          <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resend}>
            <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
              {resending ? "Sending..." : "Didn't get it? "}
              {!resending && (
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  Resend via WhatsApp
                </Text>
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
  headline: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 15, lineHeight: 22 },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  timerText: { fontSize: 12, fontWeight: "600" },
  error: { fontSize: 13, textAlign: "center" },
  resend: { alignItems: "center" },
  resendText: { fontSize: 14 },
});
