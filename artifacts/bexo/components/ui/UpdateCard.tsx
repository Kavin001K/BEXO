import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface Update {
  id: string;
  type: "project" | "achievement" | "role" | "education";
  title: string;
  description: string;
  created_at: string;
}

const TYPE_META: Record<Update["type"], { icon: string; color: string; label: string }> = {
  project:     { icon: "code",       color: "#7C6AFA", label: "Project" },
  achievement: { icon: "award",      color: "#6AFAD0", label: "Achievement" },
  role:        { icon: "briefcase",  color: "#FA6A6A", label: "New Role" },
  education:   { icon: "book-open",  color: "#FAD06A", label: "Education" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const UpdateCard = React.memo(function UpdateCard({ update }: { update: Update }) {
  const colors = useColors();
  const meta   = TYPE_META[update.type];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: meta.color + "22" }]}>
        <Feather name={meta.icon as any} size={15} color={meta.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.typePill, { backgroundColor: meta.color + "18", borderColor: meta.color + "44" }]}>
            <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {timeAgo(update.created_at)}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{update.title}</Text>
        {update.description ? (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {update.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    paddingLeft: 18,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 3,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: { flex: 1, gap: 5 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  time: { fontSize: 11 },
  title: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  desc: { fontSize: 12, lineHeight: 18 },
});
