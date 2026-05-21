import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  stepLabel?: string;
  completionScore?: number;
  onBack?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  stepLabel,
  completionScore,
  onBack,
}: Props) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.wrap}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => {
              void tapLight();
              if (onBack) onBack();
              else router.back();
            }}
            hitSlop={12}
            style={[styles.back, { borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backSpacer} />
        )}
        {stepLabel ? (
          <Text style={[styles.step, { color: colors.mutedForeground }]}>{stepLabel}</Text>
        ) : (
          <View style={styles.flex} />
        )}
        {completionScore !== undefined ? (
          <ProgressRing score={completionScore} size={44} />
        ) : null}
      </View>
      {title ? (
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 28, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backSpacer: { width: 40 },
  flex: { flex: 1 },
  step: { flex: 1, fontSize: 13, fontWeight: "600", textAlign: "center" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: fonts.sansBold,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  sub: { fontSize: 15, lineHeight: 22, maxWidth: 320 },
});
