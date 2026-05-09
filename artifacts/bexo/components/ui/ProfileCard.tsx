import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import type { Profile } from "@/stores/useProfileStore";
import { SkillTag } from "./SkillTag";

interface Props {
  profile: Profile;
  avatarUrl?: string | null;
  skills?: string[];
  onEdit?: () => void;
}

export const ProfileCard = React.memo(function ProfileCard({ profile, avatarUrl, skills = [], onEdit }: Props) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Gradient overlay */}
        <LinearGradient
          colors={["#7C6AFA22", "#FA6A6A11"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Header row */}
        <View style={styles.header}>
          {/* Avatar */}
          <View style={[styles.avatarRing, { borderColor: colors.primary + "55" }]}>
            <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <LinearGradient
                  colors={["#7C6AFA", "#A06AFA"]}
                  style={styles.avatarGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarInitial}>
                    {profile.full_name?.[0]?.toUpperCase() ?? "B"}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </View>

          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {profile.full_name || "Your Name"}
            </Text>
            <Text style={[styles.headline, { color: colors.mutedForeground }]} numberOfLines={1}>
              {profile.headline || "Student"}
            </Text>
            <View style={styles.handleRow}>
              <Feather name="link-2" size={11} color={colors.primary} />
              <Text
                style={[styles.handle, { color: colors.primary }]}
                numberOfLines={1}
              >
                {profile.handle || "handle"}.mybrexo.com
              </Text>
            </View>
          </View>

          {onEdit && (
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onEdit}
            >
              <Feather name="edit-2" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Bio */}
        {profile.bio ? (
          <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
            {profile.bio}
          </Text>
        ) : null}

        {/* Stats row */}
        {(profile.location || profile.linkedin_url || profile.github_url) && (
          <View style={styles.metaRow}>
            {profile.location ? (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {profile.location}
                </Text>
              </View>
            ) : null}
            {profile.github_url ? (
              <View style={styles.metaItem}>
                <Feather name="github" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>GitHub</Text>
              </View>
            ) : null}
            {profile.linkedin_url ? (
              <View style={styles.metaItem}>
                <Feather name="linkedin" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>LinkedIn</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.tags}>
            {skills.slice(0, 6).map((s) => (
              <SkillTag key={s} label={s} size="sm" />
            ))}
            {skills.length > 6 && (
              <View style={[styles.morePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                  +{skills.length - 6}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    overflow: "hidden",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarRing: {
    borderRadius: 36,
    borderWidth: 2,
    padding: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatarGrad: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 26, fontWeight: "700", color: "#fff" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: "700" },
  headline: { fontSize: 13 },
  handleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  handle: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bio: { fontSize: 13, lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  morePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  moreText: { fontSize: 11, fontWeight: "600" },
});
