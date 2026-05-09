import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

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
  const scale  = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { stiffness: 400, damping: 20 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const isPrimary = variant === "primary";

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
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={styles.touchable}
      >
        {isPrimary ? (
          <LinearGradient
            colors={["#7C6AFA", "#A06AFA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                {icon}
                <Text style={[styles.label, styles.primaryLabel]}>{label}</Text>
              </>
            )}
          </LinearGradient>
        ) : variant === "secondary" ? (
          <Animated.View
            style={[styles.btn, styles.secondary, { borderColor: colors.border }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                {icon}
                <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
              </>
            )}
          </Animated.View>
        ) : variant === "ghost" ? (
          <Animated.View style={styles.btn}>
            {loading ? (
              <ActivityIndicator color={colors.mutedForeground} size="small" />
            ) : (
              <>
                {icon}
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
              </>
            )}
          </Animated.View>
        ) : (
          <Animated.View style={[styles.btn, styles.danger]}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                {icon}
                <Text style={[styles.label, styles.primaryLabel]}>{label}</Text>
              </>
            )}
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 14, overflow: "hidden" },
  fullWidth: { width: "100%" },
  touchable: {},
  dimmed: { opacity: 0.5 },
  btn: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  secondary: { borderWidth: 1, backgroundColor: "transparent" },
  danger: { backgroundColor: "#FA6A6A" },
  label: { fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
  primaryLabel: { color: "#FFFFFF" },
});
