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

import { 
  useFonts,
  Inter_600SemiBold,
  Inter_400Regular 
} from "@expo-google-fonts/inter";
import { 
  Poppins_700Bold,
  Poppins_400Regular 
} from "@expo-google-fonts/poppins";
import { 
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_400Regular 
} from "@expo-google-fonts/playfair-display";
import { 
  Montserrat_500Medium,
  Montserrat_400Regular 
} from "@expo-google-fonts/montserrat";
import { 
  SpaceGrotesk_700Bold,
  SpaceGrotesk_400Regular 
} from "@expo-google-fonts/space-grotesk";

const FONTS = [
  {
    id: "modern",
    label: "Modern",
    family: "Inter_600SemiBold",
    desc: "Clean, contemporary, versatile",
    sample: "Your Portfolio",
  },
  {
    id: "professional",
    label: "Professional",
    family: "Poppins_700Bold",
    desc: "Trustworthy, clear, corporate-ready",
    sample: "Your Portfolio",
  },
  {
    id: "creative",
    label: "Creative",
    family: "PlayfairDisplay_600SemiBold",
    desc: "Expressive, editorial, artistic",
    sample: "Your Portfolio",
  },
  {
    id: "classic",
    label: "Classic",
    family: "Montserrat_500Medium",
    desc: "Timeless, elegant, refined",
    sample: "Your Portfolio",
  },
  {
    id: "bold",
    label: "Bold",
    family: "SpaceGrotesk_700Bold",
    desc: "Strong, impactful, developer-like",
    sample: "Your Portfolio",
  },
];


export default function FontScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { setOnboardingStep } = useProfileStore();

  const [fontsLoaded] = useFonts({
    Inter_600SemiBold,
    Inter_400Regular,
    Poppins_700Bold,
    Poppins_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_400Regular,
    Montserrat_500Medium,
    Montserrat_400Regular,
    SpaceGrotesk_700Bold,
    SpaceGrotesk_400Regular,
  });

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

  if (!fontsLoaded) return null;

  const currentFont = FONTS.find((f) => f.id === selected) || FONTS[0];


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#6AFAD018", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView
        stickyHeaderIndices={[2]}
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

        <View style={{ backgroundColor: colors.background, paddingVertical: 10 }}>
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={[styles.previewContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.previewTag, { color: colors.primary }]}>PREVIEW</Text>
            <Text style={[styles.previewTitle, { color: colors.foreground, fontFamily: currentFont.family }]}>
              Hello, I'm a Designer
            </Text>
            <Text style={[styles.previewBody, { color: colors.mutedForeground, fontFamily: currentFont.family.replace("600SemiBold", "400Regular").replace("700Bold", "400Regular").replace("500Medium", "400Regular") }]}>
              Passionate about creating beautiful experiences that make a difference in people's lives.
            </Text>
          </Animated.View>
        </View>

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
                        fontFamily: font.family,
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
                      {font.family.split('_')[0]}
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
  previewContainer: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginVertical: 10,
    gap: 8,
  },
  previewTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  previewBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
});
