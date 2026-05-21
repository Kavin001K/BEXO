import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { BexoButton } from "@/components/ui/BexoButton";
import { FormField } from "@/components/ui/FormField";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/stores/useAuthStore";

export default function CollectEmailScreen() {
  const colors = useColors();
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
    router.replace("/dashboard");
  };

  return (
    <ScreenShell>
      <Animated.View entering={FadeIn.duration(500)} style={styles.logoWrap}>
        <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
      </Animated.View>

      <ScreenHeader
        title="What's your email?"
        subtitle="We'll use this to notify you about portfolio activity and opportunities."
      />

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
        <FormField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          autoFocus
          error={error}
        />

        <BexoButton
          label="Continue"
          onPress={handleContinue}
          icon={<Feather name="arrow-right" size={16} color="#fff" />}
        />

        <TouchableOpacity onPress={() => router.replace("/dashboard")} style={styles.skipWrap}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "center", marginBottom: 8 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  form: { gap: 16, marginTop: 4 },
  skipWrap: { alignItems: "center", paddingVertical: 8 },
  skip: { fontSize: 14, fontWeight: "500" },
});
