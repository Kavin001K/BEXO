import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Linking,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { BexoButton } from "@/components/ui/BexoButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/apiConfig";
import { sanitizeError } from "@/lib/errorUtils";
import {
  buildFullPhone,
  COUNTRY_CODES,
  isValidNationalNumber,
  normalizePhoneInput,
} from "@/lib/phoneNormalize";
import { useAuthStore } from "@/stores/useAuthStore";

export default function CollectPhoneScreen() {
  const colors = useColors();
  const { setCollectedPhone, dataConsentAccepted, setDataConsentAccepted } = useAuthStore();
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((c) => Math.max(0, c - 1));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const fullPhone = buildFullPhone(countryCode, phone);

  const handlePhoneChange = (text: string) => {
    const normalized = normalizePhoneInput(text, countryCode, phone);
    setPhone(normalized);
    if (error) setError("");
  };

  const handleContinue = async () => {
    if (!isValidNationalNumber(phone, countryCode)) {
      setError("Enter a valid phone number");
      return;
    }
    if (!dataConsentAccepted) {
      setError("Please accept the data processing notice to continue.");
      return;
    }
    if (cooldown > 0) return;

    setError("");
    setLoading(true);
    try {
      const resp = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: fullPhone }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Failed to send OTP");

      setCollectedPhone(fullPhone);
      setCooldown(30);
      router.push("/(auth)/verify");
    } catch (e: unknown) {
      setError(sanitizeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell>
      <Animated.View entering={FadeIn.duration(500)} style={styles.logoWrap}>
        <View style={[styles.iconBadge, { backgroundColor: colors.secondary }]}>
          <Feather name="smartphone" size={28} color={colors.primary} />
        </View>
      </Animated.View>

      <ScreenHeader
        title="What's your phone number?"
        subtitle="We'll use this to send you portfolio updates and login codes."
      />

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Mobile number</Text>
          <View
            style={[
              styles.phoneRow,
              {
                borderColor: error ? colors.destructive : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.countryBtn, { borderRightColor: colors.border }]}
              onPress={() => setShowPicker(true)}
            >
              <Text style={[styles.countryText, { color: colors.foreground }]}>{countryCode}</Text>
              <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground }]}
              placeholder="Phone number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              selectionColor={colors.primary}
              autoFocus
            />
          </View>
          {error ? (
            <Text style={[styles.fieldError, { color: colors.destructive }]}>{error}</Text>
          ) : null}
        </View>

        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View
                  style={[styles.pickerModal, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.pickerTitle, { color: colors.foreground, fontFamily: fonts.sansBold }]}>
                    Select country
                  </Text>
                  <ScrollView>
                    {COUNTRY_CODES.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={[
                          styles.pickerItem,
                          countryCode === c.code && { backgroundColor: colors.secondary },
                        ]}
                        onPress={() => {
                          setCountryCode(c.code);
                          setShowPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{c.label}</Text>
                        {countryCode === c.code && (
                          <Feather name="check" size={15} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setDataConsentAccepted(!dataConsentAccepted)}
          activeOpacity={0.85}
        >
          <Feather
            name={dataConsentAccepted ? "check-square" : "square"}
            size={22}
            color={dataConsentAccepted ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.consentText, { color: colors.mutedForeground }]}>
            I agree to BEXO processing my phone number and profile data as described in the{" "}
            <Text
              style={{ color: colors.primary, fontWeight: "700" }}
              onPress={() => Linking.openURL("https://mybexo.com/privacy")}
            >
              Privacy Notice
            </Text>{" "}
            and{" "}
            <Text
              style={{ color: colors.primary, fontWeight: "700" }}
              onPress={() => Linking.openURL("https://mybexo.com/terms")}
            >
              Terms
            </Text>
            .
          </Text>
        </TouchableOpacity>

        <BexoButton
          label={cooldown > 0 ? `Resend in ${cooldown}s` : loading ? "Sending…" : "Send OTP on WhatsApp"}
          onPress={handleContinue}
          loading={loading}
          disabled={cooldown > 0}
          icon={cooldown === 0 ? <Feather name="arrow-right" size={16} color="#fff" /> : undefined}
        />

        <TouchableOpacity onPress={() => router.replace("/dashboard")} style={styles.skipWrap}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "flex-start", marginBottom: 4 },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: 16, marginTop: 4 },
  fieldBlock: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    height: 54,
    overflow: "hidden",
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    height: "100%",
    borderRightWidth: 1,
  },
  countryText: { fontSize: 14, fontWeight: "600" },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    height: "100%",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  fieldError: { fontSize: 13, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModal: {
    width: "100%",
    maxHeight: "60%",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pickerLabel: { fontSize: 15, fontWeight: "500" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  consentText: { flex: 1, fontSize: 13, lineHeight: 20 },
  skipWrap: { alignItems: "center", paddingVertical: 8 },
  skip: { fontSize: 14, fontWeight: "500" },
});
