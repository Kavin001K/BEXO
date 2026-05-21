import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";
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
  const profile = useProfileStore((s) => s.profile);
  const { setOnboardingStep, updateProfile } = useProfileStore();

  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const initialDob = profile?.dob ? new Date(profile.dob) : null;
  const [day, setDay] = useState(initialDob ? String(initialDob.getDate()) : "");
  const [month, setMonth] = useState(initialDob ? String(initialDob.getMonth() + 1) : "");
  const [year, setYear] = useState(initialDob ? String(initialDob.getFullYear()) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedDate = (() => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10) - 1;
    const y = parseInt(year, 10);
    if (!day || !month || !year || isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (y < 1900 || y > new Date().getFullYear()) return null;
    if (m < 0 || m > 11) return null;
    if (d < 1 || d > 31) return null;
    const date = new Date(y, m, d);
    if (date.getMonth() !== m) return null;
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
      await updateProfile({ dob: isoDate });
      setOnboardingStep("resume");
      router.push("/(onboarding)/resume");
    } catch {
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

  const handleBack = () => {
    void tapLight();
    setOnboardingStep("handle");
    router.replace("/(onboarding)/handle");
  };

  const dateInputStyle = [
    styles.dateInput,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
  ];

  return (
    <OnboardingShell
      stepKey="dob"
      title="When's your birthday?"
      subtitle="Help us personalize your portfolio. You can hide this later."
      onBack={handleBack}
      footer={
        <>
          <BexoButton label="Continue" onPress={handleContinue} loading={loading} disabled={!isValid} />
          <BexoButton label="Skip for now" onPress={handleSkip} variant="ghost" disabled={loading} />
        </>
      }
    >
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Edit your URL, name, photo, or email
      </Text>

      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Day</Text>
          <TextInput
            ref={dayRef}
            style={dateInputStyle}
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

        <View style={styles.dateField}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Month</Text>
          <TextInput
            ref={monthRef}
            style={dateInputStyle}
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
            style={dateInputStyle}
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

      {isValid && age !== null && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.ageBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "33" }]}
        >
          <Feather name="user" size={16} color={colors.primary} />
          <Text style={[styles.ageText, { color: colors.primary }]}>Age {age}</Text>
        </Animated.View>
      )}

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 18, marginTop: -12 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateField: { flex: 1, gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
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
