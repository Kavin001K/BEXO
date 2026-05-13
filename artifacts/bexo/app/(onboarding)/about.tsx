import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { useProfileStore } from "@/stores/useProfileStore";
import { supabase } from "@/lib/supabase";

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, setOnboardingStep } = useProfileStore();
  
  const [bio, setBio] = useState(profile?.bio || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!bio || bio.length < 20) {
      setError("Please tell us a bit more about yourself (min 20 characters)");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateProfile({ bio });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setOnboardingStep("theme");
      router.push("/(onboarding)/theme");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#FAD06A15", "transparent"]}
        style={styles.glow}
      />

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: "#FAD06A15" }]}>
            <Feather name="smile" size={32} color="#FAD06A" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Tell us about yourself
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Share anything you want the world to know about you. Your passion, your goals, or a fun fact!
          </Text>
        </View>

        <View style={styles.form}>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="I'm a designer who loves building minimalist interfaces..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={bio}
              onChangeText={(t) => {
                setBio(t);
                setError("");
              }}
            />
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <BexoButton
            label="Continue"
            onPress={handleContinue}
            loading={loading}
          />
          
          <TouchableOpacity 
            style={styles.skipBtn}
            onPress={() => {
              setOnboardingStep("theme");
              router.push("/(onboarding)/theme");
            }}
          >
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    gap: 16,
    marginBottom: 40,
  },
  inputContainer: {
    minHeight: 160,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  input: {
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 24,
  },
  error: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    gap: 16,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
