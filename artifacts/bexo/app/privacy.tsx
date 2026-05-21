import React from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { LegalSection, LegalView } from "@/components/LegalView";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();

  return (
    <LegalView title="Privacy Policy" lastUpdated="May 15, 2026">
      <Animated.View entering={FadeInDown.delay(80).springify()} style={S.section}>
        <LegalSection title="1. Information We Collect">
          We collect information you provide directly when you create an account, such as your name, email, and resume
          data. When you use BEXO, we automatically collect certain technical information about your device and how you
          interact with our platform.
        </LegalSection>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()} style={S.section}>
        <LegalSection title="2. How We Use Your Data">
          Your data is used to generate your public portfolio and improve our AI parsing capabilities. We do not sell
          your personal data to third parties.
        </LegalSection>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify()} style={S.section}>
        <LegalSection title="3. Public Visibility">
          By default, the information you provide for your portfolio is intended to be public. Please ensure you do not
          share sensitive personal information if you do not want it visible online.
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
