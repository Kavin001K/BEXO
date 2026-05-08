import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Update {
  id: string;
  type: "project" | "achievement" | "role" | "education";
  title: string;
  description: string;
  created_at: string;
}

const TYPE_ICONS: Record<Update["type"], { icon: string; color: string }> = {
  project: { icon: "code", color: "#7C6AFA" },
  achievement: { icon: "award", color: "#6AFAD0" },
  role: { icon: "briefcase", color: "#FA6A6A" },
  education: { icon: "book-open", color: "#FAD06A" },
};

interface Props {
  update: Update;
}

export function UpdateCard({ update }: Props) {
  const colors = useColors();
  const meta = TYPE_ICONS[update.type];
  const date = new Date(update.created_at);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: meta.color + "22" }]}>
        <Feather name={meta.icon as any} size={16} color={meta.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>{update.title}</Text>
        {update.description ? (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {update.description}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{dateStr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: "600" },
  desc: { fontSize: 12, lineHeight: 18 },
  date: { fontSize: 11 },
});
