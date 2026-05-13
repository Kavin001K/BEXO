import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import * as Haptics from "expo-haptics";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase } from "@/lib/supabase";

export default function EmailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ email })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push("/(onboarding)/photo");
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
        colors={[colors.primary + "15", "transparent"]}
        style={styles.glow}
      />

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="mail" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            What's your email?
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We'll use this to send you important updates about your website.
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
              placeholder="email@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError("");
              }}
              onSubmitEditing={handleContinue}
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
            style={styles.signOutBtn}
            onPress={() => useAuthStore.getState().signOut()}
          >
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>
              Sign Out & Start Fresh
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
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  input: {
    fontSize: 18,
    fontWeight: "500",
  },
  error: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    gap: 20,
  },
  signOutBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
