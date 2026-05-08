import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
}

export function SkillTag({ label, selected, onPress, size = "md" }: Props) {
  const colors = useColors();
  const isSmall = size === "sm";

  return (
    <TouchableOpacity
      style={[
        styles.tag,
        isSmall && styles.small,
        selected
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.label,
          isSmall && styles.smallLabel,
          { color: selected ? "#fff" : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  small: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  smallLabel: {
    fontSize: 11,
  },
});
