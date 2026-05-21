import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

const VIBES = [
  { id: "minimal", label: "Minimal", icon: "◻" },
  { id: "premium", label: "Premium", icon: "✦" },
  { id: "creative", label: "Creative", icon: "◈" },
  { id: "dark", label: "Dark", icon: "◆" },
  { id: "corporate", label: "Corporate", icon: "◉" },
  { id: "ai_themed", label: "AI-themed", icon: "⬡" },
  { id: "startup", label: "Startup-like", icon: "▲" },
  { id: "editorial", label: "Editorial", icon: "☰" },
  { id: "playful", label: "Playful", icon: "◕" },
  { id: "retro", label: "Retro", icon: "⬟" },
];

export default function PreferenceScreen() {
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const { setOnboardingStep } = useProfileStore();

  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      setOnboardingStep("generating");
      router.push("/(onboarding)/generating");
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({ website_preference: selected.join(",") })
        .eq("user_id", user?.id ?? "");
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
    setOnboardingStep("generating");
    router.push("/(onboarding)/generating");
  };

  return (
    <OnboardingShell
      stepKey="preference"
      title="How should your portfolio feel?"
      subtitle="Select all that apply. Our AI will use this to shape your personal brand."
      showBack
      footer={
        <BexoButton
          label={loading ? "Saving..." : selected.length > 0 ? "Generate my portfolio" : "Skip for now"}
          onPress={handleContinue}
          loading={loading}
        />
      }
    >
      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.vibeGrid}>
        {VIBES.map((vibe) => {
          const isSelected = selected.includes(vibe.id);
          return (
            <TouchableOpacity
              key={vibe.id}
              onPress={() => toggle(vibe.id)}
              activeOpacity={0.8}
              style={[
                styles.vibeChip,
                {
                  backgroundColor: isSelected ? colors.primary + "14" : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <Text
                style={[styles.vibeIcon, { color: isSelected ? colors.primary : colors.mutedForeground }]}
              >
                {vibe.icon}
              </Text>
              <Text style={[styles.vibeLabel, { color: isSelected ? colors.primary : colors.foreground }]}>
                {vibe.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {selected.length > 0 && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.selectionHint, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.selectionText, { color: colors.mutedForeground }]}>
            {selected.length} vibe{selected.length !== 1 ? "s" : ""} selected — AI will craft your portfolio
            around this
          </Text>
        </Animated.View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  vibeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vibeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  vibeIcon: { fontSize: 14 },
  vibeLabel: { fontSize: 14, fontWeight: "600" },
  selectionHint: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectionText: { fontSize: 13, lineHeight: 18 },
});
