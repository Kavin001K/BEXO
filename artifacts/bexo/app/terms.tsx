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

export default function TermsScreen() {
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
        <Text style={[S.headerTitle, { color: colors.foreground }]}>Terms of Service</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <Animated.Text 
          entering={FadeInDown.delay(100).springify()}
          style={[S.headline, { color: colors.foreground }]}
        >
          Terms of Service
        </Animated.Text>
        
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>1. Acceptance of Terms</Text>
          <Text style={[S.body, { color: colors.mutedForeground }]}>
            By accessing or using BEXO, you agree to be bound by these Terms of Service and all applicable laws and regulations.
          </Text>
        </View>

        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>2. User Conduct</Text>
          <Text style={[S.body, { color: colors.mutedForeground }]}>
            You are solely responsible for the content you upload and display on your BEXO portfolio. You agree not to upload any illegal, offensive, or infringing material.
          </Text>
        </View>

        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>3. Platform Rights</Text>
          <Text style={[S.body, { color: colors.mutedForeground }]}>
            BEXO reserves the right to remove any content or account that violates these terms. We provide the platform on an "as is" basis without warranties of any kind.
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
