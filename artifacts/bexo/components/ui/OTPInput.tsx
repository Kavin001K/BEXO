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
  autoFocus?: boolean;
}

export function OTPInput({ length = 4, onComplete, onCodeChange, autoFocus = false }: Props) {
  const colors = useColors();
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, idx: number) => {
    // Handle pasting: if text length > 1, assume it's a code
    if (text.length > 1) {
      const code = text.replace(/[^0-9]/g, "").slice(0, length);
      const next = [...values];
      for (let i = 0; i < code.length; i++) {
        next[i] = code[i];
      }
      setValues(next);
      onCodeChange?.(next.join(""));
      
      const lastIdx = Math.min(code.length - 1, length - 1);
      inputs.current[lastIdx]?.focus();

      if (code.length === length) {
        onComplete(code);
      }
      return;
    }

    const cleaned = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...values];
    next[idx] = cleaned;
    setValues(next);
    onCodeChange?.(next.join(""));

    if (cleaned && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }

    const fullCode = next.join("");
    if (fullCode.length === length) {
      onComplete(fullCode);
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
      {values.map((val, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            inputs.current[i] = r;
          }}
          style={[
            styles.box,
            {
              backgroundColor: colors.surface,
              borderColor: val ? colors.primary : colors.border,
              color: colors.foreground,
            },
          ]}
          value={val}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
          maxLength={i === 0 ? length : 1}
          textAlign="center"
          selectionColor={colors.primary}
          returnKeyType={i === length - 1 ? "done" : "next"}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          selectTextOnFocus
          blurOnSubmit={i === length - 1}
          cursorColor={colors.primary}
          autoFocus={autoFocus && i === 0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginVertical: 10,
  },
  box: {
    width: 50,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 24,
    fontWeight: "700",
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
  },
});
