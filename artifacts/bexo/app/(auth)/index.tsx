import { AntDesign, Feather } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

WebBrowser.maybeCompleteAuthSession();

const COUNTRY_CODES = [
  { code: "+91", flag: "IN", label: "India (+91)" },
  { code: "+1", flag: "US", label: "US (+1)" },
  { code: "+44", flag: "GB", label: "UK (+44)" },
  { code: "+61", flag: "AU", label: "AU (+61)" },
  { code: "+49", flag: "DE", label: "DE (+49)" },
  { code: "+33", flag: "FR", label: "FR (+33)" },
  { code: "+81", flag: "JP", label: "JP (+81)" },
  { code: "+86", flag: "CN", label: "CN (+86)" },
  { code: "+55", flag: "BR", label: "BR (+55)" },
  { code: "+234", flag: "NG", label: "NG (+234)" },
];

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "680831158712-u8ncojq2dl3nreh28hddj6oac4e1b5v7.apps.googleusercontent.com";

function firstQueryParam(value: string | string[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

function parseHashParams(url: string) {
  const [, hash = ""] = url.split("#");
  return new URLSearchParams(hash);
}

async function completeGoogleOAuth(url: string) {
  const queryParams = Linking.parse(url).queryParams ?? {};
  const hashParams = parseHashParams(url);

  const errorDescription =
    firstQueryParam(queryParams.error_description) ??
    firstQueryParam(queryParams.error) ??
    hashParams.get("error_description") ??
    hashParams.get("error");

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const authCode = firstQueryParam(queryParams.code) ?? hashParams.get("code");
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) throw error;
    return;
  }

  const accessToken =
    firstQueryParam(queryParams.access_token) ?? hashParams.get("access_token");
  const refreshToken =
    firstQueryParam(queryParams.refresh_token) ?? hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  throw new Error("Google sign-in did not return a Supabase session.");
}



export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);
  const setOtpSentAt = useAuthStore((s) => s.setOtpSentAt);
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState("");
  const session = useAuthStore((s) => s.session);


  // Watch for Google OAuth completion
  useEffect(() => {
    if (session?.user) {
      const hasPhone = !!session.user.phone;
      const isGoogleLogin = session.user.app_metadata?.provider === "google";
      if (isGoogleLogin && !hasPhone) {
        router.replace("/(auth)/collect-phone");
      } else if (session) {
        router.replace("/(onboarding)/handle");
      }
    }
  }, [session]);

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
      const resp = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/phone-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: "send", phone: fullPhone }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Failed to send OTP");
      setPhoneNumber(fullPhone);
      setOtpSentAt(Date.now());
      router.push("/(auth)/verify");
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const redirectUri = Linking.createURL("auth/callback");

      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (err) throw err;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

        if (result.type === "success" && result.url) {
          await completeGoogleOAuth(result.url);
        }
      }
    } catch (e: any) {
      console.error("Google Sign-In Error:", e);
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
            <Modal
              visible={showCountryPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowCountryPicker(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowCountryPicker(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={[styles.pickerModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Country</Text>
                      <ScrollView>
                        {COUNTRY_CODES.map((c) => (
                          <TouchableOpacity
                            key={c.code + c.flag}
                            style={[
                              styles.pickerItem,
                              countryCode === c.code && { backgroundColor: colors.surface }
                            ]}
                            onPress={() => {
                              setCountryCode(c.code);
                              setShowCountryPicker(false);
                            }}
                          >
                            <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{c.label}</Text>
                            {countryCode === c.code && (
                              <Feather name="check" size={16} color={colors.primary} />
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
                  <AntDesign name="google" size={18} color={colors.foreground} />
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
    paddingVertical: 12,
    ...Platform.select({
      web: { boxShadow: "0 10px 20px rgba(0,0,0,0.3)" },
      default: {
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pickerLabel: { fontSize: 16, fontWeight: "500" },
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
