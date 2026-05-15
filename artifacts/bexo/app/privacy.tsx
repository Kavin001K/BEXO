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

export default function PrivacyScreen() {
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
        <Text style={[S.headerTitle, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <Animated.Text 
          entering={FadeInDown.delay(100).springify()}
          style={[S.headline, { color: colors.foreground }]}
        >
          Privacy Policy
        </Animated.Text>
        
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>1. Information We Collect</Text>
          <Text style={[S.body, { color: colors.mutedForeground }]}>
            We collect information you provide directly to us when you create an account, such as your name, email, and resume data. When you use BEXO, we automatically collect certain technical information about your device and how you interact with our platform.
          </Text>
        </View>

        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>2. How We Use Your Data</Text>
          <Text style={[S.body, { color: colors.mutedForeground }]}>
            Your data is used to generate your public portfolio and improve our AI parsing capabilities. We do not sell your personal data to third parties.
          </Text>
        </View>

        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>3. Public Visibility</Text>
          <Text style={[S.body, { color: colors.mutedForeground }]}>
            By default, the information you provide for your portfolio is intended to be public. Please ensure you do not share sensitive personal information (like home addresses) if you do not want them to be visible online.
          </Text>
        </View>

        <View style={[S.footer, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={[S.body, { color: colors.mutedForeground }]}>
            Last updated: May 15, 2026. For questions, contact support@mybexo.com
          </Text>
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
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 22 },
  footer: { marginTop: 20 },
});
