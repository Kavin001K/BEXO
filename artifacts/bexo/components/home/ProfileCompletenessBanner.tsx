import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useProfileStore, type CompletionResult } from "@/stores/useProfileStore";

interface Props {
  result: CompletionResult;
  onCompletePress: () => void;
}

export function ProfileCompletenessBanner({ result, onCompletePress }: Props) {
  const colors = useColors();
  const { score, missingFields } = result;

  const barColor =
    score >= 80 ? "#6AFAD0" : score >= 50 ? colors.primary : "#FA6A6A";

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View
          style={[styles.iconBadge, { backgroundColor: barColor + "22" }]}
        >
          <Feather
            name={score >= 80 ? "check-circle" : "alert-circle"}
            size={18}
            color={barColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Profile {score}% complete
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {score < 80
              ? `${80 - score}% more needed to enable portfolio generation`
              : "Profile ready! Your portfolio can be generated."}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.barTrack, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.barFill,
            { width: `${score}%` as any, backgroundColor: barColor },
          ]}
        />
        <View style={[styles.threshold, { left: "80%" as any, backgroundColor: colors.border }]} />
      </View>

      {/* Missing fields */}
      {score < 80 && missingFields.length > 0 && (
        <View style={styles.missingRow}>
          {missingFields.slice(0, 4).map((f) => (
            <View
              key={f.key}
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Feather name="plus" size={10} color={colors.mutedForeground} />
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                {f.label}
              </Text>
            </View>
          ))}
          {missingFields.length > 4 && (
            <View
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                +{missingFields.length - 4} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action */}
      {score < 80 && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={onCompletePress}
          activeOpacity={0.85}
        >
          <Feather name="edit-3" size={14} color="#fff" />
          <Text style={styles.actionLabel}>Complete profile</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  barTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  threshold: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 2,
    borderRadius: 999,
  },
  missingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: "500" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
