import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RebuildModal } from "@/components/portfolio/RebuildModal";
import { SkillTag } from "@/components/ui/SkillTag";
import { useColors } from "@/hooks/useColors";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

type TabId = "overview" | "experience" | "projects" | "skills";

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, education, experiences, projects, skills, isLoading } = useProfileStore();
  const { buildStatus, portfolioUrl, activePortfolioTab, setActivePortfolioTab } = usePortfolioStore();
  const [showRebuild, setShowRebuild] = useState(false);

  const activeTab = activePortfolioTab as TabId;
  const setActiveTab = (tab: TabId) => setActivePortfolioTab(tab);

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview",   label: "Overview"   },
    { id: "experience", label: "Experience" },
    { id: "projects",   label: "Projects"   },
    { id: "skills",     label: "Skills"     },
  ];

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  // Skeleton loading state while profile data is loading
  if (isLoading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.scroll, { paddingTop: topPad + 16 }]}>
          <View style={styles.pageHeader}>
            <SkeletonBlock width={120} height={32} borderRadius={12} />
            <View style={styles.headerActions}>
              <SkeletonBlock width={64} height={32} borderRadius={10} />
              <SkeletonBlock width={80} height={32} borderRadius={10} />
            </View>
          </View>
          <SkeletonBlock height={200} borderRadius={20} />
          <SkeletonBlock height={40} borderRadius={10} />
          <SkeletonBlock height={120} borderRadius={14} />
          <SkeletonBlock height={120} borderRadius={14} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Portfolio</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push("/(main)/edit-profile")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
              onPress={() => setShowRebuild(true)}
              disabled={buildStatus === "building"}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.primary }]}>
                {buildStatus === "building" ? "Building…" : "Rebuild"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={["#7C6AFA22", "#FA6A6A11"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroTop}>
            <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {profile?.full_name?.[0]?.toUpperCase() ?? "B"}
                </Text>
              )}
            </View>
            {buildStatus === "done" && (
              <View style={styles.liveChip}>
                <View style={styles.liveDot} />
                <Text style={styles.liveChipText}>Live</Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>
            {profile?.full_name ?? "Your Name"}
          </Text>
          {profile?.headline ? (
            <Text style={[styles.heroHeadline, { color: colors.mutedForeground }]}>
              {profile.headline}
            </Text>
          ) : null}
          <Text style={[styles.heroHandle, { color: colors.primary }]}>
            {profile?.handle ?? "handle"}.mybrexo.com
          </Text>
          {profile?.bio ? (
            <Text style={[styles.heroBio, { color: colors.mutedForeground }]}>
              {profile.bio}
            </Text>
          ) : null}
          {/* Social links */}
          {(profile?.github_url || profile?.linkedin_url || profile?.website) && (
            <View style={styles.socialRow}>
              {profile.github_url && (
                <View style={[styles.socialChip, { backgroundColor: colors.surface }]}>
                  <Feather name="github" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.socialLabel, { color: colors.mutedForeground }]}>GitHub</Text>
                </View>
              )}
              {profile.linkedin_url && (
                <View style={[styles.socialChip, { backgroundColor: colors.surface }]}>
                  <Feather name="linkedin" size={12} color={colors.primary} />
                  <Text style={[styles.socialLabel, { color: colors.primary }]}>LinkedIn</Text>
                </View>
              )}
              {profile.website && (
                <View style={[styles.socialChip, { backgroundColor: colors.surface }]}>
                  <Feather name="globe" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.socialLabel, { color: colors.mutedForeground }]}>Website</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.id ? colors.primary : colors.surface,
                  borderColor:     activeTab === tab.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabLabel, { color: activeTab === tab.id ? "#fff" : colors.mutedForeground }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab content */}
        {activeTab === "overview" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Education</Text>
            {education.length === 0 ? (
              <EmptySection label="No education added yet" onAdd={() => router.push("/(main)/edit-profile")} colors={colors} />
            ) : (
              education.map((edu, i) => (
                <View key={i} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{edu.institution}</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{edu.degree} in {edu.field}</Text>
                  <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                    {edu.start_year} — {edu.end_year ?? "Present"}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "experience" && (
          <View style={styles.section}>
            {experiences.length === 0 ? (
              <EmptySection label="No experience added yet" onAdd={() => router.push("/(main)/edit-profile")} colors={colors} />
            ) : (
              experiences.map((exp, i) => (
                <View key={i} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{exp.role}</Text>
                  <Text style={[styles.itemSub, { color: colors.primary }]}>{exp.company}</Text>
                  <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                    {exp.start_date} — {exp.is_current ? "Present" : exp.end_date ?? ""}
                  </Text>
                  {exp.description ? (
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{exp.description}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "projects" && (
          <View style={styles.section}>
            {projects.length === 0 ? (
              <EmptySection label="No projects added yet" onAdd={() => router.push("/(main)/edit-profile")} colors={colors} />
            ) : (
              projects.map((proj, i) => (
                <View key={i} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{proj.title}</Text>
                  {proj.description ? (
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{proj.description}</Text>
                  ) : null}
                  {proj.tech_stack?.length > 0 && (
                    <View style={styles.techRow}>
                      {proj.tech_stack.map((t) => <SkillTag key={t} label={t} size="sm" />)}
                    </View>
                  )}
                  <View style={styles.linkRow}>
                    {proj.live_url && (
                      <View style={styles.linkChip}>
                        <Feather name="external-link" size={12} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.primary }]}>Live</Text>
                      </View>
                    )}
                    {proj.github_url && (
                      <View style={styles.linkChip}>
                        <Feather name="github" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.linkText, { color: colors.mutedForeground }]}>GitHub</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "skills" && (
          <View style={styles.section}>
            {skills.length === 0 ? (
              <EmptySection label="No skills added yet" onAdd={() => router.push("/(main)/edit-profile")} colors={colors} />
            ) : (
              <View style={styles.tagRow}>
                {skills.map((s, i) => <SkillTag key={i} label={s.name} />)}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <RebuildModal visible={showRebuild} onClose={() => setShowRebuild(false)} />
    </View>
  );
}

function SkeletonBlock({ height, width, borderRadius = 14 }: { height: number; width?: number; borderRadius?: number }) {
  const colors = useColors();
  return (
    <View style={{
      height, width, borderRadius, marginBottom: 10,
      backgroundColor: colors.surface, overflow: "hidden",
    }}>
      <LinearGradient
        colors={["transparent", colors.card, "transparent"]}
        style={{ width: "100%", height: "100%" }}
        start={{ x: -1, y: 0 }}
        end={{ x: 2, y: 0 }}
      />
    </View>
  );
}

function EmptySection({
  label, onAdd, colors,
}: { label: string; onAdd: () => void; colors: any }) {
  return (
    <View style={emptyStyles.wrap}>
      <Text style={[emptyStyles.text, { color: colors.mutedForeground }]}>{label}</Text>
      <TouchableOpacity
        style={[emptyStyles.btn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
        onPress={onAdd}
      >
        <Feather name="plus" size={13} color={colors.primary} />
        <Text style={[emptyStyles.btnLabel, { color: colors.primary }]}>Add now</Text>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: "center", padding: 24, gap: 12 },
  text: { fontSize: 13 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  btnLabel: { fontSize: 13, fontWeight: "600" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  actionLabel: { fontSize: 13, fontWeight: "600" },
  heroCard: {
    borderRadius: 20, borderWidth: 1, padding: 20, gap: 6, overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8,
  },
  avatar: {
    width: 70, height: 70, borderRadius: 35, borderWidth: 2,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImg: { width: 70, height: 70, borderRadius: 35 },
  avatarInitial: { fontSize: 30, fontWeight: "800" },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#6AFAD022", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#6AFAD0" },
  liveChipText: { color: "#6AFAD0", fontSize: 12, fontWeight: "600" },
  heroName: { fontSize: 22, fontWeight: "800" },
  heroHeadline: { fontSize: 14 },
  heroHandle: { fontSize: 13, fontWeight: "600" },
  heroBio: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  socialRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  socialChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  socialLabel: { fontSize: 11, fontWeight: "500" },
  tabs: { gap: 8, paddingRight: 20 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  itemCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: "600" },
  itemSub: { fontSize: 13 },
  itemDate: { fontSize: 12 },
  itemDesc: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  techRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  linkRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  linkChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { fontSize: 12, fontWeight: "500" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
