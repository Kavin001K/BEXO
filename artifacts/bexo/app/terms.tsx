import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { LegalSection, LegalView } from "@/components/LegalView";
import { useColors } from "@/hooks/useColors";

export default function TermsScreen() {
  const colors = useColors();

  return (
    <LegalView title="Terms of Service" lastUpdated="May 15, 2026">
      <Animated.View entering={FadeInDown.delay(80).springify()} style={S.section}>
        <LegalSection title="1. Acceptance of Terms">
          By accessing or using BEXO, you agree to be bound by these Terms of Service and all applicable laws and
          regulations.
        </LegalSection>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()} style={S.section}>
        <LegalSection title="2. User Conduct">
          You are solely responsible for the content you upload and display on your BEXO portfolio. You agree not to
          upload any illegal, offensive, or infringing material.
        </LegalSection>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify()} style={S.section}>
        <LegalSection title="3. Platform Rights">
          BEXO reserves the right to remove any content or account that violates these terms. We provide the platform
          on an "as is" basis without warranties of any kind.
        </LegalSection>
      </Animated.View>

      <Text style={[S.footer, { color: colors.mutedForeground }]}>
        Questions? Contact support@mybexo.com
      </Text>
    </LegalView>
  );
}

const S = StyleSheet.create({
  section: { marginBottom: 4 },
  footer: { fontSize: 14, lineHeight: 22, marginTop: 8 },
});
