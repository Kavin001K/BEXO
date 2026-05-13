import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/apiConfig";
import { useAuthStore } from "@/stores/useAuthStore";

const COUNTRY_CODES = [
  { code: "+91",  label: "India (+91)" },
  { code: "+1",   label: "US (+1)" },
  { code: "+44",  label: "UK (+44)" },
  { code: "+61",  label: "AU (+61)" },
  { code: "+49",  label: "DE (+49)" },
  { code: "+33",  label: "FR (+33)" },
  { code: "+81",  label: "JP (+81)" },
  { code: "+86",  label: "CN (+86)" },
  { code: "+55",  label: "BR (+55)" },
  { code: "+234", label: "NG (+234)" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);
  const setOtpSentAt   = useAuthStore((s) => s.setOtpSentAt);
  const session        = useAuthStore((s) => s.session);
  const hasSeenWalkthrough = useAuthStore((s) => s.hasSeenWalkthrough);

  const [countryCode, setCountryCode]         = useState("+91");
  const [phone, setPhone]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError]                     = useState("");

  useEffect(() => {
    if (!hasSeenWalkthrough) {
      router.replace("/(auth)/walkthrough");
      return;
    }
    if (session?.user) {
      router.replace("/dashboard");
    }
  }, [session, hasSeenWalkthrough]);

  const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

  const handleSendOTP = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number");
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
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP via WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 20);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA18", "#FA6A6A08", "transparent"]}
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
            { paddingTop: topPad + 20, paddingBottom: bottomPad + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logoImage}
            />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(80).springify()}
            style={[styles.headline, { color: colors.foreground }]}
          >
            Your work deserves{"\n"}a beautiful home.
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(160).springify()}
            style={[styles.sub, { color: colors.mutedForeground }]}
          >
            Create a stunning portfolio in seconds. Show the world what you're capable of.
          </Animated.Text>

          {/* WhatsApp badge */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={[styles.whatsappBadge, { backgroundColor: "#25D366" + "18", borderColor: "#25D366" + "44" }]}
          >
            <View style={[styles.whatsappDot, { backgroundColor: "#25D366" }]} />
            <Text style={[styles.whatsappText, { color: "#25D366" }]}>
              Fast login with WhatsApp
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.form}>
            {/* Phone row */}
            <View
              style={[
                styles.phoneRow,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <TouchableOpacity
                style={[styles.countryBtn, { borderRightColor: colors.border }]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[styles.countryText, { color: colors.foreground }]}>
                  {countryCode}
                </Text>
                <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TextInput
                style={[styles.phoneInput, { color: colors.foreground }]}
                placeholder="Mobile number"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                returnKeyType="done"
                onSubmitEditing={handleSendOTP}
                selectionColor={colors.primary}
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
            </View>

            {/* Country picker modal */}
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
                      <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
                        Select Country
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
                            <Text style={[styles.pickerLabel, { color: colors.foreground }]}>
                              {c.label}
                            </Text>
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

            {error ? (
              <Animated.Text
                entering={FadeIn.duration(200)}
                style={[styles.error, { color: colors.accent }]}
              >
                {error}
              </Animated.Text>
            ) : null}

            <BexoButton label="Send me the code" onPress={handleSendOTP} loading={loading} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(360).springify()}
            style={[styles.terms, { color: colors.mutedForeground }]}
          >
            By continuing you agree to our Terms &amp; Privacy Policy
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 320 },
  scroll: { paddingHorizontal: 28, gap: 20 },
  logoWrap: { alignItems: "center", justifyContent: "center", marginBottom: 10 },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  headline: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 15, lineHeight: 22 },
  whatsappBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  whatsappDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  whatsappText: { fontSize: 13, fontWeight: "600" },
  form: { gap: 12 },
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
    fontSize: 15,
    height: "100%",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModal: {
    width: "100%",
    maxHeight: "60%",
    borderRadius: 24,
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
  error: { fontSize: 13 },
  terms: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
