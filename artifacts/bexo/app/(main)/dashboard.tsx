import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileCompletenessBanner } from "@/components/home/ProfileCompletenessBanner";
import { MissingInfoFlow } from "@/components/home/MissingInfoFlow";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { UpdateCard } from "@/components/ui/UpdateCard";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[style, { width: 8, height: 8, borderRadius: 4, backgroundColor: color }]} />
  );
}

export default function DashboardScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const user    = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { profile, education, experiences, projects, skills, fetchProfile, getCompletionResult } = useProfileStore();
  const { updates, analytics, buildStatus, portfolioUrl, fetchUpdates, fetchBuildStatus, subscribeToBuilds } =
    usePortfolioStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showMissingFlow, setShowMissingFlow] = useState(false);

  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  // Memoize completion result to prevent jank on every render
  const completionResult = useMemo(
    () => getCompletionResult(),
    [profile, education, experiences, projects, skills]
  );

  // Single effect: runs when user is available, avoids duplicate fetches
  useEffect(() => {
    if (!user?.id) return;

    let unsubBuilds: (() => void) | null = null;

    const init = async () => {
      setIsDashboardLoading(true);
      await fetchProfile(user.id);
      const { profile: p } = useProfileStore.getState();

      if (!p || !p.handle) {
        router.replace("/(onboarding)/handle");
        return;
      }

      await Promise.all([
        fetchUpdates(p.id),
        fetchBuildStatus(p.id),
      ]);

      unsubBuilds = subscribeToBuilds(p.id);
      setIsDashboardLoading(false);
    };

    init();

    return () => {
      unsubBuilds?.();
    };
  }, [user?.id]);

  // Show loading spinner until dashboard data is ready
  if (isDashboardLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 16 }}
          />
        </Animated.View>
      </View>
    );
  }

  const onRefresh = async () => {
    if (!user?.id || !profile?.id) return;
    setRefreshing(true);
    await Promise.all([
      fetchProfile(user.id),
      fetchUpdates(profile.id),
      fetchBuildStatus(profile.id),
    ]);
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!profile?.handle) {
      Alert.alert("Not ready", "Complete your profile setup first.");
      return;
    }
    const url  = `https://${profile.handle}.mybexo.com`;
    const name = profile.full_name ?? profile.handle;
    try {
      await Share.share(
        { message: `Check out ${name}'s portfolio: ${url}`, url, title: `${name}'s Portfolio` },
        { dialogTitle: "Share your portfolio" }
      );
    } catch {}
  };

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <View style={styles.headerTitle}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.headerLogo}
            />
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Welcome back</Text>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {profile?.full_name?.split(" ")[0] ?? "Student"} 👋
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleShare}
            >
              <Feather name="share-2" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push("/portfolio")}
            >
              <Feather name="user" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Profile completeness banner (shown when < 80%) */}
        {!completionResult.isPassing && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <ProfileCompletenessBanner
              result={completionResult}
              onCompletePress={() => setShowMissingFlow(true)}
            />
          </Animated.View>
        )}

        {/* Portfolio status banner */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          {buildStatus === "done" && portfolioUrl ? (
            <TouchableOpacity
              onPress={() => router.push("/portfolio")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <LinearGradient
                colors={["#7C6AFA", "#A06AFA"]}
                style={styles.liveBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.liveDot} />
                <Text style={styles.liveBannerText}>Portfolio Live</Text>
                <Text style={styles.liveBannerUrl}>{profile?.handle}.mybexo.com</Text>
                <Feather name="external-link" size={15} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>
          ) : buildStatus === "building" || buildStatus === "queued" ? (
            <View style={[styles.buildingBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PulsingDot color={colors.primary} />
              <Text style={[styles.buildingText, { color: colors.mutedForeground }]}>
                Building your portfolio…
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Profile card */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <ProfileCard
              profile={profile}
              avatarUrl={profile.avatar_url}
              skills={skills.map((s) => s.name)}
              onEdit={() => router.push("/edit-profile")}
            />
          </Animated.View>
        )}

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.statsRow}>
          {[
            { label: "Views",  value: analytics.views,  icon: "eye"           as const },
            { label: "Clicks", value: analytics.clicks, icon: "mouse-pointer" as const },
            { label: "Shares", value: analytics.shares, icon: "share-2"       as const },
          ].map((stat, i) => (
            <Animated.View
              key={stat.label}
              entering={FadeInDown.delay(240 + i * 60).springify()}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name={stat.icon} size={15} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.quickActions}>
          {[
            { label: "Edit Profile",    icon: "edit-3" as const, route: "/edit-profile" },
            { label: "View Portfolio",  icon: "globe"  as const, route: "/portfolio"    },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="edit-3" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{action.label}</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Updates section */}
        <Animated.View entering={FadeInDown.delay(440).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activity</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
              onPress={() => router.push("/update")}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="plus" size={13} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {updates.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
                <Feather name="activity" size={24} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No updates yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Post achievements, projects, or new roles to keep your portfolio fresh
              </Text>
              <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(main)/update")}
              >
                <Text style={styles.emptyActionText}>Post your first update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.updateList}>
              {updates.map((u, i) => (
                <Animated.View key={u.id} entering={FadeInDown.delay(i * 50).springify()}>
                  <UpdateCard update={u} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Missing info flow modal */}
      <MissingInfoFlow
        visible={showMissingFlow}
        missingFields={completionResult.missingFields}
        onClose={() => setShowMissingFlow(false)}
        onDone={async () => {
          setShowMissingFlow(false);
          // Re-fetch profile so the completion score updates immediately
          if (user?.id) await fetchProfile(user.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: { width: 44, height: 44, borderRadius: 12 },
  greeting: { fontSize: 13, fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  liveBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 16, borderRadius: 16,
    ...Platform.select({
      ios:     { shadowColor: "#7C6AFA", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
      web:     { boxShadow: "0 6px 20px rgba(124,106,250,0.3)" },
    }),
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#6AFAD0" },
  liveBannerText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  liveBannerUrl: { color: "rgba(255,255,255,0.75)", fontSize: 12, flex: 1 },
  buildingBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  buildingText: { fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center", gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  quickActions: { gap: 8 },
  quickBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  quickIcon: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  quickLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  addBtnText: { fontSize: 13, fontWeight: "600" },
  emptyState: {
    alignItems: "center", padding: 32, borderRadius: 20, borderWidth: 1, gap: 10,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 260 },
  emptyAction: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyActionText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  updateList: { gap: 10 },
});
