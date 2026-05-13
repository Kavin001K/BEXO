import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { apiFetch, readApiJson } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { showErrorAlert, sanitizeError } from "@/lib/errorUtils";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1",  label: "US (+1)"    },
  { code: "+44", label: "UK (+44)"   },
  { code: "+61", label: "AU (+61)"   },
];

export default function SettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const user    = useAuthStore((s) => s.user);
  const { profile, updateProfile } = useProfileStore();

  const provider     = user?.app_metadata?.provider ?? "email";
  const isGoogleUser = provider === "google";
  const isPhoneUser  = !isGoogleUser;

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [linkPhone, setLinkPhone]           = useState("");
  const [linkCC, setLinkCC]                 = useState("+91");
  const [phoneOtp, setPhoneOtp]             = useState("");
  const [phoneStep, setPhoneStep]           = useState<"input" | "otp">("input");
  const [linkLoading, setLinkLoading]       = useState(false);
  const [linkError, setLinkError]           = useState("");

  const isPlaceholder = profile?.email?.endsWith("@bexo.local");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [linkEmail, setLinkEmail]           = useState(isPlaceholder ? "" : (profile?.email ?? ""));
  const [emailLoading, setEmailLoading]     = useState(false);
  const [emailError, setEmailError]         = useState("");
  const [googleLoading, setGoogleLoading]   = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleSendPhoneOtp = async () => {
    const phone = `${linkCC}${linkPhone.replace(/\D/g, "")}`;
    if (linkPhone.replace(/\D/g, "").length < 7) {
      setLinkError("Enter a valid phone number"); return;
    }
    setLinkLoading(true); setLinkError("");
    try {
      const resp = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      const data = await readApiJson<{ error?: string }>(resp);
      if (!resp.ok) throw new Error(data.error ?? "Failed to send OTP");
      setPhoneStep("otp");
    } catch (e: any) {
      setLinkError(sanitizeError(e));
    } finally {
      setLinkLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const phone = `${linkCC}${linkPhone.replace(/\D/g, "")}`;
    setLinkLoading(true); setLinkError("");
    try {
      const resp = await apiFetch("/auth/link-phone", {
        method: "POST",
        body: JSON.stringify({ phone, code: phoneOtp, user_id: user!.id }),
      });
      const data = await readApiJson<{ error?: string }>(resp);
      if (!resp.ok) throw new Error(data.error ?? "Verification failed");

      await updateProfile({ phone, phone_verified: true });

      setShowPhoneModal(false);
      setPhoneStep("input");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Phone linked!", `${phone} is now linked to your account. You can now log in with WhatsApp OTP.`);
    } catch (e: any) {
      setLinkError(sanitizeError(e));
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    const email = linkEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address"); return;
    }
    setEmailLoading(true); setEmailError("");
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      await updateProfile({ email, email_verified: false });
      setShowEmailModal(false);
      Alert.alert(
        "Verification sent",
        `A confirmation link was sent to ${email}. Click it to verify your email.\n\nOnce verified, Google login will link to this account.`,
        [{ text: "Got it" }]
      );
    } catch (e: any) {
      setEmailError(sanitizeError(e));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setGoogleLoading(true);
    setEmailError("");
    try {
      if (Platform.OS !== "web") {
        const redirectUrl = Linking.createURL("auth/callback");
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
        });
        if (oauthErr) throw oauthErr;
        if (!data?.url) throw new Error("No OAuth URL returned");

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === "success" && result.url) {
          const parsed = Linking.parse(result.url);
          const code = parsed.queryParams?.code as string | undefined;
          if (code) {
            const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchErr) throw exchErr;
          }
        }
      } else {
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin + "/",
          },
        });
        if (oauthErr) throw oauthErr;
      }
      setShowEmailModal(false);
    } catch (e: any) {
      setEmailError(sanitizeError(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: signOut },
    ]);
  };

  const phoneStatus = profile?.phone_verified
    ? { icon: "check-circle" as const, color: "#6AFAD0", label: profile.phone ?? "Verified" }
    : profile?.phone
    ? { icon: "clock" as const, color: "#FAD06A", label: "Pending verification" }
    : { icon: "plus-circle" as const, color: colors.mutedForeground, label: "Not linked" };

  const emailStatus = profile?.email_verified
    ? { icon: "check-circle" as const, color: "#6AFAD0", label: profile.email ?? "Verified" }
    : !isPlaceholder && profile?.email
    ? { icon: "clock" as const, color: "#FAD06A", label: "Check your inbox" }
    : { icon: "plus-circle" as const, color: colors.mutedForeground, label: "Not linked" };

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      <View style={[S.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <Text style={[S.sectionLabel, { color: colors.mutedForeground }]}>IDENTITY</Text>
          <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={S.identityRow}>
              <View style={[S.identityIcon, { backgroundColor: isGoogleUser ? "#FA6A6A22" : "#25D36622" }]}>
                <Feather
                  name={isGoogleUser ? "mail" : "smartphone"}
                  size={16}
                  color={isGoogleUser ? "#FA6A6A" : "#25D366"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.identityLabel, { color: colors.foreground }]}>
                  {isGoogleUser ? "Google Account" : "WhatsApp Phone"}
                </Text>
                <Text style={[S.identityValue, { color: colors.mutedForeground }]}>
                  {isGoogleUser ? (user?.email ?? "Google user") : (profile?.phone ?? "Phone user")}
                </Text>
              </View>
              <View style={[S.verifiedBadge, { backgroundColor: "#6AFAD022" }]}>
                <Feather name="check" size={11} color="#6AFAD0" />
                <Text style={[S.verifiedText, { color: "#6AFAD0" }]}>Verified</Text>
              </View>
            </View>

            <View style={[S.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={S.identityRow}
              onPress={() => isGoogleUser ? setShowPhoneModal(true) : null}
              disabled={!isGoogleUser || !!profile?.phone_verified}
            >
              <View style={[S.identityIcon, { backgroundColor: "#25D36622" }]}>
                <Feather name="smartphone" size={16} color="#25D366" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.identityLabel, { color: colors.foreground }]}>WhatsApp / Phone</Text>
                <Text style={[S.identityValue, { color: phoneStatus.color }]}>
                  {phoneStatus.label}
                </Text>
              </View>
              {isGoogleUser && !profile?.phone_verified && (
                <Text style={[S.linkAction, { color: colors.primary }]}>Link →</Text>
              )}
              <Feather name={phoneStatus.icon} size={16} color={phoneStatus.color} />
            </TouchableOpacity>

            <View style={[S.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={S.identityRow}
              onPress={() => isPhoneUser ? setShowEmailModal(true) : null}
              disabled={!isPhoneUser || !!profile?.email_verified}
            >
              <View style={[S.identityIcon, { backgroundColor: "#7C6AFA22" }]}>
                <Feather name="mail" size={16} color="#7C6AFA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.identityLabel, { color: colors.foreground }]}>Email / Google</Text>
                <Text style={[S.identityValue, { color: emailStatus.color }]}>
                  {emailStatus.label}
                </Text>
              </View>
              {isPhoneUser && !profile?.email_verified && (
                <Text style={[S.linkAction, { color: colors.primary }]}>Link →</Text>
              )}
              <Feather name={emailStatus.icon} size={16} color={emailStatus.color} />
            </TouchableOpacity>
          </View>
          <Text style={[S.helperText, { color: colors.mutedForeground }]}>
            {isGoogleUser
              ? "Link your phone number to enable WhatsApp OTP login as an alternative."
              : "Link your email to enable Google login as an alternative. A verification link will be sent."}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Text style={[S.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={S.infoRow}>
              <Text style={[S.infoLabel, { color: colors.mutedForeground }]}>Handle</Text>
              <Text style={[S.infoValue, { color: colors.primary }]}>@{profile?.handle ?? "—"}</Text>
            </View>
            <View style={[S.divider, { backgroundColor: colors.border }]} />
            <View style={S.infoRow}>
              <Text style={[S.infoLabel, { color: colors.mutedForeground }]}>Portfolio URL</Text>
              <Text style={[S.infoValue, { color: colors.foreground }]} numberOfLines={1}>
                {profile?.handle ? `${profile.handle}.mybexo.com` : "—"}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify()} style={{ gap: 8 }}>
          {[
            { label: "Edit Profile",   icon: "edit-3", route: "/edit-profile" },
            { label: "View Portfolio", icon: "globe",  route: "/(main)/portfolio"    },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[S.navItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[S.navIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name={item.icon as any} size={16} color={colors.primary} />
              </View>
              <Text style={[S.navLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <TouchableOpacity style={[S.logoutBtn, { borderColor: "#FA6A6A" }]} onPress={handleLogout}>
            <Feather name="log-out" size={17} color="#FA6A6A" />
            <Text style={S.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={[S.version, { color: colors.mutedForeground }]}>BEXO v1.0.0</Text>
      </ScrollView>

      {/* Phone Link Modal */}
      <Modal
        visible={showPhoneModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowPhoneModal(false); setPhoneStep("input"); }}
      >
        <View style={[S.modal, { backgroundColor: colors.background }]}>
          <View style={[S.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setShowPhoneModal(false); setPhoneStep("input"); }}>
              <Text style={[S.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[S.modalTitle, { color: colors.foreground }]}>Link WhatsApp</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={S.modalContent} keyboardShouldPersistTaps="handled">
              {phoneStep === "input" ? (
                <>
                  <Text style={[S.modalDesc, { color: colors.mutedForeground }]}>
                    Enter your phone number. We'll send a WhatsApp OTP to verify it.
                  </Text>
                  <View style={[S.phoneRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[S.cc, { color: colors.foreground }]}>{linkCC}</Text>
                    <TextInput
                      style={[S.phoneInput, { color: colors.foreground }]}
                      placeholder="Phone number"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="phone-pad"
                      value={linkPhone}
                      onChangeText={setLinkPhone}
                      selectionColor={colors.primary}
                    />
                  </View>
                  {linkError ? <Text style={S.errorText}>{linkError}</Text> : null}
                  <BexoButton
                    label={linkLoading ? "Sending…" : "Send WhatsApp OTP"}
                    onPress={handleSendPhoneOtp}
                    loading={linkLoading}
                  />
                </>
              ) : (
                <>
                  <Text style={[S.modalDesc, { color: colors.mutedForeground }]}>
                    Enter the 4-digit code sent to {linkCC}{linkPhone} via WhatsApp.
                  </Text>
                  <TextInput
                    style={[S.otpInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Enter OTP"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={phoneOtp}
                    onChangeText={setPhoneOtp}
                    selectionColor={colors.primary}
                    autoFocus
                  />
                  {linkError ? <Text style={S.errorText}>{linkError}</Text> : null}
                  <BexoButton
                    label={linkLoading ? "Verifying…" : "Verify & Link Phone"}
                    onPress={handleVerifyPhoneOtp}
                    loading={linkLoading}
                    disabled={phoneOtp.length < 4}
                  />
                  <TouchableOpacity onPress={() => setPhoneStep("input")}>
                    <Text style={[S.backLink, { color: colors.mutedForeground }]}>← Change number</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Email Link Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={[S.modal, { backgroundColor: colors.background }]}>
          <View style={[S.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEmailModal(false)}>
              <Text style={[S.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[S.modalTitle, { color: colors.foreground }]}>Link Email</Text>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={S.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[S.modalDesc, { color: colors.mutedForeground }]}>
                Add your email to enable Google login. A verification link will be sent to confirm it.
              </Text>
              <TextInput
                style={[S.emailInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                value={linkEmail}
                onChangeText={setLinkEmail}
                selectionColor={colors.primary}
                autoFocus
              />
              {emailError ? <Text style={S.errorText}>{emailError}</Text> : null}
              <BexoButton
                label={emailLoading ? "Saving…" : "Save Email & Send Verification"}
                onPress={handleSaveEmail}
                loading={emailLoading}
                disabled={!linkEmail.trim() || googleLoading}
              />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>OR</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

              <TouchableOpacity
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 10, height: 52, borderRadius: 14, borderWidth: 1,
                  backgroundColor: colors.surface, borderColor: colors.border,
                  opacity: googleLoading ? 0.6 : 1
                }}
                onPress={handleLinkGoogle}
                disabled={googleLoading || emailLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Feather name="mail" size={18} color={colors.primary} />
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                      Link with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={[S.helperText, { color: colors.mutedForeground, textAlign: "center" }]}>
                Google login is the fastest way to verify your identity.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, gap: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  identityRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  identityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  identityLabel: { fontSize: 14, fontWeight: "600" },
  identityValue: { fontSize: 12, marginTop: 1 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  verifiedText: { fontSize: 11, fontWeight: "600" },
  linkAction: { fontSize: 13, fontWeight: "600", marginRight: 6 },
  divider: { height: 1, marginHorizontal: 14 },
  helperText: { fontSize: 12, lineHeight: 17, marginTop: 8, paddingHorizontal: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  navItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  navIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 10, marginTop: 8 },
  logoutText: { color: "#FA6A6A", fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: 12, opacity: 0.5 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalCancel: { fontSize: 15, width: 60 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalContent: { padding: 20, gap: 14 },
  modalDesc: { fontSize: 14, lineHeight: 21 },
  phoneRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, height: 52, overflow: "hidden" },
  cc: { paddingHorizontal: 14, fontSize: 14, fontWeight: "600" },
  phoneInput: { flex: 1, paddingHorizontal: 14, fontSize: 15, height: "100%" as any },
  otpInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, textAlign: "center", letterSpacing: 12 },
  emailInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  errorText: { color: "#FA6A6A", fontSize: 13 },
  backLink: { textAlign: "center", fontSize: 14, paddingVertical: 8 },
});
