import React from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props extends TextInputProps {
  label: string;
  helper?: string;
  error?: string;
}

export function FormField({ label, helper, error, style, ...rest }: Props) {
  const colors = useColors();
  const borderColor = error ? colors.destructive : colors.border;

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor,
            color: colors.foreground,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  helper: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13, lineHeight: 18 },
});
