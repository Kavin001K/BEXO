import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import {
  buildFullPhone,
  COUNTRY_CODES,
  isValidNationalNumber,
  normalizePhoneInput,
} from "@/lib/phoneNormalize";
import { useAuthStore } from "@/stores/useAuthStore";

export default function LoginScreen() {
  const colors = useColors();
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);
  const setOtpSentAt = useAuthStore((s) => s.setOtpSentAt);
  const session = useAuthStore((s) => s.session);
  const hasSeenWalkthrough = useAuthStore((s) => s.hasSeenWalkthrough);
  const dataConsentAccepted = useAuthStore((s) => s.dataConsentAccepted);
  const setDataConsentAccepted = useAuthStore((s) => s.setDataConsentAccepted);

  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasSeenWalkthrough) {
      router.replace("/(auth)/walkthrough");
      return;
    }
    if (session?.user) {
      router.replace("/dashboard");
    }
  }, [session, hasSeenWalkthrough]);

  const fullPhone = buildFullPhone(countryCode, phone);

  const handlePhoneChange = (text: string) => {
    const normalized = normalizePhoneInput(text, countryCode, phone);
    setPhone(normalized);
    if (error) setError("");
  };

  const handleSendOTP = async () => {
    if (!isValidNationalNumber(phone, countryCode)) {
      setError("Enter a valid phone number");
      return;
    }
    if (!dataConsentAccepted) {
      setError("Please accept the data processing notice to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const resp = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: fullPhone }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Failed to send OTP");
      setPhoneNumber(fullPhone);
      setOtpSentAt(Date.now());
      router.push("/(auth)/verify");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send OTP via WhatsApp";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell>
      <Animated.View entering={FadeIn.duration(600)} style={styles.logoWrap}>
        <Image source={require("../../assets/images/icon.png")} style={styles.logoImage} />
      </Animated.View>

      <ScreenHeader
        title={"Your work deserves\na beautiful home."}
        subtitle="Create a stunning portfolio in seconds. Show the world what you're capable of."
      />

      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={[styles.whatsappBadge, { backgroundColor: "#25D36614", borderColor: "#25D36633" }]}
      >
        <View style={[styles.whatsappDot, { backgroundColor: "#25D366" }]} />
        <Text style={[styles.whatsappText, { color: "#1B7A4A" }]}>Fast login with WhatsApp</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.form}>
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Mobile number</Text>
          <View
            style={[
              styles.phoneRow,
              { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.surface },
            ]}
          >
            <TouchableOpacity
              style={[styles.countryBtn, { borderRightColor: colors.border }]}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={[styles.countryText, { color: colors.foreground }]}>{countryCode}</Text>
              <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground }]}
              placeholder="Your number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              returnKeyType="done"
              onSubmitEditing={handleSendOTP}
              selectionColor={colors.primary}
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </View>
          {error ? (
            <Text style={[styles.fieldError, { color: colors.destructive }]}>{error}</Text>
          ) : null}
        </View>

        <Modal
          visible={showCountryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowCountryPicker(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.pickerModal,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
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
                          countryCode === c.code && { backgroundColor: colors.surface },
                        ]}
                        onPress={() => {
                          setCountryCode(c.code);
                          setShowCountryPicker(false);
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
            . Required before we send an OTP.
          </Text>
        </TouchableOpacity>

        <BexoButton label="Send me the code" onPress={handleSendOTP} loading={loading} />
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "center", marginBottom: 8 },
  logoImage: { width: 72, height: 72, borderRadius: 18 },
  whatsappBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  whatsappDot: { width: 8, height: 8, borderRadius: 4 },
  whatsappText: { fontSize: 13, fontWeight: "600" },
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
});
