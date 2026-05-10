import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { ActivityIndicator } from "react-native";
console.log("[Portfolio] Rendering...");
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RebuildModal } from "@/components/portfolio/RebuildModal";
import { SkillTag } from "@/components/ui/SkillTag";
import { useColors } from "@/hooks/useColors";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

type TabId = "overview" | "experience" | "education" | "projects" | "skills";

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, education, experiences, projects, skills, isLoading } = useProfileStore();
  const { buildStatus, updates, activePortfolioTab, setActivePortfolioTab, fetchUpdates } = usePortfolioStore();
  const [showRebuild, setShowRebuild] = useState(false);

  const activeTab = activePortfolioTab as TabId;
  const setActiveTab = (tab: TabId) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePortfolioTab(tab);
  };

  React.useEffect(() => {
    if (profile?.id) {
      fetchUpdates(profile.id);
    }
  }, [profile?.id]);

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview",   label: "Overview"   },
    { id: "experience", label: "Experience" },
    { id: "education",  label: "Education"  },
    { id: "projects",   label: "Projects"   },
    { id: "skills",     label: "Skills"     },
  ];

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  // Merge profile data with AI updates
  const allExperience = [
    ...experiences,
    ...updates.filter(u => u.type === "role").map(u => ({
      role: u.title,
      company: "Scan Result",
      description: u.description,
      start_date: new Date(u.created_at).getFullYear().toString(),
      is_current: false,
      id: u.id
    }))
  ];

  const allProjects = [
    ...projects,
    ...updates.filter(u => u.type === "project").map(u => ({
      title: u.title,
      description: u.description,
      tech_stack: u.description.match(/#[a-zA-Z0-9]+/g)?.map(t => t.slice(1)) || [],
      id: u.id
    }))
  ];

  const allEducation = [
    ...education,
    ...updates.filter(u => u.type === "education").map(u => ({
      institution: u.title,
      degree: u.description.split(",")[0] || "Certification",
      field: u.description.split(",")[1] || "",
      start_year: new Date(u.created_at).getFullYear(),
      id: u.id
    }))
  ];

  const allAchievements = updates.filter(u => u.type === "achievement");

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
              onPress={() => router.navigate("/edit-profile")}
              hitSlop={{ top: 25, bottom: 25, left: 20, right: 20 }}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
              onPress={() => setShowRebuild(true)}
              disabled={buildStatus === "building"}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.primary }]}>
                {buildStatus === "building" ? "Building…" : "Rebuild"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push("/settings")}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Feather name="settings" size={14} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={["#7C6AFA15", "#FA6A6A08"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroTop}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/edit-profile")}
              style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {profile?.full_name?.[0]?.toUpperCase() ?? "B"}
                </Text>
              )}
            </TouchableOpacity>
            {buildStatus === "done" && (
              <View style={[styles.liveChip, { backgroundColor: "#6AFAD015", borderColor: "#6AFAD044", borderWidth: 1 }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveChipText}>Live Portfolio</Text>
              </View>
            )}
            {(buildStatus === "building" || buildStatus === "queued") && (
              <View style={[styles.liveChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "44", borderWidth: 1 }]}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6, transform: [{ scale: 0.7 }] }} />
                <Text style={[styles.liveChipText, { color: colors.primary }]}>Syncing...</Text>
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
          <View style={styles.handleRow}>
            <Feather name="link" size={12} color={colors.primary} />
            <Text style={[styles.heroHandle, { color: colors.primary }]}>
              {profile?.handle ?? "handle"}.mybexo.com
            </Text>
          </View>
          {profile?.bio ? (
            <Text style={[styles.heroBio, { color: colors.mutedForeground }]}>
              {profile.bio}
            </Text>
          ) : null}
          {/* Social links */}
          {(profile?.github_url || profile?.linkedin_url || profile?.website) && (
            <View style={styles.socialRow}>
              {profile.github_url && (
                <View style={[styles.socialChip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                  <Feather name="github" size={11} color={colors.foreground} />
                  <Text style={[styles.socialLabel, { color: colors.foreground }]}>GitHub</Text>
                </View>
              )}
              {profile.linkedin_url && (
                <View style={[styles.socialChip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                  <Feather name="linkedin" size={11} color={colors.primary} />
                  <Text style={[styles.socialLabel, { color: colors.primary }]}>LinkedIn</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsContainer}>
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
            {/* Experience Summary */}
            {allExperience.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subHeader}>
                  <View style={styles.titleWithIcon}>
                    <Feather name="briefcase" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Experience</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab("experience")}>
                    <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
                  </TouchableOpacity>
                </View>
                {allExperience.slice(0, 2).map((exp, i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => router.push({ pathname: "/details", params: { type: "experience", id: exp.id } })}
                    activeOpacity={0.8}
                    style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.itemTitle, { color: colors.foreground }]}>{exp.role}</Text>
                    <Text style={[styles.itemSub, { color: colors.primary }]}>{exp.company}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Project Summary */}
            {allProjects.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subHeader}>
                  <View style={styles.titleWithIcon}>
                    <Feather name="layout" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Projects</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab("projects")}>
                    <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
                  </TouchableOpacity>
                </View>
                {allProjects.slice(0, 2).map((proj, i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => router.push({ pathname: "/details", params: { type: "project", id: proj.id } })}
                    activeOpacity={0.8}
                    style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.itemTitle, { color: colors.foreground }]}>{proj.title}</Text>
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{proj.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Achievements */}
            {allAchievements.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.titleWithIcon}>
                  <Feather name="award" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
                </View>
                {allAchievements.slice(0, 3).map((update, i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => router.push({ pathname: "/details", params: { type: "update", id: update.id } })}
                    activeOpacity={0.8}
                    style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.achievementRow}>
                      <View style={styles.awardDot} />
                      <Text style={[styles.itemTitle, { color: colors.foreground, fontSize: 14 }]}>{update.title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Education Summary */}
            {allEducation.length > 0 && (
              <View style={styles.subSection}>
                <View style={styles.subHeader}>
                  <View style={styles.titleWithIcon}>
                    <Feather name="book-open" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Education</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab("education")}>
                    <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: "/details", params: { type: "education", id: allEducation[0].id } })}
                  activeOpacity={0.8}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{allEducation[0].institution}</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{allEducation[0].degree}</Text>
                </TouchableOpacity>
              </View>
            )}

            {allExperience.length === 0 && allProjects.length === 0 && allEducation.length === 0 && allAchievements.length === 0 && (
              <EmptySection label="Your portfolio is empty" onAdd={() => router.push("/edit-profile")} colors={colors} />
            )}
          </View>
        )}

        {activeTab === "experience" && (
          <View style={styles.section}>
            {allExperience.length === 0 ? (
              <EmptySection 
                label="No experience added yet" 
                onAdd={() => router.navigate({ pathname: "/edit-profile", params: { tab: "experience" } })} 
                colors={colors} 
              />
            ) : (
              allExperience.map((exp, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => router.push({ pathname: "/details", params: { type: "experience", id: exp.id } })}
                  activeOpacity={0.8}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{exp.role}</Text>
                  <Text style={[styles.itemSub, { color: colors.primary }]}>{exp.company}</Text>
                  <View style={styles.dateRow}>
                    <Feather name="calendar" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                      {exp.start_date} {exp.is_current ? "— Present" : ""}
                    </Text>
                  </View>
                  {exp.description ? (
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{exp.description}</Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === "education" && (
          <View style={styles.section}>
            {allEducation.length === 0 ? (
              <EmptySection 
                label="No education added yet" 
                onAdd={() => router.navigate({ pathname: "/edit-profile", params: { tab: "education" } })} 
                colors={colors} 
              />
            ) : (
              allEducation.map((edu, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => router.push({ pathname: "/details", params: { type: "education", id: edu.id } })}
                  activeOpacity={0.8}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{edu.institution}</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{edu.degree} {edu.field ? `in ${edu.field}` : ""}</Text>
                  <View style={styles.dateRow}>
                    <Feather name="calendar" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                      {edu.start_year}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === "projects" && (
          <View style={styles.section}>
            {allProjects.length === 0 ? (
              <EmptySection 
                label="No projects added yet" 
                onAdd={() => router.navigate({ pathname: "/edit-profile", params: { tab: "projects" } })} 
                colors={colors} 
              />
            ) : (
              allProjects.map((proj, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => router.push({ pathname: "/details", params: { type: "project", id: proj.id } })}
                  activeOpacity={0.8}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{proj.title}</Text>
                  {proj.description ? (
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{proj.description}</Text>
                  ) : null}
                  {proj.tech_stack && proj.tech_stack.length > 0 && (
                    <View style={styles.techRow}>
                      {proj.tech_stack.map((t) => <SkillTag key={t} label={t} size="sm" />)}
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === "skills" && (
          <View style={styles.section}>
            {skills.length === 0 ? (
              <EmptySection label="No skills added yet" onAdd={() => router.push("/edit-profile")} colors={colors} />
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
        hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        activeOpacity={0.6}
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
  handleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  heroBio: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  socialRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  socialChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  socialLabel: { fontSize: 12, fontWeight: "600" },
  tabsContainer: { marginTop: 4, marginBottom: 8 },
  tabs: { gap: 10, paddingRight: 20 },
  tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  tabLabel: { fontSize: 14, fontWeight: "700" },
  section: { gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  titleWithIcon: { flexDirection: "row", alignItems: "center", gap: 8 },
  subSection: { gap: 12, marginTop: 4 },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  viewAll: { fontSize: 13, fontWeight: "700" },
  achievementRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  awardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#6AFAD0" },
  itemCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 6, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  itemTitle: { fontSize: 16, fontWeight: "700", letterSpacing: -0.1 },
  itemSub: { fontSize: 14, fontWeight: "600" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  itemDate: { fontSize: 12, fontWeight: "500" },
  itemDesc: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  techRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  linkRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  linkChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { fontSize: 12, fontWeight: "500" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
