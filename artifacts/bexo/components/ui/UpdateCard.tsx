import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";

interface Attachment {
  id: string;
  url: string;
  type: "image" | "pdf";
}

interface Update {
  id: string;
  type: "project" | "achievement" | "role" | "education";
  title: string;
  description: string;
  link_url?: string | null;
  created_at: string;
  attachments?: Attachment[];
}

const TYPE_META: Record<
  Update["type"],
  { icon: string; label: string; colorKey: "primary" | "accent" | "mint" | "warning" }
> = {
  project: { icon: "code", label: "Project", colorKey: "primary" },
  achievement: { icon: "award", label: "Achievement", colorKey: "mint" },
  role: { icon: "briefcase", label: "New Role", colorKey: "accent" },
  education: { icon: "book-open", label: "Education", colorKey: "warning" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const UpdateCard = React.memo(function UpdateCard({ update }: { update: Update }) {
  const colors = useColors();
  const meta = TYPE_META[update.type];
  const tint = colors[meta.colorKey];

  const attachmentCount = update.attachments?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={() => {
        void tapLight();
        router.push({ pathname: "/details", params: { type: "update", id: update.id } });
      }}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint + "18" }]}>
        <Feather name={meta.icon as any} size={15} color={tint} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.typePill, { backgroundColor: tint + "14", borderColor: tint + "33" }]}>
            <Text style={[styles.typeLabel, { color: tint }]}>{meta.label}</Text>
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

        <View style={styles.footer}>
          {attachmentCount > 0 && (
            <View style={[styles.metaItem, { backgroundColor: colors.secondary }]}>
              <Feather name="paperclip" size={10} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {attachmentCount} {attachmentCount === 1 ? "File" : "Files"}
              </Text>
            </View>
          )}
          {update.link_url && (
            <View style={[styles.metaItem, { backgroundColor: colors.secondary }]}>
              <Feather name="external-link" size={10} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Link</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: { flex: 1, gap: 6 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  time: { fontSize: 11, fontWeight: "600" },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 22, letterSpacing: -0.2 },
  desc: { fontSize: 13, lineHeight: 20 },
  footer: { flexDirection: "row", gap: 8, marginTop: 4 },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: { fontSize: 10, fontWeight: "600" },
});
