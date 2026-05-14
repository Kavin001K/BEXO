import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

interface LegalViewProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const LegalView = ({ title, lastUpdated, children }: LegalViewProps) => {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={["rgba(124, 106, 250, 0.05)", "transparent"]} 
        style={StyleSheet.absoluteFill} 
      />
      
      <SafeAreaView style={S.safeArea}>
        <View style={S.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[S.backButton, { backgroundColor: colors.card }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[S.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>

        <ScrollView 
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={S.contentCard}>
            <Text style={[S.title, { color: colors.text }]}>{title}</Text>
            <Text style={[S.updated, { color: colors.mutedForeground }]}>Last Updated: {lastUpdated}</Text>
            
            <View style={[S.divider, { backgroundColor: colors.border }]} />
            
            <View style={S.body}>
              {children}
            </View>
          </View>
          
          <View style={S.footer}>
            <Text style={[S.footerText, { color: colors.mutedForeground }]}>
              © {new Date().getFullYear()} BEXO OS. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contentCard: {
    marginTop: 10,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  updated: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 24,
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 24,
  },
  body: {
    gap: 24,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionBody: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "400",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
