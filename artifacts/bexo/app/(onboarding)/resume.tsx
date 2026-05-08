import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { uploadAndParseResume } from "@/services/resumeParser";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

export default function ResumeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const {
    profile,
    setParsedResumeData,
    setOnboardingStep,
    setEducation,
    setExperiences,
    setProjects,
    setSkills,
  } = useProfileStore();

  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedFile({ name: result.assets[0].name, uri: result.assets[0].uri });
        setError("");
      }
    } catch {
      setError("Could not open file picker");
    }
  };

  const handleParse = async () => {
    if (!selectedFile || !user || !profile) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setParsing(true);
    setError("");
    try {
      const { resumeUrl, parsed } = await uploadAndParseResume(
        selectedFile.uri,
        selectedFile.name,
        user.id
      );
      setParsedResumeData(parsed);
      if (parsed.education) setEducation(parsed.education);
      if (parsed.experiences) setExperiences(parsed.experiences);
      if (parsed.projects) setProjects(parsed.projects);
      if (parsed.skills) setSkills(parsed.skills);

      // Update profile with parsed data
      await useProfileStore.getState().updateProfile({
        full_name: parsed.full_name ?? profile.full_name,
        headline: parsed.headline ?? profile.headline,
        bio: parsed.bio ?? profile.bio,
        github_url: parsed.github_url ?? profile.github_url,
        linkedin_url: parsed.linkedin_url ?? profile.linkedin_url,
        resume_url: resumeUrl,
      });

      setOnboardingStep("photo");
      router.push("/(onboarding)/photo");
    } catch (e: any) {
      setError(e.message ?? "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const handleSkip = () => {
    setOnboardingStep("photo");
    router.push("/(onboarding)/photo");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepRow}>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          Upload your resume
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          AI will extract your experience, education, skills, and projects automatically.
        </Text>

        {/* Drop zone */}
        <TouchableOpacity
          style={[
            styles.dropZone,
            {
              backgroundColor: colors.surface,
              borderColor: selectedFile ? colors.primary : colors.border,
            },
          ]}
          onPress={pickDocument}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedFile ? ["#7C6AFA18", "#7C6AFA08"] : ["transparent", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          {selectedFile ? (
            <>
              <Feather name="file-text" size={36} color={colors.primary} />
              <Text style={[styles.fileName, { color: colors.foreground }]}>
                {selectedFile.name}
              </Text>
              <Text style={[styles.fileHint, { color: colors.mutedForeground }]}>
                Tap to change
              </Text>
            </>
          ) : (
            <>
              <View style={[styles.uploadIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="upload-cloud" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.dropLabel, { color: colors.foreground }]}>
                Tap to upload PDF
              </Text>
              <Text style={[styles.dropHint, { color: colors.mutedForeground }]}>
                Max 10MB · PDF only
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* AI features */}
        <View style={styles.features}>
          {[
            { icon: "cpu", label: "AI extracts all info automatically" },
            { icon: "shield", label: "Secure upload, private storage" },
            { icon: "edit-3", label: "Review & edit before publishing" },
          ].map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name={f.icon as any} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : null}

        <BexoButton
          label={parsing ? "Parsing with AI..." : "Parse Resume"}
          onPress={handleParse}
          loading={parsing}
          disabled={!selectedFile || parsing}
        />

        <BexoButton
          label="Skip for now"
          onPress={handleSkip}
          variant="ghost"
          disabled={parsing}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scroll: {
    paddingHorizontal: 28,
    gap: 18,
  },
  stepRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  headline: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  sub: { fontSize: 14, lineHeight: 21 },
  dropZone: {
    height: 200,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
  },
  uploadIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dropLabel: { fontSize: 16, fontWeight: "600" },
  dropHint: { fontSize: 13 },
  fileName: { fontSize: 15, fontWeight: "600", textAlign: "center", paddingHorizontal: 20 },
  fileHint: { fontSize: 12 },
  features: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 13 },
  error: { fontSize: 13 },
});
