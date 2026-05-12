import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

const FONTS = [
  {
    id: "modern",
    label: "Modern",
    family: "Inter",
    desc: "Clean, contemporary, versatile",
    sample: "Your Portfolio",
    weight: "600" as const,
  },
  {
    id: "professional",
    label: "Professional",
    family: "Poppins",
    desc: "Trustworthy, clear, corporate-ready",
    sample: "Your Portfolio",
    weight: "700" as const,
  },
  {
    id: "creative",
    label: "Creative",
    family: "Playfair Display",
    desc: "Expressive, editorial, artistic",
    sample: "Your Portfolio",
    weight: "600" as const,
  },
  {
    id: "classic",
    label: "Classic",
    family: "Montserrat",
    desc: "Timeless, elegant, refined",
    sample: "Your Portfolio",
    weight: "500" as const,
  },
  {
    id: "bold",
    label: "Bold",
    family: "Space Grotesk",
    desc: "Strong, impactful, developer-like",
    sample: "Your Portfolio",
    weight: "700" as const,
  },
];

export default function FontScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { setOnboardingStep } = useProfileStore();

  const [selected, setSelected] = useState("modern");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({ portfolio_font: selected })
        .eq("user_id", user?.id ?? "");
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
    setOnboardingStep("preference");
    router.push("/(onboarding)/preference");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#6AFAD018", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text
          entering={FadeInDown.springify()}
          style={[styles.headline, { color: colors.foreground }]}
        >
          Pick your typography
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(60).springify()}
          style={[styles.sub, { color: colors.mutedForeground }]}
        >
          The right font makes your portfolio feel intentional and premium.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: 10 }}>
          {FONTS.map((font) => {
            const isSelected = selected === font.id;
            return (
              <TouchableOpacity
                key={font.id}
                onPress={() => setSelected(font.id)}
                activeOpacity={0.8}
                style={[
                  styles.fontCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.fontCardLeft}>
                  <Text
                    style={[
                      styles.fontSample,
                      {
                        color: isSelected ? colors.primary : colors.foreground,
                        fontWeight: font.weight,
                      },
                    ]}
                  >
                    {font.sample}
                  </Text>
                  <View style={styles.fontMeta}>
                    <Text style={[styles.fontLabel, { color: colors.foreground }]}>
                      {font.label}
                    </Text>
                    <Text style={[styles.fontFamily, { color: colors.mutedForeground }]}>
                      {font.family}
                    </Text>
                  </View>
                  <Text style={[styles.fontDesc, { color: colors.mutedForeground }]}>
                    {font.desc}
                  </Text>
                </View>

                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        <BexoButton
          label="Continue"
          onPress={handleContinue}
          loading={loading}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingHorizontal: 20, gap: 18 },
  headline: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4, paddingHorizontal: 8 },
  sub: { fontSize: 14, lineHeight: 21, paddingHorizontal: 8 },
  fontCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    padding: 18,
  },
  fontCardLeft: { gap: 6, flex: 1 },
  fontSample: {
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  fontMeta: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  fontLabel: { fontSize: 13, fontWeight: "700" },
  fontFamily: { fontSize: 11 },
  fontDesc: { fontSize: 11, lineHeight: 16 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
});
