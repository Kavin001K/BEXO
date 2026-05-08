import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileCard } from "@/components/ui/ProfileCard";
import { UpdateCard } from "@/components/ui/UpdateCard";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { profile, skills, isLoading, fetchProfile } = useProfileStore();
  const { updates, analytics, buildStatus, portfolioUrl, fetchUpdates, fetchBuildStatus, subscribeToBuilds } =
    usePortfolioStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const load = async () => {
    if (!user) return;
    await fetchProfile(user.id);
    if (profile?.id) {
      await fetchUpdates(profile.id);
      await fetchBuildStatus(profile.id);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    fetchUpdates(profile.id);
    fetchBuildStatus(profile.id);
    const unsub = subscribeToBuilds(profile.id);
    return unsub;
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Welcome back
            </Text>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {profile?.full_name?.split(" ")[0] ?? "Student"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={signOut}
          >
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Portfolio status banner */}
        {buildStatus === "done" && portfolioUrl ? (
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient
              colors={["#7C6AFA", "#A06AFA"]}
              style={styles.liveBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveBannerText}>Portfolio Live</Text>
              <Text style={styles.liveBannerUrl}>{profile?.handle}.mybixo.com</Text>
              <Feather name="external-link" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : buildStatus === "building" || buildStatus === "queued" ? (
          <View style={[styles.buildingBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="loader" size={16} color={colors.primary} />
            <Text style={[styles.buildingText, { color: colors.mutedForeground }]}>
              Building your portfolio...
            </Text>
          </View>
        ) : null}

        {/* Profile card */}
        {profile && (
          <ProfileCard
            profile={profile}
            avatarUrl={profile.avatar_url}
            skills={skills.map((s) => s.name)}
          />
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Views", value: analytics.views, icon: "eye" },
            { label: "Clicks", value: analytics.clicks, icon: "mouse-pointer" },
            { label: "Shares", value: analytics.shares, icon: "share-2" },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={stat.icon as any} size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Updates section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Updates</Text>
            <TouchableOpacity onPress={() => router.push("/(main)/update")}>
              <Text style={[styles.sectionAction, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {updates.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="activity" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No updates yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Post achievements, projects, or new roles to keep your portfolio fresh
              </Text>
            </View>
          ) : (
            <View style={styles.updateList}>
              {updates.map((u) => (
                <UpdateCard key={u.id} update={u} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 13, fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6AFAD0",
  },
  liveBannerText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  liveBannerUrl: { color: "rgba(255,255,255,0.75)", fontSize: 12, flex: 1 },
  buildingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  buildingText: { fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionAction: { fontSize: 14, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  updateList: { gap: 10 },
});
