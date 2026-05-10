import { Feather } from "@expo/vector-icons";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

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

  const slug = handle.toLowerCase().replace(/[^a-z0-9-]/g, "");

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
    setHandle(val);
    setAvailable(null);
    if (val.length >= 3) checkAvailability(val);
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
      setOnboardingStep("resume");
      router.push("/(onboarding)/resume");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
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
          <View style={styles.headerRow}>
            <Image 
              source={require("../../assets/images/icon.png")} 
              style={styles.logo} 
            />
            <View style={styles.stepRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
            </View>
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            Claim your handle
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            This becomes your permanent portfolio URL. Choose wisely.
          </Text>

          {/* Full name */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Kavin Kumar"
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
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Your Handle</Text>
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
                placeholder="kavin"
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
    height: 280,
  },
  scroll: {
    paddingHorizontal: 28,
    gap: 18,
  },
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
    gap: 6,
  },
  dot: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  headline: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  sub: { fontSize: 14, lineHeight: 21 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  handleRow: { position: "relative" },
  handleInput: { paddingRight: 48 },
  statusIcon: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  urlPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  urlText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  error: { fontSize: 13 },
});
