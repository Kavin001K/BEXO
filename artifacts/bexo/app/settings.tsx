import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ListRow } from "@/components/ui/ListRow";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { useColors } from "@/hooks/useColors";
import { tapLight, tapMedium } from "@/lib/haptics";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

function SettingsScreen() {
  const colors = useColors();
  const signOut = useAuthStore((s) => s.signOut);
  const { profile, updateProfile } = useProfileStore();

  const toggleNotifications = async (val: boolean) => {
    try {
      await updateProfile({ notifications_enabled: val });
      await tapLight();
    } catch {
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
    <ScreenShell>
      <ScreenHeader showBack title="Settings" />

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Text style={[S.sectionLabel, { color: colors.mutedForeground }]}>Portfolio</Text>
        <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={S.infoRow}>
            <View style={[S.iconBox, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="at-sign" size={16} color={colors.primary} />
            </View>
            <View style={S.infoText}>
              <Text style={[S.infoLabel, { color: colors.foreground }]}>Handle</Text>
              <Text style={[S.infoValue, { color: colors.mutedForeground }]}>
                @{profile?.handle ?? "not set"}
              </Text>
            </View>
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.infoRow}>
            <View style={[S.iconBox, { backgroundColor: colors.secondary }]}>
              <Feather name="globe" size={16} color={colors.primary} />
            </View>
            <View style={S.infoText}>
              <Text style={[S.infoLabel, { color: colors.foreground }]}>Live URL</Text>
              <Text style={[S.infoValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                {profile?.handle ? `${profile.handle}.mybexo.com` : "Setup required"}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()}>
        <Text style={[S.sectionLabel, { color: colors.mutedForeground }]}>Preferences</Text>
        <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={S.infoRow}>
            <View style={S.infoText}>
              <Text style={[S.infoLabel, { color: colors.foreground }]}>Push Notifications</Text>
              <Text style={[S.infoSub, { color: colors.mutedForeground }]}>
                Get alerted on visits and messages
              </Text>
            </View>
            <Switch
              value={profile?.notifications_enabled ?? true}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).springify()}>
        <Text style={[S.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
        <View style={[S.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ListRow icon="user" label="Edit Personal Details" onPress={() => router.push("/edit-profile")} />
          <ListRow icon="help-circle" label="FAQ" onPress={() => router.push("/faq")} />
          <ListRow icon="shield" label="Privacy Policy" onPress={() => router.push("/privacy")} />
          <ListRow icon="file-text" label="Terms of Service" onPress={() => router.push("/terms")} />
          <ListRow
            icon="mail"
            label="Contact Support"
            onPress={() => Linking.openURL("mailto:support@mybexo.com")}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).springify()}>
        <TouchableOpacity
          style={[S.logoutBtn, { borderColor: colors.destructive + "44", backgroundColor: colors.card }]}
          onPress={() => {
            void tapMedium();
            handleLogout();
          }}
        >
          <Feather name="log-out" size={17} color={colors.destructive} />
          <Text style={[S.logoutText, { color: colors.destructive }]}>Log Out</Text>
        </TouchableOpacity>
        <Text style={[S.version, { color: colors.mutedForeground }]}>BEXO v1.0.0 · Build 24</Text>
      </Animated.View>
    </ScreenShell>
  );
}

export default SettingsScreen;

const S = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  listCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 20, paddingHorizontal: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 15, fontWeight: "600" },
  infoValue: { fontSize: 13 },
  infoSub: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  logoutText: { fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: 20 },
});
