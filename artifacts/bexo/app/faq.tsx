import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    a: "Our AI uses Google's most advanced models to read your resume PDF and automatically structure it into a beautiful web layout. No manual entry required.",
  },
  {
    q: "How do I contact support?",
    a: "You can reach us at support@mybexo.com for any technical issues or feedback.",
  },
];

export default function FAQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      <View style={[S.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.foreground }]}>FAQ</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <Animated.Text 
          entering={FadeInDown.delay(100).springify()}
          style={[S.headline, { color: colors.foreground }]}
        >
          Common Questions
        </Animated.Text>
        
        <View style={{ gap: 16 }}>
          {FAQS.map((faq, i) => (
            <Animated.View 
              key={i}
              entering={FadeInDown.delay(150 + i * 50).springify()}
              style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[S.question, { color: colors.foreground }]}>{faq.q}</Text>
              <Text style={[S.answer, { color: colors.mutedForeground }]}>{faq.a}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={[S.footer, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={[S.footerText, { color: colors.mutedForeground }]}>
            Still have questions?
          </Text>
          <TouchableOpacity onPress={() => router.push("mailto:support@mybexo.com")}>
            <Text style={[S.link, { color: colors.primary }]}>support@mybexo.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, gap: 24 },
  headline: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 8 },
  question: { fontSize: 16, fontWeight: "700" },
  answer: { fontSize: 14, lineHeight: 22 },
  footer: { marginTop: 20, alignItems: "center", gap: 4 },
  footerText: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "700" },
});
