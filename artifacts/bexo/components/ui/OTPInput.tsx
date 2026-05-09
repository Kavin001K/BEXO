import React, { useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  length?: number;
  onComplete: (code: string) => void;
  onCodeChange?: (code: string) => void;
}

export function OTPInput({ length = 4, onComplete, onCodeChange }: Props) {
  const colors = useColors();
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, idx: number) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...values];
    next[idx] = cleaned;
    setValues(next);
    onCodeChange?.(next.join(""));
    if (cleaned && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
    if (next.every(Boolean)) {
      onComplete(next.join(""));
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    idx: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !values[idx] && idx > 0) {
      const next = [...values];
      next[idx - 1] = "";
      setValues(next);
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array(length)
        .fill(0)
        .map((_, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            style={[
              styles.box,
              {
                backgroundColor: colors.surface,
                borderColor: values[i] ? colors.primary : colors.border,
                color: colors.foreground,
              },
            ]}
            value={values[i]}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            selectionColor={colors.primary}
            returnKeyType="next"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 22,
    fontWeight: "700",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
});
