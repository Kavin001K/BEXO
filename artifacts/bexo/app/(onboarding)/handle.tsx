import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { sanitizeError } from "@/lib/errorUtils";

export default function HandleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, collectedEmail, collectedPhone } = useAuthStore();
  const setOnboardingStep = useProfileStore((s) => s.setOnboardingStep);

  const [handle, setHandle] = useState("");
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ""
  );
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isManualHandle, setIsManualHandle] = useState(false);

  const slug = handle.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Auto-generate handle from name
  React.useEffect(() => {
    if (!isManualHandle && fullName) {
      const suggested = fullName.toLowerCase().split(" ")[0].replace(/[^a-z0-9-]/g, "");
      if (suggested.length >= 3) {
        setHandle(suggested);
        checkAvailability(suggested);
      }
    }
  }, [fullName]);

  const checkAvailability = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", clean)
      .maybeSingle();
    setAvailable(!data);
    setChecking(false);
  };

  const handleChange = (val: string) => {
    setIsManualHandle(true);
    setHandle(val);
    setAvailable(null);
    if (val.length >= 3) checkAvailability(val);
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOnboardingStep("photo");
    router.replace("/(onboarding)/photo");
  };

  const handleContinue = async () => {
    if (!user) return;
    if (!slug || slug.length < 3) {
      setError("Handle must be at least 3 characters");
      return;
    }
    if (!fullName.trim()) {
      setError("Enter your full name");
      return;
    }
    if (!available) {
      setError("Handle is not available");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Check if profile already exists — if so, only update handle/name
      const { data: existing } = await supabase
        .from("profiles")
        .select("id, headline, bio")
        .eq("user_id", user.id)
        .maybeSingle();

      const upsertPayload: Record<string, any> = {
        user_id: user.id,
        handle: slug,
        full_name: fullName.trim(),
        email: collectedEmail || user.email || null,
        phone: collectedPhone || user.phone || null,
      };

      // Only set headline/bio to empty if the profile doesn't exist yet
      // This prevents overwriting data parsed from a resume in a prior session
      if (!existing) {
        upsertPayload.headline = "";
        upsertPayload.bio = "";
      }

      const { data, error: err } = await supabase
        .from("profiles")
        .upsert(upsertPayload, { onConflict: "user_id" })
        .select()
        .single();
      
      if (err) {
        // PostgREST 409 Conflict usually means the handle is already taken by another user_id
        if (err.code === "23505") {
          throw new Error("This handle is already taken. Please try another one.");
        }
        throw err;
      }
      
      const { setProfile } = useProfileStore.getState();
      setProfile(data);
      setOnboardingStep("dob");
      router.push("/(onboarding)/dob");
    } catch (e: any) {
      setError(sanitizeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#6AFAD018", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back to edit profile photo and email"
          style={styles.backRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.primary} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.backHint, { color: colors.mutedForeground }]}>
          Edit photo or email
        </Text>

        <View style={styles.headerRow}>
          <Image 
            source={require("../../assets/images/icon.png")} 
            style={styles.logo} 
          />
          <View style={styles.stepRow}>
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { backgroundColor: colors.primary, width: 30 }]} />
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
          </View>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          Own Your Website
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          This is where the world will find your work. Make it yours.
        </Text>

        {/* Full name */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>What's your name?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Kavin"
            placeholderTextColor={colors.mutedForeground}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            selectionColor={colors.primary}
          />
        </View>

        {/* Handle */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>My URL</Text>
          <View style={styles.handleRow}>
            <TextInput
              style={[
                styles.input,
                styles.handleInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: available === false
                    ? colors.accent
                    : available
                    ? colors.mint
                    : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="kavin.mybexo.com"
              placeholderTextColor={colors.mutedForeground}
              value={handle}
              onChangeText={handleChange}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={colors.primary}
            />
            <View style={styles.statusIcon}>
              {checking ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : available === true ? (
                <Feather name="check-circle" size={18} color={colors.mint} />
              ) : available === false ? (
                <Feather name="x-circle" size={18} color={colors.accent} />
              ) : null}
            </View>
          </View>
        </View>

        {/* Preview URL */}
        {slug.length >= 3 && (
          <View style={[styles.urlPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="link" size={14} color={colors.mutedForeground} />
            <Text style={[styles.urlText, { color: colors.primary }]}>
              {slug}.mybexo.com
            </Text>
          </View>
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : null}

        <BexoButton
          label="Continue"
          onPress={handleContinue}
          loading={loading}
          disabled={!available || !fullName.trim()}
        />

        <TouchableOpacity 
          style={styles.signOutBtn} 
          onPress={() => useAuthStore.getState().signOut()}
        >
          <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>
            Sign Out & Start Fresh
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
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
    paddingHorizontal: 30,
    gap: 20,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  backLabel: { fontSize: 17, fontWeight: "600" },
  backHint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  stepRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  headline: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: 10,
  },
  field: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: "600",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  handleInput: {
    flex: 1,
  },
  statusIcon: {
    width: 24,
    alignItems: "center",
  },
  urlPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  urlText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  error: {
    fontSize: 13,
    fontWeight: "500",
  },
  signOutBtn: { marginTop: 20, paddingVertical: 12, alignItems: "center" },
  signOutText: { fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
});
