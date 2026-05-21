import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";

interface Props {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  destructive?: boolean;
}

export function ListRow({ icon, label, sublabel, onPress, destructive }: Props) {
  const colors = useColors();
  const tint = destructive ? colors.destructive : colors.foreground;

  const content = (
    <>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
          <Feather name={icon} size={18} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[styles.label, { color: tint }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, { borderBottomColor: colors.border }]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      onPress={() => {
        void tapLight();
        onPress();
      }}
      activeOpacity={0.7}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 13 },
});
