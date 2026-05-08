import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

WebBrowser.maybeCompleteAuthSession();

const COUNTRY_CODES = [
  { code: "+1", flag: "US", label: "US +1" },
  { code: "+44", flag: "GB", label: "UK +44" },
  { code: "+91", flag: "IN", label: "IN +91" },
  { code: "+61", flag: "AU", label: "AU +61" },
  { code: "+49", flag: "DE", label: "DE +49" },
  { code: "+33", flag: "FR", label: "FR +33" },
  { code: "+81", flag: "JP", label: "JP +81" },
  { code: "+86", flag: "CN", label: "CN +86" },
  { code: "+55", flag: "BR", label: "BR +55" },
  { code: "+234", flag: "NG", label: "NG +234" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState("");

  const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

  const handleSendOTP = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number");
      return;
    }
    setError("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });
      if (err) throw err;
      setPhoneNumber(fullPhone);
      router.push("/(auth)/verify");
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "bexo://auth/callback" },
      });
      if (err) throw err;
      if (data.url) {
        await WebBrowser.openAuthSessionAsync(data.url, "bexo://");
      }
    } catch (e: any) {
      setError(e.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

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
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={["#7C6AFA", "#A06AFA"]}
              style={styles.logoBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoLetter}>B</Text>
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.foreground }]}>BEXO</Text>
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            Your portfolio,{"\n"}your identity.
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Build a stunning student portfolio in minutes. Share it anywhere.
          </Text>

          <View style={styles.form}>
            {/* Phone input */}
            <View style={[styles.phoneRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.countryBtn, { borderRightColor: colors.border }]}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
              >
                <Text style={[styles.countryText, { color: colors.foreground }]}>{countryCode}</Text>
                <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TextInput
                style={[styles.phoneInput, { color: colors.foreground }]}
                placeholder="Phone number"
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

            {/* Country picker */}
            {showCountryPicker && (
              <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {COUNTRY_CODES.map((c) => (
                  <TouchableOpacity
                    key={c.code + c.flag}
                    style={styles.pickerItem}
                    onPress={() => {
                      setCountryCode(c.code);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{c.label}</Text>
                    {countryCode === c.code && (
                      <Feather name="check" size={14} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {error ? (
              <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
            ) : null}

            <BexoButton label="Get OTP" onPress={handleSendOTP} loading={loading} />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.mutedForeground }]}>or continue with</Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <Text style={[styles.googleLabel, { color: colors.mutedForeground }]}>Signing in...</Text>
              ) : (
                <>
                  <Feather name="globe" size={18} color={colors.foreground} />
                  <Text style={[styles.googleLabel, { color: colors.foreground }]}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.terms, { color: colors.mutedForeground }]}>
            By continuing you agree to our Terms & Privacy Policy
          </Text>
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
    height: 300,
  },
  scroll: {
    paddingHorizontal: 28,
    gap: 20,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: "#fff", fontSize: 22, fontWeight: "800" },
  appName: { fontSize: 22, fontWeight: "800", letterSpacing: 3 },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  form: { gap: 12 },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    height: 52,
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
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  picker: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerLabel: { fontSize: 14 },
  error: { fontSize: 13, marginTop: -4 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  line: { flex: 1, height: 1 },
  orText: { fontSize: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleLabel: { fontSize: 15, fontWeight: "500" },
  terms: { fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: 8 },
});
