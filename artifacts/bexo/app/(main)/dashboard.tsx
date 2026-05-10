import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
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

function StatCard({ icon, value, label, color, delay }: {
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
}

function QuickAction({ icon, label, sublabel, onPress, accent, delay }: {
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
}

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

  const completionResult = useMemo(
    () => getCompletionResult(),
    [profile, education, experiences, projects, skills]
  );

  useEffect(() => {
    if (!user?.id) return;
    let unsubBuilds: (() => void) | undefined;

    const init = async () => {
      await fetchProfile(user.id);
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
    };

    init();
    return () => unsubBuilds?.();
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchProfile(user.id);
    const p = useProfileStore.getState().profile;
    if (p?.id) await Promise.all([fetchUpdates(p.id), fetchBuildStatus(p.id)]);
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

  const firstName  = profile?.full_name?.split(" ")[0] ?? "Student";
  const timeOfDay  = new Date().getHours();
  const greeting   = timeOfDay < 12 ? "Good morning" : timeOfDay < 18 ? "Good afternoon" : "Good evening";
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
            <TouchableOpacity onPress={() => router.push("/(main)/settings")} activeOpacity={0.8}>
              <View style={[S.avatarThumb, { borderColor: colors.primary }]}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={S.avatarThumbImg} contentFit="cover" />
                ) : (
                  <Text style={[S.avatarInitial, { color: colors.primary }]}>
                    {firstName[0]?.toUpperCase() ?? "B"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            <View>
              <Text style={[S.greeting, { color: colors.mutedForeground }]}>{greeting},</Text>
              <Text style={[S.name, { color: colors.foreground }]}>{firstName}</Text>
            </View>
          </View>
          <View style={S.headerRight}>
            {isLive && (
              <TouchableOpacity
                style={[S.headerBtn, { backgroundColor: "#6AFAD022", borderColor: "#6AFAD044" }]}
                onPress={handleShare}
              >
                <Feather name="share-2" size={16} color="#6AFAD0" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[S.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push("/(main)/settings")}
            >
              <Feather name="settings" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Portfolio status card */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          {isLive ? (
            <TouchableOpacity onPress={() => router.push("/(main)/portfolio")} activeOpacity={0.88}>
              <LinearGradient
                colors={["#7C6AFA", "#A06AFA"]}
                style={S.liveCard}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <LiveDot color="#6AFAD0" />
                <View style={{ flex: 1 }}>
                  <Text style={S.liveLabel}>Portfolio Live</Text>
                  <Text style={S.liveUrl}>{profile?.handle}.mybexo.com</Text>
                </View>
                <TouchableOpacity onPress={handleShare}>
                  <Feather name="share-2" size={16} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
                <Feather name="external-link" size={16} color="rgba(255,255,255,0.8)" />
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
                colors={["#7C6AFA11", "transparent"]}
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
            icon="edit-3" label="Edit Profile" sublabel="Update your info"
            onPress={() => router.push("/(main)/edit-profile")} delay={340}
          />
          <QuickAction
            icon="layers" label="My Portfolio" sublabel="View, edit & rebuild"
            onPress={() => router.push("/(main)/portfolio")} delay={370}
          />
          <QuickAction
            icon="plus-circle" label="Post an Update" sublabel="Share a project or achievement"
            accent="#FA6A6A"
            onPress={() => router.push("/(main)/update")} delay={400}
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
                  onPress={() => router.push({ pathname: "/(main)/edit-profile", params: { tab: "education" } })}
                >
                  <Feather name="book" size={12} color={colors.primary} />
                  <Text style={[S.chipText, { color: colors.foreground }]}>{education.length} Education</Text>
                </TouchableOpacity>
              )}
              {experiences.length > 0 && (
                <TouchableOpacity
                  style={[S.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: "/(main)/edit-profile", params: { tab: "experience" } })}
                >
                  <Feather name="briefcase" size={12} color="#FA6A6A" />
                  <Text style={[S.chipText, { color: colors.foreground }]}>{experiences.length} Experience</Text>
                </TouchableOpacity>
              )}
              {projects.length > 0 && (
                <TouchableOpacity
                  style={[S.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: "/(main)/edit-profile", params: { tab: "projects" } })}
                >
                  <Feather name="code" size={12} color="#6AFAD0" />
                  <Text style={[S.chipText, { color: colors.foreground }]}>{projects.length} Projects</Text>
                </TouchableOpacity>
              )}
              {skills.length > 0 && (
                <TouchableOpacity
                  style={[S.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: "/(main)/edit-profile", params: { tab: "skills" } })}
                >
                  <Feather name="zap" size={12} color="#FAD06A" />
                  <Text style={[S.chipText, { color: colors.foreground }]}>{skills.length} Skills</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Activity updates */}
        <Animated.View entering={FadeInDown.delay(460).springify()} style={S.section}>
          <View style={S.sectionRow}>
            <Text style={[S.sectionTitle, { color: colors.foreground }]}>Activity</Text>
            <TouchableOpacity
              style={[S.addChip, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
              onPress={() => router.push("/(main)/update")}
            >
              <Feather name="plus" size={12} color={colors.primary} />
              <Text style={[S.addChipText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {updates.length === 0 ? (
            <View style={[S.emptyActivity, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="activity" size={28} color={colors.mutedForeground} />
              <Text style={[S.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
              <Text style={[S.emptySub, { color: colors.mutedForeground }]}>
                Post projects, achievements, or role updates to keep your portfolio fresh
              </Text>
              <TouchableOpacity
                style={[S.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(main)/update")}
              >
                <Text style={S.emptyBtnText}>Post first update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
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
          <Feather name="plus" size={22} color="#fff" />
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
  scroll: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerRight: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarThumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#1A1A24" },
  avatarThumbImg: { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: { fontSize: 18, fontWeight: "800" },
  greeting: { fontSize: 12, fontWeight: "500" },
  name: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  liveCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16, borderRadius: 16,
    ...Platform.select({
      web:     { boxShadow: "0 6px 20px rgba(124,106,250,0.3)" },
      default: { shadowColor: "#7C6AFA", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    }),
  },
  liveLabel: { color: "#fff", fontWeight: "700", fontSize: 14 },
  liveUrl: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  buildingCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  buildingText: { fontSize: 14 },
  buildPromptCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  bpIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bpLabel: { fontSize: 15, fontWeight: "700" },
  bpSub: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  addChipText: { fontSize: 12, fontWeight: "600" },
  quickAction: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  qaIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  qaLabel: { fontSize: 14, fontWeight: "600" },
  qaSub: { fontSize: 12, marginTop: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  emptyActivity: { alignItems: "center", padding: 32, borderRadius: 20, borderWidth: 1, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 240 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  fab: { position: "absolute", right: 20 },
  fabBtn: {
    width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", overflow: "hidden",
    ...Platform.select({
      web:     { boxShadow: "0 8px 24px rgba(124,106,250,0.45)" },
      default: { shadowColor: "#7C6AFA", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 },
    }),
  },
});
