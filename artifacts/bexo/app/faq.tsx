import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

const FAQS = [
  {
    q: "How do I claim my handle?",
    a: "Your handle is claimed during onboarding. It becomes your unique sub-domain (e.g., yourname.mybexo.com). You can edit it once every 30 days in settings.",
  },
  {
    q: "Is my portfolio public?",
    a: "Yes, BEXO portfolios are public by default to ensure maximum visibility for your personal brand. You can choose to unpublish individual sections or the entire profile if needed.",
  },
  {
    q: "Can I use a custom domain?",
    a: "Currently, we provide a free .mybexo.com subdomain. Custom domain support is coming soon for Pro users.",
  },
  {
    q: "How does the AI parser work?",
    a: "Our AI reads your resume PDF and automatically structures it into a beautiful web layout. No manual entry required.",
  },
  {
    q: "How do I contact support?",
    a: "You can reach us at support@mybexo.com for any technical issues or feedback.",
  },
];

export default function FAQScreen() {
  const colors = useColors();

  return (
    <ScreenShell>
      <ScreenHeader showBack title="FAQ" subtitle="Common questions about BEXO" />

      <View style={styles.list}>
        {FAQS.map((faq, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(100 + i * 40).springify()}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.question, { color: colors.foreground }]}>{faq.q}</Text>
            <Text style={[styles.answer, { color: colors.mutedForeground }]}>{faq.a}</Text>
          </Animated.View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Still have questions?</Text>
        <TouchableOpacity onPress={() => router.push("mailto:support@mybexo.com")}>
          <Text style={[styles.link, { color: colors.primary }]}>support@mybexo.com</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, marginTop: 4 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 8 },
  question: { fontSize: 16, fontWeight: "700", fontFamily: fonts.sansBold },
  answer: { fontSize: 14, lineHeight: 22 },
  footer: { alignItems: "center", gap: 4, marginTop: 28, paddingBottom: 16 },
  footerText: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "700" },
});
