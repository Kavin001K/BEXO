import { Feather } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BexoButton } from "@/components/ui/BexoButton";
import { OTPInput, type OTPInputRef } from "@/components/ui/OTPInput";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/apiConfig";
import { success, tapMedium } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { sanitizeError } from "@/lib/errorUtils";

const OTP_LENGTH = 4;
const OTP_EXPIRY_SECS = 10 * 60;

export default function VerifyScreen() {
  const colors = useColors();
  const { phoneNumber, otpSentAt, setOtpSentAt, getOtpRemainingSeconds } = useAuthStore();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(OTP_EXPIRY_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRef = useRef<OTPInputRef>(null);
  const prevCodeLenRef = useRef(0);
  const autoVerifyRef = useRef(false);

  useEffect(() => {
    const diff = getOtpRemainingSeconds();
    setRemaining(diff);

    if (diff <= 0) return;

    timerRef.current = setInterval(() => {
      const currentRemaining = getOtpRemainingSeconds();
      setRemaining(currentRemaining);
      if (currentRemaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [otpSentAt, getOtpRemainingSeconds]);

  const expired = remaining <= 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleVerify = useCallback(async () => {
    if (code.length < OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    if (expired) {
      setError("This OTP has expired. Request a new one.");
      return;
    }
    setError("");
    setLoading(true);

    await tapMedium();

    try {
      const resp = await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: phoneNumber, code }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Invalid code. Try again.");

      const { access_token, refresh_token, user } = result as {
        access_token: string;
        refresh_token: string;
        user?: { id: string };
      };
      if (!user?.id) throw new Error("Invalid server response: missing user");

      const { error: sessionErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionErr) throw sessionErr;

      const authState = useAuthStore.getState();
      if (authState.dataConsentAccepted) {
        const ts = new Date().toISOString();
        const { error: consentErr } = await supabase
          .from("profiles")
          .update({ consent_accepted_at: ts })
          .eq("user_id", user.id);
        if (consentErr) console.warn("[Verify] consent_accepted_at update:", consentErr.message);
        authState.setDataConsentAccepted(false);
      }

      const profileStore = useProfileStore.getState();
      await profileStore.fetchProfile(user.id);

      profileStore.syncOnboardingStepFromData();
      const gateComplete = profileStore.isOnboardingGateComplete();

      if (!gateComplete) {
        let step = useProfileStore.getState().onboardingStep;
        if (step === "completed") step = "email";
        const segment = step === "manual_review" ? "manual-review" : step;
        router.replace(`/(onboarding)/${segment}` as Href);
      } else {
        profileStore.setOnboardingStep("completed");
        router.replace("/(main)/(tabs)/dashboard");
      }
    } catch (e: unknown) {
      setError(sanitizeError(e));
    } finally {
      setLoading(false);
    }
  }, [code, expired, phoneNumber]);

  useEffect(() => {
    const justFilled =
      code.length === OTP_LENGTH && prevCodeLenRef.current < OTP_LENGTH;
    prevCodeLenRef.current = code.length;

    if (!justFilled || loading || expired || autoVerifyRef.current) return;

    autoVerifyRef.current = true;
    void handleVerify().finally(() => {
      autoVerifyRef.current = false;
    });
  }, [code, loading, expired, handleVerify]);

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    setError("");
    setCode("");
    otpRef.current?.reset();
    try {
      const resp = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Could not resend OTP");

      setOtpSentAt(Date.now());
      await success();
    } catch (e: unknown) {
      setError(sanitizeError(e));
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = phoneNumber
    ? phoneNumber.slice(0, 4) + "••••" + phoneNumber.slice(-3)
    : "your number";

  return (
    <ScreenShell>
      <ScreenHeader
        showBack
        onBack={() => router.back()}
        title="Check your WhatsApp"
        subtitle={`We sent a ${OTP_LENGTH}-digit code to ${maskedPhone}.`}
      />

      <View style={[styles.whatsAppRow, { backgroundColor: "#25D36614", borderColor: "#25D36633" }]}>
        <Feather name="message-circle" size={18} color="#25D366" />
        <Text style={[styles.whatsAppText, { color: "#1B7A4A" }]}>
          Code arrives in WhatsApp. You can paste all 4 digits at once.
        </Text>
      </View>

      <View
        style={[
          styles.timerRow,
          {
            backgroundColor: expired ? colors.destructive + "14" : colors.primary + "12",
            borderColor: expired ? colors.destructive + "33" : colors.primary + "33",
          },
        ]}
      >
        <Feather
          name={expired ? "alert-circle" : "clock"}
          size={14}
          color={expired ? colors.destructive : colors.primary}
        />
        <Text
          style={[
            styles.timerText,
            { color: expired ? colors.destructive : colors.primary },
          ]}
        >
          {expired ? "Code expired" : `Expires in ${formatTime(remaining)}`}
        </Text>
      </View>

      <View style={styles.otpWrap}>
        <OTPInput
          ref={otpRef}
          length={OTP_LENGTH}
          onComplete={(c) => setCode(c)}
          onCodeChange={(c) => {
            setCode(c);
            if (error) setError("");
          }}
          autoFocus
          hasError={!!error}
        />
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}

      <BexoButton
        label={loading ? "Verifying…" : "Verify & Continue"}
        onPress={handleVerify}
        loading={loading}
        disabled={code.length < OTP_LENGTH || expired}
      />

      <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resend}>
        <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
          {resending ? "Sending…" : "Didn't receive it? "}
          {!resending && (
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Resend via WhatsApp</Text>
          )}
        </Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  whatsAppRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  whatsAppText: { fontSize: 13, fontWeight: "600" },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  timerText: { fontSize: 12, fontWeight: "600" },
  otpWrap: { marginVertical: 12 },
  error: { fontSize: 13, textAlign: "center", marginBottom: 8 },
  resend: { alignItems: "center", marginTop: 8 },
  resendText: { fontSize: 14 },
});
