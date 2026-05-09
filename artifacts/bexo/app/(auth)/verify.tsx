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
import { apiFetch } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECS = 10 * 60;

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { phoneNumber, otpSentAt, setOtpSentAt, isOtpExpired, getOtpRemainingSeconds } =
    useAuthStore();

  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]       = useState("");
  const [remaining, setRemaining] = useState(OTP_EXPIRY_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      const secs = getOtpRemainingSeconds();
      setRemaining(secs);
      if (secs <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
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
      setError(`Enter the ${OTP_LENGTH}-digit code`);
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
      const resp = await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: phoneNumber, code }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Invalid code. Try again.");

      const { access_token, refresh_token } = result;
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionErr) throw sessionErr;

      // Auth state listener in useAuthStore handles navigation
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
      const resp = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Could not resend OTP");
      setOtpSentAt(Date.now());
      setRemaining(OTP_EXPIRY_SECS);
    } catch (e: any) {
      setError(e.message ?? "Could not resend OTP");
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = phoneNumber
    ? phoneNumber.slice(0, 4) + "••••" + phoneNumber.slice(-3)
    : "your number";

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 20);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

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
            { paddingTop: topPad, paddingBottom: bottomPad + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Feather name="arrow-left" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* WhatsApp icon badge */}
          <View style={[styles.iconBadge, { backgroundColor: "#25D36622" }]}>
            <Feather name="message-circle" size={32} color="#25D366" />
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            WhatsApp OTP
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            We sent a {OTP_LENGTH}-digit code to your WhatsApp at{" "}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {maskedPhone}
            </Text>
          </Text>

          {/* Countdown */}
          <View
            style={[
              styles.timerRow,
              { backgroundColor: expired ? "#FA6A6A18" : "#25D36618" },
            ]}
          >
            <Feather
              name={expired ? "alert-circle" : "clock"}
              size={14}
              color={expired ? "#FA6A6A" : "#25D366"}
            />
            <Text
              style={[styles.timerText, { color: expired ? "#FA6A6A" : "#25D366" }]}
            >
              {expired ? "Code expired" : `Expires in ${formatTime(remaining)}`}
            </Text>
          </View>

          <OTPInput
            length={OTP_LENGTH}
            onComplete={(c) => setCode(c)}
            onCodeChange={(c) => setCode(c)}
          />

          {error ? (
            <Text style={[styles.error, { color: "#FA6A6A" }]}>{error}</Text>
          ) : null}

          <BexoButton
            label={loading ? "Verifying…" : "Verify & Continue"}
            onPress={handleVerify}
            loading={loading}
            disabled={code.length < OTP_LENGTH || expired}
          />

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending}
            style={styles.resend}
          >
            <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
              {resending
                ? "Sending…"
                : "Didn't receive it? "}
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
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 250 },
  scroll: { paddingHorizontal: 28, gap: 20, alignItems: "stretch" },
  back: { alignSelf: "flex-start" },
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
