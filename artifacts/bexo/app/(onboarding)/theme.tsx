import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
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
    accent: "#0D6B5C",
    preview: ["#FFFFFF", "#F7F5F0"],
  },
  {
    id: "corporate",
    label: "Corporate",
    desc: "Professional & bold",
    accent: "#1A237E",
    preview: ["#1A237E", "#283593"],
  },
  {
    id: "creative",
    label: "Creative",
    desc: "Colorful & expressive",
    accent: "#C2185B",
    preview: ["#E91E63", "#F06292"],
  },
  {
    id: "developer",
    label: "Developer",
    desc: "Code-inspired dark",
    accent: "#00E676",
    preview: ["#0D1117", "#161B22"],
  },
  {
    id: "dark_modern",
    label: "Dark Modern",
    desc: "Sleek & premium",
    accent: "#0D6B5C",
    preview: ["#0A0A0F", "#1A1A1A"],
  },
  {
    id: "futuristic",
    label: "Futuristic",
    desc: "Cutting-edge design",
    accent: "#00838F",
    preview: ["#001122", "#00212E"],
  },
];

export default function ThemeScreen() {
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const { setOnboardingStep } = useProfileStore();

  const [selected, setSelected] = useState("minimal");
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
    <OnboardingShell
      stepKey="theme"
      title="Choose your style"
      subtitle="Pick a visual theme for your portfolio. You can change it anytime."
      showBack
      footer={<BexoButton label="Continue" onPress={handleContinue} loading={loading} />}
    >
      <View style={styles.grid}>
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
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={theme.preview as [string, string]}
                style={styles.themePreview}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.fakeLine, { backgroundColor: theme.accent + "88", width: "60%" }]} />
                <View style={[styles.fakeLine, { backgroundColor: theme.accent + "44", width: "80%" }]} />
                <View style={[styles.fakeTag, { backgroundColor: theme.accent }]} />
              </LinearGradient>

              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={12} color={colors.primaryForeground} />
                </View>
              )}

              <View style={styles.themeInfo}>
                <Text style={[styles.themeLabel, { color: colors.foreground }]}>{theme.label}</Text>
                <Text style={[styles.themeDesc, { color: colors.mutedForeground }]}>{theme.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
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
  fakeLine: { height: 4, borderRadius: 2, marginBottom: 2 },
  fakeTag: { width: 28, height: 10, borderRadius: 5, marginTop: 4 },
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
  themeInfo: { padding: 12, gap: 2 },
  themeLabel: { fontSize: 14, fontWeight: "700" },
  themeDesc: { fontSize: 11, lineHeight: 15 },
});
