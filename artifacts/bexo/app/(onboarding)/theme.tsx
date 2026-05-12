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

const THEMES = [
  {
    id: "minimal",
    label: "Minimal",
    desc: "Clean & focused",
    accent: "#F0F0F0",
    bg: "#FFFFFF",
    preview: ["#FFFFFF", "#F5F5F5"],
  },
  {
    id: "corporate",
    label: "Corporate",
    desc: "Professional & bold",
    accent: "#1A237E",
    bg: "#E8EAF6",
    preview: ["#1A237E", "#283593"],
  },
  {
    id: "creative",
    label: "Creative",
    desc: "Colorful & expressive",
    accent: "#E91E63",
    bg: "#FCE4EC",
    preview: ["#E91E63", "#F06292"],
  },
  {
    id: "developer",
    label: "Developer",
    desc: "Code-inspired dark",
    accent: "#00E676",
    bg: "#0D1117",
    preview: ["#0D1117", "#161B22"],
  },
  {
    id: "dark_modern",
    label: "Dark Modern",
    desc: "Sleek & premium",
    accent: "#7C6AFA",
    bg: "#0A0A1A",
    preview: ["#0A0A1A", "#1A1A2E"],
  },
  {
    id: "futuristic",
    label: "Futuristic",
    desc: "Cutting-edge design",
    accent: "#00BCD4",
    bg: "#001122",
    preview: ["#001122", "#00212E"],
  },
];

export default function ThemeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { setOnboardingStep } = useProfileStore();

  const [selected, setSelected] = useState("dark_modern");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({ portfolio_theme: selected })
        .eq("user_id", user?.id ?? "");
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
    setOnboardingStep("font");
    router.push("/(onboarding)/font");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA18", "transparent"]}
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
          Choose your style
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(60).springify()}
          style={[styles.sub, { color: colors.mutedForeground }]}
        >
          Pick a visual theme for your portfolio. You can change it anytime.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.grid}>
          {THEMES.map((theme) => {
            const isSelected = selected === theme.id;
            return (
              <TouchableOpacity
                key={theme.id}
                onPress={() => setSelected(theme.id)}
                activeOpacity={0.8}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? theme.accent : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                {/* Preview gradient */}
                <LinearGradient
                  colors={theme.preview as [string, string]}
                  style={styles.themePreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Fake UI elements */}
                  <View style={[styles.fakeLine, { backgroundColor: theme.accent + "88", width: "60%" }]} />
                  <View style={[styles.fakeLine, { backgroundColor: theme.accent + "44", width: "80%" }]} />
                  <View style={[styles.fakeTag, { backgroundColor: theme.accent }]} />
                </LinearGradient>

                {/* Selection check */}
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.accent }]}>
                    <Feather name="check" size={12} color="#fff" />
                  </View>
                )}

                <View style={styles.themeInfo}>
                  <Text style={[styles.themeLabel, { color: colors.foreground }]}>{theme.label}</Text>
                  <Text style={[styles.themeDesc, { color: colors.mutedForeground }]}>{theme.desc}</Text>
                </View>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  themeCard: {
    width: "47%",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  themePreview: {
    height: 100,
    padding: 12,
    gap: 6,
    justifyContent: "flex-end",
  },
  fakeLine: {
    height: 4,
    borderRadius: 2,
    marginBottom: 2,
  },
  fakeTag: {
    width: 28,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  themeInfo: {
    padding: 12,
    gap: 2,
  },
  themeLabel: { fontSize: 14, fontWeight: "700" },
  themeDesc: { fontSize: 11, lineHeight: 15 },
});
