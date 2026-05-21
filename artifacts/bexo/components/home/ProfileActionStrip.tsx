import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { needsResumeDocument } from "@/lib/profileBuildOrchestrator";
import { warning as hapticWarning } from "@/lib/haptics";
import { useColors } from "@/hooks/useColors";
import type { CompletionResult } from "@/stores/useProfileStore";
import { tapLight } from "@/lib/haptics";

interface Props {
  result: CompletionResult;
  resumeUrl?: string | null;
  educationCount: number;
  experienceCount: number;
  onFinishPress: () => void;
  onResumePress: () => void;
}

export function ProfileActionStrip({
  result,
  resumeUrl,
  educationCount,
  experienceCount,
  onFinishPress,
  onResumePress,
}: Props) {
  const colors = useColors();
  const warnedRef = useRef(false);
  const showResume = needsResumeDocument(resumeUrl, educationCount, experienceCount);
  const topMissing = result.missingFields.slice(0, 2);

  useEffect(() => {
    if (result.isPassing || warnedRef.current) return;
    warnedRef.current = true;
    void hapticWarning();
  }, [result.isPassing]);

  if (result.isPassing) return null;

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.wrap}>
      <View
        style={[
          styles.strip,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <ProgressRing score={result.score} size={52} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {Math.max(0, 90 - result.score)}% to publish
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {topMissing.map((m) => m.label).join(" · ") || "Add profile details"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={() => {
            void tapLight();
            onFinishPress();
          }}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Finish</Text>
        </TouchableOpacity>
      </View>

      {showResume ? (
        <TouchableOpacity
          style={[
            styles.resumeCard,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
          onPress={() => {
            void tapLight();
            onResumePress();
          }}
        >
          <Feather name="file-text" size={18} color={colors.primary} />
          <View style={styles.resumeText}>
            <Text style={[styles.resumeTitle, { color: colors.foreground }]}>
              Add your resume PDF
            </Text>
            <Text style={[styles.resumeSub, { color: colors.mutedForeground }]}>
              Fastest way to fill education and experience
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, lineHeight: 16 },
  cta: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  ctaText: { fontSize: 14, fontWeight: "700" },
  resumeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  resumeText: { flex: 1, gap: 2 },
  resumeTitle: { fontSize: 14, fontWeight: "600" },
  resumeSub: { fontSize: 12 },
});
