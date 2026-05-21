import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { BuildGatePhase } from "@/lib/profileBuildOrchestrator";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";

interface Props {
  phase: BuildGatePhase;
  statusLabel: string;
  handle?: string;
  onPress?: () => void;
  onBuildPress?: () => void;
  score?: number;
}

export function BuildStatusCard({
  phase,
  statusLabel,
  handle,
  onPress,
  onBuildPress,
  score,
}: Props) {
  const colors = useColors();
  const isLive = phase === "ready";
  const isBuilding = phase === "building" || phase === "queued";
  const blocked = phase === "blocked_incomplete";

  const iconName = isLive
    ? "check-circle"
    : isBuilding
      ? "loader"
      : phase === "failed"
        ? "alert-circle"
        : "globe";

  const Wrapper = onPress || (!blocked && onBuildPress) ? TouchableOpacity : View;

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()}>
      <Wrapper
        onPress={() => {
          void tapLight();
          if (blocked && onPress) onPress();
          else if (!blocked && onBuildPress) onBuildPress();
          else onPress?.();
        }}
        activeOpacity={0.9}
        style={[
          styles.card,
          {
            backgroundColor: isLive ? colors.primary : colors.surface,
            borderColor: isLive ? colors.primary : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.icon,
            {
              backgroundColor: isLive
                ? "rgba(247,245,240,0.2)"
                : colors.primary + "18",
            },
          ]}
        >
          <Feather
            name={iconName}
            size={22}
            color={isLive ? colors.primaryForeground : colors.primary}
          />
        </View>
        <View style={styles.body}>
          <Text
            style={[
              styles.title,
              { color: isLive ? colors.primaryForeground : colors.foreground },
            ]}
          >
            {isLive ? "Your site is live" : blocked ? `Profile ${score ?? 0}%` : statusLabel}
          </Text>
          <Text
            style={[
              styles.sub,
              {
                color: isLive
                  ? "rgba(247,245,240,0.85)"
                  : colors.mutedForeground,
              },
            ]}
          >
            {isLive && handle
              ? `${handle}.mybexo.com`
              : blocked
                ? "Reach 90% to publish your portfolio"
                : statusLabel}
          </Text>
        </View>
        <Feather
          name="chevron-right"
          size={18}
          color={isLive ? colors.primaryForeground : colors.mutedForeground}
        />
      </Wrapper>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  sub: { fontSize: 13, lineHeight: 18 },
});
