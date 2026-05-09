import { AntDesign, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

WebBrowser.maybeCompleteAuthSession();

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1",  label: "US (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+49", label: "DE (+49)" },
  { code: "+33", label: "FR (+33)" },
  { code: "+81", label: "JP (+81)" },
  { code: "+86", label: "CN (+86)" },
  { code: "+55", label: "BR (+55)" },
  { code: "+234",label: "NG (+234)" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const setPhoneNumber = useAuthStore((s) => s.setPhoneNumber);
  const setOtpSentAt  = useAuthStore((s) => s.setOtpSentAt);
  const session       = useAuthStore((s) => s.session);

  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError]             = useState("");

  // Google button press scale
  const googleScale = useSharedValue(1);
  const googleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: googleScale.value }],
  }));

  // Navigate when session arrives — dashboard handles all routing decisions
  useEffect(() => {
    if (session?.user) {
      router.replace("/(main)/dashboard");
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

  // Google sign-in via Supabase OAuth (server-side callback properly configured)
  // Native: WebBrowser + exp:// redirect (covered by exp://** in Supabase URL config)
  // Web: full-page redirect to Google → Supabase handles callback → redirects to app
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      if (Platform.OS !== "web") {
        // Native (Expo Go): deep-link redirect captured by WebBrowser
        const redirectUrl = Linking.createURL("auth/callback");
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
        });
        if (oauthErr) throw oauthErr;
        if (!data?.url) throw new Error("No OAuth URL returned");

        console.log("OAuth URL generated:", data.url);

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === "success" && result.url) {
          const parsed = Linking.parse(result.url);
          const code = parsed.queryParams?.code as string | undefined;
          if (code) {
            const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchErr) throw exchErr;
          }
        }
        // session change triggers routing via useEffect above
        setGoogleLoading(false);
      } else {
        // Web: let Supabase do a full-page redirect (simplest, most reliable)
        // Do NOT use skipBrowserRedirect: true on web — it causes COOP issues
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo:
              typeof window !== "undefined"
                ? window.location.origin + "/"
                : undefined,
          },
        });
        if (oauthErr) throw oauthErr;
        // Page will navigate away — session is picked up by detectSessionInUrl: true
      }
    } catch (e: any) {
      setError(e.message ?? "Google sign-in failed. Try again.");
      setGoogleLoading(false);
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
            <Text style={[styles.appName, { color: colors.foreground }]}>BEXO</Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(80).springify()}
            style={[styles.headline, { color: colors.foreground }]}
          >
            Your portfolio,{"\n"}your identity.
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(160).springify()}
            style={[styles.sub, { color: colors.mutedForeground }]}
          >
            Build a stunning student portfolio in minutes. Share it anywhere.
          </Animated.Text>

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

            <BexoButton label="Get OTP on WhatsApp" onPress={handleSendOTP} loading={loading} />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.mutedForeground }]}>or</Text>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google button */}
            <Animated.View style={googleAnimStyle}>
              <TouchableOpacity
                style={[
                  styles.googleBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: googleLoading ? 0.6 : 1,
                  },
                ]}
                onPress={handleGoogleSignIn}
                onPressIn={() => {
                  googleScale.value = withSpring(0.96, { stiffness: 400, damping: 20 });
                }}
                onPressOut={() => {
                  googleScale.value = withSpring(1, { stiffness: 400, damping: 20 });
                }}
                disabled={googleLoading}
                activeOpacity={1}
              >
                {googleLoading ? (
                  <Text style={[styles.googleLabel, { color: colors.mutedForeground }]}>
                    Signing in…
                  </Text>
                ) : (
                  <>
                    <AntDesign name="google" size={18} color={colors.foreground} />
                    <Text style={[styles.googleLabel, { color: colors.foreground }]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
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
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  appName: { fontSize: 22, fontWeight: "800", letterSpacing: 3 },
  headline: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 15, lineHeight: 22 },
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
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  divLine: { flex: 1, height: 1 },
  orText: { fontSize: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleLabel: { fontSize: 15, fontWeight: "600" },
  terms: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
