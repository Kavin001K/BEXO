import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

interface LegalViewProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const LegalView = ({ title, lastUpdated, children }: LegalViewProps) => {
  const colors = useColors();

  return (
    <ScreenShell>
      <ScreenHeader showBack title={title} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scrollContent}>
        <View style={[S.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[S.updated, { color: colors.mutedForeground }]}>Last updated: {lastUpdated}</Text>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.body}>{children}</View>
        </View>
        <Text style={[S.footerText, { color: colors.mutedForeground }]}>
          © {new Date().getFullYear()} BEXO. All rights reserved.
        </Text>
      </ScrollView>
    </ScreenShell>
  );
};

export const LegalSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const colors = useColors();
  return (
    <View style={S.section}>
      <Text style={[S.sectionTitle, { color: colors.primary }]}>{title}</Text>
      <Text style={[S.sectionBody, { color: colors.secondaryForeground }]}>{children}</Text>
    </View>
  );
};

const S = StyleSheet.create({
  scrollContent: { paddingBottom: 40, gap: 24 },
  contentCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  updated: { fontSize: 14, fontWeight: "500" },
  divider: { height: StyleSheet.hairlineWidth, width: "100%" },
  body: { gap: 24 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: fonts.sansBold,
    letterSpacing: 0.3,
  },
  sectionBody: { fontSize: 15, lineHeight: 24 },
  footerText: { fontSize: 13, textAlign: "center", fontWeight: "500" },
});
