import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { SkillTag } from "./SkillTag";
import type { Profile } from "@/stores/useProfileStore";

interface Props {
  profile: Profile;
  avatarUrl?: string | null;
  skills?: string[];
}

export function ProfileCard({ profile, avatarUrl, skills = [] }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LinearGradient
        colors={["#7C6AFA22", "#FA6A6A11"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {profile.full_name?.[0]?.toUpperCase() ?? "B"}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {profile.full_name || "Your Name"}
          </Text>
          <Text style={[styles.headline, { color: colors.mutedForeground }]}>
            {profile.headline || "Student"}
          </Text>
          <Text style={[styles.handle, { color: colors.primary }]}>
            {profile.handle || "handle"}.mybixo.com
          </Text>
        </View>
      </View>
      {profile.bio ? (
        <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
          {profile.bio}
        </Text>
      ) : null}
      {skills.length > 0 && (
        <View style={styles.tags}>
          {skills.slice(0, 5).map((s) => (
            <SkillTag key={s} label={s} size="sm" />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarInitial: { fontSize: 28, fontWeight: "700" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: "700" },
  headline: { fontSize: 13, fontWeight: "400" },
  handle: { fontSize: 12, fontWeight: "600", fontFamily: "JetBrainsMono_400Regular" },
  bio: { fontSize: 13, lineHeight: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
