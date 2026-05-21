import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ScreenShell({
  children,
  scroll = true,
  keyboard = true,
  padded = true,
  style,
  contentStyle,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 12 : 8);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 24 : 16);

  const inner = (
    <View
      style={[
        padded && styles.pad,
        { paddingTop: topPad, paddingBottom: bottomPad },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollGrow}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {inner}
    </ScrollView>
  ) : (
    inner
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pad: { paddingHorizontal: 24 },
  scrollGrow: { flexGrow: 1 },
});
