import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import Animated, {
  FadeIn, FadeInDown, FadeInRight,
  useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MissingInfoFlow }           from "@/components/home/MissingInfoFlow";
import { ProfileCompletenessBanner } from "@/components/home/ProfileCompletenessBanner";
import { UpdateCard }                 from "@/components/ui/UpdateCard";
import { useColors }                  from "@/hooks/useColors";
import { useAuthStore }               from "@/stores/useAuthStore";
import { usePortfolioStore }          from "@/stores/usePortfolioStore";
import { useProfileStore }            from "@/stores/useProfileStore";
import { showErrorAlert }             from "@/lib/errorUtils";

function LiveDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 600 }),
        withTiming(1,   { duration: 600 })
      ), -1, true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, { width: 8, height: 8, borderRadius: 4, backgroundColor: color }]} />;
}

const StatCard = React.memo(function StatCard({ icon, value, label, color, delay }: {
  icon: any; value: number | string; label: string; color: string; delay: number;
}) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[S.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[S.statIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={[S.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[S.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Animated.View>
  );
});

const QuickAction = React.memo(function QuickAction({ icon, label, sublabel, onPress, accent, delay }: {
  icon: any; label: string; sublabel?: string;
  onPress: () => void; accent?: string; delay: number;
}) {
  const colors = useColors();
  const scale  = useSharedValue(1);
  const style  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()} style={style}>
      <TouchableOpacity
        style={[S.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          scale.value = withSequence(withTiming(0.96, { duration: 80 }), withTiming(1, { duration: 120 }));
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={1}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[S.qaIcon, { backgroundColor: (accent ?? colors.primary) + "22" }]}>
          <Feather name={icon} size={18} color={accent ?? colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[S.qaLabel, { color: colors.foreground }]}>{label}</Text>
          {sublabel ? <Text style={[S.qaSub, { color: colors.mutedForeground }]}>{sublabel}</Text> : null}
        </View>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function DashboardScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const user    = useAuthStore((s) => s.user);

  const { profile, skills, education, experiences, projects,
          fetchProfile, getCompletionResult } = useProfileStore();
  const { updates, analytics, buildStatus, portfolioUrl,
          fetchUpdates, fetchBuildStatus, subscribeToBuilds } = usePortfolioStore();

  const [refreshing,     setRefreshing]     = useState(false);
  const [showMissing,    setShowMissing]    = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);

  const params  = useLocalSearchParams<{ onboarding_complete?: string }>();

  const completionResult = useMemo(
    () => getCompletionResult(),
    [profile, education, experiences, projects, skills]
  );

  useEffect(() => {
    if (params.onboarding_complete === "true") {
      Alert.alert(
        "Website building in progress!",
        "Your portfolio is being created. We'll notify you once it's live and ready to share!",
        [{ text: "Great!", onPress: () => router.setParams({ onboarding_complete: undefined }) }]
      );
    }
  }, [params.onboarding_complete]);

  useEffect(() => {
    if (!user?.id) return;
    let unsubBuilds: (() => void) | undefined;

    const init = async () => {
      try {
        await fetchProfile(user.id!);
        const p = useProfileStore.getState().profile;

        if (!p || !p.handle) {
          router.replace("/(onboarding)/handle");
          return;
        }

        await Promise.all([
          fetchUpdates(p.id),
          fetchBuildStatus(p.id),
        ]);

        unsubBuilds = subscribeToBuilds(p.id);
        setDashboardReady(true);
      } catch (e: any) {
        showErrorAlert(e, "Dashboard Sync Failed");
      }
    };

    init();
    return () => unsubBuilds?.();
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchProfile(user.id);
    const p = useProfileStore.getState().profile;
    if (p?.id) {
      try {
        await Promise.all([fetchUpdates(p.id), fetchBuildStatus(p.id)]);
      } catch (e: any) {
        showErrorAlert(e, "Refresh Failed");
      }
    }
    setRefreshing(false);
  }, [user?.id]);

  const handleShare = useCallback(async () => {
    if (!profile?.handle) return;
    const { Share } = await import("react-native");
    const url  = `https://${profile.handle}.mybexo.com`;
    const name = profile.full_name ?? profile.handle;
    Share.share({ message: `Check out ${name}'s portfolio: ${url}`, url });
  }, [profile]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  if (!dashboardReady) {
    return (
      <View style={[S.loadingScreen, { backgroundColor: colors.background }]}>
        <Animated.View entering={FadeIn.duration(400)} style={S.loadingInner}>
          <Text style={[S.loadingText, { color: colors.mutedForeground }]}>Loading your portfolio…</Text>
        </Animated.View>
      </View>
    );
  }

  const firstName = useMemo(() => profile?.full_name?.split(" ")[0] ?? "Student", [profile?.full_name]);
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const isLive     = buildStatus === "done" && !!portfolioUrl;
  const isBuilding = buildStatus === "building" || buildStatus === "queued";

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingTop: topPad + 16, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={S.header}>
          <View style={S.headerLeft}>
            <View>
              <Text style={[S.greeting, { color: colors.mutedForeground }]}>
                {greeting},
              </Text>
              <Text style={[S.userName, { color: colors.foreground }]}>
                {firstName}
              </Text>
            </View>
          </View>
          <View style={S.headerRight}>
            <View style={S.brandContainer}>
              <Image 
                source={require("../../assets/images/icon.png")} 
                style={{ width: 20, height: 20, borderRadius: 5 }} 
                contentFit="cover" 
              />
              <Text style={[S.appName, { color: colors.mutedForeground }]}>BEXO</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.navigate("/settings")} 
              activeOpacity={0.8}
              style={[S.avatarThumb, { borderColor: colors.primary + "44" }]}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={S.avatarThumbImg} contentFit="cover" />
              ) : (
                <Text style={[S.avatarInitial, { color: colors.primary }]}>
                  {firstName[0]?.toUpperCase() ?? "B"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Portfolio status card */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          {isLive ? (
            <TouchableOpacity onPress={() => router.push("/(main)/portfolio")} activeOpacity={0.9}>
              <LinearGradient
                colors={["#7C6AFA", "#FA6A6A"]}
                style={S.liveCard}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={S.liveInfo}>
                  <View style={S.liveStatusRow}>
                    <LiveDot color="#6AFAD0" />
                    <Text style={S.liveLabel}>Portfolio Live</Text>
                  </View>
                  <Text style={S.liveUrl}>{profile?.handle}.mybexo.com</Text>
                </View>
                <View style={S.liveActions}>
                  <TouchableOpacity onPress={handleShare} style={S.liveActionBtn}>
                    <Feather name="share-2" size={16} color="#fff" />
                  </TouchableOpacity>
                  <View style={S.liveActionBtn}>
                    <Feather name="chevron-right" size={18} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : isBuilding ? (
            <View style={[S.buildingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LiveDot color={colors.primary} />
              <Text style={[S.buildingText, { color: colors.mutedForeground }]}>Building your portfolio…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[S.buildPromptCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(main)/portfolio")}
            >
              <LinearGradient
                colors={[colors.primary + "15", "transparent"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <View style={[S.bpIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="globe" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.bpLabel, { color: colors.foreground }]}>Generate Portfolio</Text>
                <Text style={[S.bpSub, { color: colors.mutedForeground }]}>Build your live site in 90 seconds</Text>
              </View>
              <Feather name="arrow-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Profile completion banner */}
        {!completionResult.isPassing && (
          <Animated.View entering={FadeInDown.delay(140).springify()}>
            <ProfileCompletenessBanner
              result={completionResult}
              onCompletePress={() => setShowMissing(true)}
            />
          </Animated.View>
        )}

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={S.statsRow}>
          <StatCard icon="eye"          value={analytics.views}  label="Views"  color="#7C6AFA" delay={220} />
          <StatCard icon="mouse-pointer" value={analytics.clicks} label="Clicks" color="#FA6A6A" delay={260} />
          <StatCard icon="share-2"      value={analytics.shares} label="Shares" color="#6AFAD0" delay={300} />
        </Animated.View>

        {/* Quick actions */}
        <View style={S.section}>
          <Animated.Text entering={FadeInDown.delay(320).springify()} style={[S.sectionTitle, { color: colors.foreground }]}>
            Quick Actions
          </Animated.Text>
          <QuickAction
            icon="edit-3" label="Edit Profile" sublabel="Update your professional info"
            onPress={() => router.navigate("/edit-profile")} delay={340}
          />
          <QuickAction
            icon="layers" label="My Portfolio" sublabel="View, manage & rebuild site"
            onPress={() => router.navigate("/(main)/portfolio")} delay={370}
          />
          <QuickAction
            icon="plus-circle" label="Post an Update" sublabel="Certificate, project or award"
            accent="#FA6A6A"
            onPress={() => router.navigate("/(main)/update")} delay={400}
          />
        </View>

        {/* Portfolio snapshot chips */}
        {(education.length > 0 || experiences.length > 0 || projects.length > 0) && (
          <Animated.View entering={FadeInDown.delay(420).springify()} style={S.section}>
            <Text style={[S.sectionTitle, { color: colors.foreground }]}>Portfolio Snapshot</Text>
            <View style={S.chipRow}>
              {education.length > 0 && (
                <TouchableOpacity
                  style={[S.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    usePortfolioStore.getState().setActivePortfolioTab("education");
                    router.navigate("/(main)/portfolio");
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                >
                  <View style={[S.chipIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="book" size={10} color={colors.primary} />
                  </View>
                  <Text style={[S.chipText, { color: colors.foreground }]}>{education.length} Education</Text>
                </TouchableOpacity>
              )}
              {experiences.length > 0 && (
                <TouchableOpacity
                  style={[S.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    usePortfolioStore.getState().setActivePortfolioTab("experience");
                    router.navigate("/(main)/portfolio");
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                >
                  <View style={[S.chipIcon, { backgroundColor: "#FA6A6A15" }]}>
                    <Feather name="briefcase" size={10} color="#FA6A6A" />
                  </View>
                  <Text style={[S.chipText, { color: colors.foreground }]}>{experiences.length} Experience</Text>
                </TouchableOpacity>
              )}
              {projects.length > 0 && (
                <TouchableOpacity
                  style={[S.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    usePortfolioStore.getState().setActivePortfolioTab("projects");
                    router.navigate("/(main)/portfolio");
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                >
                  <View style={[S.chipIcon, { backgroundColor: "#6AFAD015" }]}>
                    <Feather name="code" size={10} color="#6AFAD0" />
                  </View>
                  <Text style={[S.chipText, { color: colors.foreground }]}>{projects.length} Projects</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Activity updates */}
        <Animated.View entering={FadeInDown.delay(460).springify()} style={S.section}>
          <View style={S.sectionRow}>
            <Text style={[S.sectionTitle, { color: colors.foreground }]}>Activity Feed</Text>
            <TouchableOpacity
              style={[S.addChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "33" }]}
              onPress={() => router.navigate("/(main)/update")}
            >
              <Feather name="plus" size={12} color={colors.primary} />
              <Text style={[S.addChipText, { color: colors.primary }]}>Post</Text>
            </TouchableOpacity>
          </View>

          {updates.length === 0 ? (
            <View style={[S.emptyActivity, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[S.emptyIconWrap, { backgroundColor: colors.surface }]}>
                <Feather name="activity" size={24} color={colors.mutedForeground} />
              </View>
              <Text style={[S.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
              <Text style={[S.emptySub, { color: colors.mutedForeground }]}>
                Post updates to keep your portfolio fresh and engaging for recruiters.
              </Text>
              <TouchableOpacity
                style={[S.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.navigate("/(main)/update")}
              >
                <Text style={S.emptyBtnText}>Post first update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {updates.map((u, i) => (
                <Animated.View key={u.id} entering={FadeInDown.delay(480 + i * 40).springify()}>
                  <UpdateCard update={u} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <Animated.View entering={FadeIn.delay(600).springify()} style={[S.fab, { bottom: botPad + 16 }]}>
        <TouchableOpacity
          style={[S.fabBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(main)/update");
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#7C6AFA", "#FA6A6A"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <MissingInfoFlow
        visible={showMissing}
        missingFields={completionResult.missingFields}
        onClose={() => setShowMissing(false)}
        onDone={async () => {
          setShowMissing(false);
          if (user?.id) await fetchProfile(user.id);
        }}
      />
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingInner: { alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end", gap: 10 },
  brandContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    backgroundColor: "rgba(255,255,255,0.05)", 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  avatarThumb: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#1A1A24" },
  avatarThumbImg: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { fontSize: 20, fontWeight: "900" },
  appName: { fontSize: 11, fontWeight: "900", letterSpacing: 2, opacity: 0.8 },
  greeting: { fontSize: 14, fontWeight: "600", marginBottom: -2, opacity: 0.6 },
  userName: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  liveCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 22, borderRadius: 24,
    ...Platform.select({
      web:     { boxShadow: "0 12px 40px rgba(124,106,250,0.4)" },
      default: { shadowColor: "#7C6AFA", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 10 },
    }),
  },
  liveInfo: { gap: 4 },
  liveStatusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveLabel: { color: "#fff", fontWeight: "900", fontSize: 17, letterSpacing: -0.3 },
  liveUrl: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  liveActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  buildingCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, borderWidth: 1 },
  buildingText: { fontSize: 15, fontWeight: "600" },
  buildPromptCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20, borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  bpIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  bpLabel: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  bpSub: { fontSize: 13, marginTop: 2, opacity: 0.8 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 24, borderWidth: 1, padding: 18, alignItems: "center", gap: 8, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: "700", opacity: 0.7 },
  section: { gap: 14, marginTop: 8 },
  sectionTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.4 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  addChipText: { fontSize: 13, fontWeight: "800" },
  quickAction: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 22, borderWidth: 1, elevation: 1 },
  qaIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  qaLabel: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  qaSub: { fontSize: 13, marginTop: 2, opacity: 0.7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  chipIcon: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 14, fontWeight: "800" },
  emptyActivity: { alignItems: "center", padding: 44, borderRadius: 28, borderWidth: 1, gap: 14 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 24, maxWidth: 280, opacity: 0.7 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24, marginTop: 10 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  fab: { position: "absolute", right: 20 },
  fabBtn: {
    width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...Platform.select({
      web:     { boxShadow: "0 12px 36px rgba(124,106,250,0.55)" },
      default: { shadowColor: "#7C6AFA", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 14 },
    }),
  },
});
