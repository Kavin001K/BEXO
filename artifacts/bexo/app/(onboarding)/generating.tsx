import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useProfileBuildGate } from "@/hooks/useProfileBuildGate";
import { useColors } from "@/hooks/useColors";
import { success as hapticSuccess } from "@/lib/haptics";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

export default function GeneratingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const setOnboardingStep = useProfileStore((s) => s.setOnboardingStep);
  const subscribeToBuilds = usePortfolioStore((s) => s.subscribeToBuilds);
  const buildStatus = usePortfolioStore((s) => s.buildStatus);
  const portfolioUrl = usePortfolioStore((s) => s.portfolioUrl);

  const { completion, phase, statusLabel, tryAutoBuild, triggering } = useProfileBuildGate({
    autoTrigger: false,
  });

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  useEffect(() => {
    if (!profile?.id) return;

    if (!completion.isPassing) {
      const t = setTimeout(() => {
        setOnboardingStep("completed");
        router.replace({
          pathname: "/(main)/(tabs)/dashboard",
          params: { profile_incomplete: String(completion.score) },
        });
      }, 2200);
      return () => clearTimeout(t);
    }

    void tryAutoBuild();
    const unsub = subscribeToBuilds(profile.id);
    return unsub;
  }, [profile?.id, completion.isPassing, completion.score]);

  useEffect(() => {
    if (buildStatus !== "done" || !portfolioUrl) return;
    void hapticSuccess();
    setOnboardingStep("completed");
    router.replace({
      pathname: "/(main)/(tabs)/dashboard",
      params: { onboarding_complete: "true", build_ready: "true" },
    });
  }, [buildStatus, portfolioUrl, setOnboardingStep]);

  const goDashboard = () => {
    setOnboardingStep("completed");
    router.replace("/(main)/(tabs)/dashboard");
  };

  const label = statusLabel;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 48 : 32),
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        {!completion.isPassing ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
            <Feather name="alert-circle" size={48} color={colors.warning} />
            <Text style={[styles.headline, { color: colors.foreground }]}>
              Almost there
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Your profile is {completion.score}% complete. We need 90% before we
              can build your site. You can finish from home.
            </Text>
            <BexoButton label="Go to Home" onPress={goDashboard} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
            <Animated.View style={pulseStyle}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.logo}
              />
            </Animated.View>
            <Text style={[styles.headline, { color: colors.foreground }]}>
              Building your portfolio
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{label}</Text>
            {(triggering || buildStatus === "queued" || buildStatus === "building") && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            )}
            <View
              style={[
                styles.urlCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.urlLabel, { color: colors.mutedForeground }]}>
                Your URL
              </Text>
              <Text style={[styles.url, { color: colors.primary }]}>
                {profile?.handle ?? "you"}.mybexo.com
              </Text>
            </View>
            {(buildStatus === "failed" || phase === "failed") && (
              <BexoButton
                label="Continue to Home"
                variant="secondary"
                onPress={goDashboard}
              />
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: "center" },
  center: { alignItems: "center", gap: 16 },
  logo: { width: 88, height: 88, borderRadius: 22 },
  headline: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  sub: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 300 },
  urlCard: {
    width: "100%",
    marginTop: 8,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  urlLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  url: { fontSize: 17, fontWeight: "700" },
});
