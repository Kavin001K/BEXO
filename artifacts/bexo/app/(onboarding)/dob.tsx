import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

function calcAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function DobScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { setOnboardingStep, updateProfile } = useProfileStore();

  const dayRef   = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef  = useRef<TextInput>(null);

  const [day, setDay]     = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear]   = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedDate = (() => {
    const d = parseInt(day), m = parseInt(month) - 1, y = parseInt(year);
    if (!day || !month || !year || isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (y < 1900 || y > new Date().getFullYear()) return null;
    if (m < 0 || m > 11) return null;
    if (d < 1 || d > 31) return null;
    const date = new Date(y, m, d);
    if (date.getMonth() !== m) return null; // invalid day for month
    return date;
  })();

  const age = parsedDate ? calcAge(parsedDate) : null;
  const isValid = parsedDate !== null && age !== null && age >= 13 && age <= 100;

  const handleContinue = async () => {
    if (!isValid || !parsedDate) {
      setError(age !== null && age < 13 ? "You must be at least 13 years old." : "Enter a valid date of birth.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const isoDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
      const { error: err } = await supabase
        .from("profiles")
        .update({ dob: isoDate })
        .eq("user_id", user?.id ?? "");
      if (err) throw err;
      setOnboardingStep("resume");
      router.push("/(onboarding)/resume");
    } catch {
      // non-critical — continue anyway
      setOnboardingStep("resume");
      router.push("/(onboarding)/resume");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setOnboardingStep("resume");
    router.push("/(onboarding)/resume");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#FA6AFA18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
      >
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i < 3 ? colors.primary : colors.border, opacity: i < 3 ? 0.5 : 1 },
                i === 3 && { backgroundColor: colors.primary, opacity: 1, width: 30 },
              ]}
            />
          ))}
        </View>

        <Animated.Text
          entering={FadeInDown.springify()}
          style={[styles.headline, { color: colors.foreground }]}
        >
          When's your birthday?
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(60).springify()}
          style={[styles.sub, { color: colors.mutedForeground }]}
        >
          Help us personalize your portfolio. Don't worry, you can hide this later.
        </Animated.Text>

        {/* Date inputs */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.dateRow}>
          <View style={[styles.dateField, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Day</Text>
            <TextInput
              ref={dayRef}
              style={[styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={2}
              value={day}
              onChangeText={(t) => {
                const val = t.replace(/\D/g, "");
                setDay(val);
                setError("");
                if (val.length === 2) monthRef.current?.focus();
              }}
              selectionColor={colors.primary}
              autoFocus
            />
          </View>

          <View style={[styles.dateField, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Month</Text>
            <TextInput
              ref={monthRef}
              style={[styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="MM"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={2}
              value={month}
              onChangeText={(t) => {
                const val = t.replace(/\D/g, "");
                setMonth(val);
                setError("");
                if (val.length === 2) yearRef.current?.focus();
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && !month) dayRef.current?.focus();
              }}
              selectionColor={colors.primary}
            />
          </View>

          <View style={[styles.dateField, { flex: 2 }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Year</Text>
            <TextInput
              ref={yearRef}
              style={[styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="YYYY"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={4}
              value={year}
              onChangeText={(t) => {
                setYear(t.replace(/\D/g, ""));
                setError("");
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && !year) monthRef.current?.focus();
              }}
              selectionColor={colors.primary}
              returnKeyType="done"
              onSubmitEditing={isValid ? handleContinue : undefined}
            />
          </View>
        </Animated.View>

        {/* Live age display */}
        {isValid && age !== null && (
          <Animated.View
            entering={FadeInDown.springify()}
            style={[styles.ageBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
          >
            <Feather name="user" size={16} color={colors.primary} />
            <Text style={[styles.ageText, { color: colors.primary }]}>
              Age {age}
            </Text>
          </Animated.View>
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : null}

        <View style={{ gap: 10, marginTop: 8 }}>
          <BexoButton
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!isValid}
          />
          <BexoButton
            label="Skip for now"
            onPress={handleSkip}
            variant="ghost"
            disabled={loading}
          />
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingHorizontal: 28, gap: 18 },
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  dot: { width: 20, height: 4, borderRadius: 2 },
  headline: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  sub: { fontSize: 14, lineHeight: 21 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateField: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  dateInput: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  ageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ageText: { fontSize: 15, fontWeight: "700" },
  error: { fontSize: 13 },
});
