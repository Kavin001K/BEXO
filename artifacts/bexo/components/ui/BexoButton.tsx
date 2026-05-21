import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { springConfig } from "@/constants/motion";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function BexoButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
}: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.destructive
        : variant === "secondary"
          ? colors.surface
          : "transparent";

  const textColor =
    variant === "primary" || variant === "danger"
      ? colors.primaryForeground
      : variant === "ghost"
        ? colors.mutedForeground
        : colors.foreground;

  return (
    <Animated.View
      style={[
        animStyle,
        styles.wrapper,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.dimmed,
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          void tapLight();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.98, springConfig);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springConfig);
        }}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.btn,
          {
            backgroundColor: bg,
            borderColor: variant === "secondary" ? colors.border : "transparent",
            borderWidth: variant === "secondary" ? 1 : 0,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.inner}>
            {icon}
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 16, overflow: "hidden" },
  fullWidth: { width: "100%" },
  dimmed: { opacity: 0.5 },
  btn: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 15, fontWeight: "600", letterSpacing: 0.1 },
});
