import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/stores/useAuthStore";

export default function CollectEmailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, collectedEmail, setCollectedEmail } = useAuthStore();
  const [email, setEmail] = useState(collectedEmail || user?.email || "");
  const [error, setError] = useState("");

  const handleContinue = () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address");
      return;
    }
    setCollectedEmail(trimmed);
    router.replace("/(main)/dashboard");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.surface }]}>
            <Feather name="mail" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            What's your email?
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            We'll use this to notify you about portfolio activity and opportunities.
          </Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            selectionColor={colors.primary}
            autoFocus
          />

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <BexoButton label="Continue" onPress={handleContinue} icon={<Feather name="arrow-right" size={16} color="#fff" />} />

          <TouchableOpacity onPress={() => router.replace("/(main)/dashboard")}>
            <Text style={[styles.skip, { color: colors.mutedForeground }]}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 250 },
  scroll: { paddingHorizontal: 28, gap: 20, alignItems: "stretch" },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  headline: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 15, lineHeight: 22 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  error: { fontSize: 13, marginTop: -8 },
  skip: { textAlign: "center", fontSize: 14 },
});
