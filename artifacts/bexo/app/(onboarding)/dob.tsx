import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
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
  const { setOnboardingStep, updateProfile } = useProfileStore();

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);
  const minDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 100);
    return d;
  }, []);

  /** iOS / Android: single spinner date */
  const [nativeDob, setNativeDob] = useState<Date>(() => maxDob);
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Web: DD / MM / YYYY inputs */
  const dayRef = React.useRef<TextInput>(null);
  const monthRef = React.useRef<TextInput>(null);
  const yearRef = React.useRef<TextInput>(null);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedWebDate = (() => {
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

  const parsedDate =
    Platform.OS === "web" ? parsedWebDate : nativeDob;

  const age = parsedDate ? calcAge(parsedDate) : null;
  const isValid =
    parsedDate !== null &&
    age !== null &&
    age >= 13 &&
    age <= 100 &&
    parsedDate >= minDob &&
    parsedDate <= maxDob;

  const handleContinue = async () => {
    if (!parsedDate || !isValid) {
      setError(
        age !== null && age < 13
          ? "You must be at least 13 years old."
          : "Enter a valid date of birth."
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const isoDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
      await updateProfile({ dob: isoDate });
      setOnboardingStep("resume");
      router.push("/(onboarding)/resume");
    } catch (e: any) {
      console.error("[DOB] Update error:", e);
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

  const fmtNativeLabel = nativeDob.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
          When&apos;s your birthday?
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(60).springify()}
          style={[styles.sub, { color: colors.mutedForeground }]}
        >
          Help us personalize your portfolio. This information helps us curate the best experience for you.
        </Animated.Text>

        {Platform.OS === "web" ? (
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
        ) : (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: 12 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Select Birthday</Text>
            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              style={[
                styles.nativeTrigger,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.dateLabelWrap}>
                <Feather name="calendar" size={22} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
                  {fmtNativeLabel}
                </Text>
              </View>
              <Feather name="chevron-down" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            
            {Platform.OS === "android" && pickerOpen && (
              <DateTimePicker
                value={nativeDob}
                mode="date"
                display="calendar"
                minimumDate={minDob}
                maximumDate={maxDob}
                onChange={(_, d) => {
                  setPickerOpen(false);
                  if (d) setNativeDob(d);
                }}
              />
            )}

            {Platform.OS === "ios" && (
              <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
                  <Pressable
                    style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <View style={styles.modalHeader}>
                      <View style={styles.modalIndicator} />
                      <Text style={[styles.modalTitle, { color: colors.foreground }]}>Pick your birthday</Text>
                    </View>
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={nativeDob}
                        mode="date"
                        display="spinner"
                        minimumDate={minDob}
                        maximumDate={maxDob}
                        onChange={(_, d) => {
                          if (d) setNativeDob(d);
                        }}
                        textColor={colors.foreground}
                        {...(Platform.OS === "ios" ? { themeVariant: "dark" as const } : {})}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                      onPress={() => setPickerOpen(false)}
                    >
                      <Text style={{ color: "#000", fontSize: 16, fontWeight: "800" }}>Set Birthday</Text>
                    </TouchableOpacity>
                  </Pressable>
                </Pressable>
              </Modal>
            )}
          </Animated.View>
        )}

        {isValid && age !== null && (
          <Animated.View
            entering={FadeInDown.springify()}
            style={[styles.ageBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "33" }]}
          >
            <View style={[styles.ageDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.ageText, { color: colors.primary }]}>You are {age} years young</Text>
          </Animated.View>
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : null}

        <View style={{ gap: 14, marginTop: 12 }}>
          <BexoButton
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!isValid}
          />
          <TouchableOpacity 
            onPress={handleSkip}
            style={styles.skipWrapper}
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
  nativeTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 64,
  },
  dateLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    paddingTop: 12,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  pickerContainer: {
    height: 200,
    justifyContent: "center",
  },
  doneBtn: {
    marginHorizontal: 28,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  ageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ageText: { fontSize: 15, fontWeight: "700" },
  error: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  skipWrapper: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
