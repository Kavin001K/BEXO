import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, Switch
} from "react-native";
import * as Linking from "expo-linking";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useProfileStore } from "@/stores/useProfileStore";
import { useAuthStore } from "@/stores/useAuthStore";

function SettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const { profile, updateProfile } = useProfileStore();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const toggleVisibility = async (val: boolean) => {
    try {
      await updateProfile({ is_public: val });
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      Alert.alert("Error", "Failed to update visibility");
    }
  };

  const toggleNotifications = async (val: boolean) => {
    try {
      await updateProfile({ notifications_enabled: val });
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      Alert.alert("Error", "Failed to update notifications");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      <View style={[S.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* --- PORTFOLIO --- */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <Text style={[S.sectionLabel, { color: colors.mutedForeground }]}>PORTFOLIO</Text>
          <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={S.infoRow}>
              <View style={[S.iconBox, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="at-sign" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[S.infoLabel, { color: colors.foreground }]}>Handle</Text>
                <Text style={[S.infoValue, { color: colors.mutedForeground }]}>@{profile?.handle ?? "not set"}</Text>
              </View>
            </View>
            <View style={[S.divider, { backgroundColor: colors.border }]} />
            <View style={S.infoRow}>
              <View style={[S.iconBox, { backgroundColor: "#6AFAD015" }]}>
                <Feather name="globe" size={16} color="#6AFAD0" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[S.infoLabel, { color: colors.foreground }]}>Live URL</Text>
                <Text style={[S.infoValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {profile?.handle ? `${profile.handle}.mybexo.com` : "Setup required"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* --- SETTINGS --- */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Text style={[S.sectionLabel, { color: colors.mutedForeground }]}>PREFERENCES</Text>
          <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={S.infoRow}>
              <View style={{ flex: 1 }}>
                <Text style={[S.infoLabel, { color: colors.foreground }]}>Push Notifications</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Get alerted on visits & messages</Text>
              </View>
              <Switch 
                value={profile?.notifications_enabled ?? true} 
                onValueChange={toggleNotifications}
                trackColor={{ false: "#333", true: colors.primary }}
              />
            </View>
          </View>
        </Animated.View>

        {/* --- ACTIONS --- */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={{ gap: 8 }}>
          {[
            { label: "Edit Personal Details", icon: "user",   route: "/edit-profile" },
            { label: "FAQ",                icon: "help-circle", route: "/faq" },
            { label: "Privacy Policy",      icon: "shield", route: "/privacy" },
            { label: "Terms of Service",    icon: "file-text", route: "/terms" },
            { label: "Contact Support",     icon: "mail", route: "mailto:support@mybexo.com" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[S.navItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                if (item.route.startsWith("http") || item.route.startsWith("mailto")) {
                  Linking.openURL(item.route);
                } else {
                  router.push(item.route as any);
                }
              }}
            >
              <Feather name={item.icon as any} size={16} color={colors.mutedForeground} />
              <Text style={[S.navLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <TouchableOpacity style={[S.logoutBtn, { borderColor: "#FA6A6A" }]} onPress={handleLogout}>
            <Feather name="log-out" size={17} color="#FA6A6A" />
            <Text style={S.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>


        <Text style={[S.version, { color: colors.mutedForeground }]}>BEXO v1.0.0 • Build 24</Text>
      </ScrollView>
    </View>
  );
}

export default SettingsScreen;

const S = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, gap: 24 },
  sectionLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  infoLabel: { fontSize: 15, fontWeight: "600" },
  infoValue: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginHorizontal: 16 },
  chartIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  navItem: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 12 },
  logoutText: { color: "#FA6A6A", fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: 20, opacity: 0.4 },
});
