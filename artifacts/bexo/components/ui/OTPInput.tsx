import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { error as hapticError } from "@/lib/haptics";

export interface OTPInputRef {
  reset: () => void;
  focus: () => void;
}

interface Props {
  length?: number;
  onComplete: (code: string) => void;
  onCodeChange?: (code: string) => void;
  autoFocus?: boolean;
  hasError?: boolean;
}

function OTPInputInner(
  {
    length = 4,
    onComplete,
    onCodeChange,
    autoFocus = false,
    hasError = false,
  }: Props,
  ref: React.Ref<OTPInputRef>,
) {
  const colors = useColors();
  const [values, setValues] = useState<string[]>(() => Array(length).fill(""));
  const hiddenRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const applyDigits = useCallback(
    (raw: string) => {
      const code = raw.replace(/[^0-9]/g, "").slice(0, length);
      const next = Array(length)
        .fill("")
        .map((_, i) => code[i] ?? "");
      setValues(next);
      const joined = next.join("");
      onCodeChange?.(joined);
      if (joined.length === length) onComplete(joined);
      return joined;
    },
    [length, onComplete, onCodeChange],
  );

  const reset = useCallback(() => {
    setValues(Array(length).fill(""));
    onCodeChange?.("");
    hiddenRef.current?.clear();
  }, [length, onCodeChange]);

  useImperativeHandle(ref, () => ({ reset, focus: () => hiddenRef.current?.focus() }), [
    reset,
  ]);

  React.useEffect(() => {
    if (!hasError) return;
    void hapticError();
    shake.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [hasError, shake]);

  const handleHiddenChange = (text: string) => {
    applyDigits(text);
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key !== "Backspace") return;
    const joined = values.join("");
    if (!joined) return;
    const next = [...values];
    let idx = -1;
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i] !== "") {
        idx = i;
        break;
      }
    }
    if (idx < 0) idx = length - 1;
    next[idx] = "";
    setValues(next);
    const out = next.join("");
    onCodeChange?.(out);
    hiddenRef.current?.setNativeProps({ text: out });
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={hiddenRef}
        value={values.join("")}
        onChangeText={handleHiddenChange}
        onKeyPress={handleKeyPress}
        keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        importantForAutofill="yes"
        autoFocus={autoFocus}
        caretHidden
        style={styles.hidden}
        accessibilityLabel="One-time code"
      />

      <Animated.View style={[styles.row, shakeStyle]}>
        {values.map((val, i) => (
          <Pressable
            key={i}
            onPress={() => hiddenRef.current?.focus()}
            style={[
              styles.box,
              {
                backgroundColor: colors.surface,
                borderColor: hasError
                  ? colors.destructive
                  : val
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.digit,
                { color: colors.foreground, fontFamily: fonts.monoBold },
              ]}
            >
              {val}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

export const OTPInput = React.memo(forwardRef(OTPInputInner));

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  hidden: {
    position: "absolute",
    opacity: 0,
    height: 1,
    width: 1,
    left: 0,
    top: 0,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginVertical: 10,
  },
  box: {
    width: 56,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontSize: 24, fontWeight: "700" },
});
