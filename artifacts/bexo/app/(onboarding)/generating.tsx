import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

const STEPS = [
  "Parsing your profile data...",
  "Crafting your portfolio layout...",
  "Generating your card design...",
  "Applying BEXO magic...",
  "Your portfolio is almost ready!",
];

export default function GeneratingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const { triggerBuild, subscribeToBuilds, buildStatus, portfolioUrl } =
    usePortfolioStore();

  const [stepIdx, setStepIdx] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Step ticker
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STEPS.length * 1800,
      useNativeDriver: false,
    }).start();

    return () => {
      pulse.stop();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    triggerBuild(profile.id);
    const unsub = subscribeToBuilds(profile.id);
    return unsub;
  }, [profile?.id]);

  useEffect(() => {
    if (buildStatus === "done" && portfolioUrl) {
      setTimeout(() => {
        router.replace("/(main)/dashboard");
      }, 1200);
    }
  }, [buildStatus, portfolioUrl]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA20", "#FA6A6A10", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
          },
        ]}
      >
        {/* Orbiting logo */}
        <View style={styles.logoWrap}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <LinearGradient
              colors={["#7C6AFA", "#FA6A6A"]}
              style={styles.logoBig}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoLetter}>B</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          Building your portfolio
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Sit back — we're assembling something amazing for you
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth },
            ]}
          >
            <LinearGradient
              colors={["#7C6AFA", "#FA6A6A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Step */}
        <Text style={[styles.step, { color: colors.mutedForeground }]}>
          {STEPS[stepIdx]}
        </Text>

        {/* Preview of what they'll get */}
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={["#7C6AFA15", "transparent"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>
            Your portfolio URL
          </Text>
          <Text style={[styles.previewUrl, { color: colors.primary }]}>
            {profile?.handle ?? "you"}.mybrexo.com
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  logoWrap: { marginBottom: 8 },
  logoBig: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: "#fff", fontSize: 52, fontWeight: "800" },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  step: { fontSize: 13, textAlign: "center", minHeight: 18 },
  previewCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  previewLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  previewUrl: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
