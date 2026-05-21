import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { warning, tapLight, tapMedium } from "@/lib/haptics";
import {
  friendlyResumeAiError,
  uploadAndParseResume,
  type ParsedResume,
} from "@/services/resumeParser";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { sanitizeError } from "@/lib/errorUtils";

type Stage = "idle" | "uploading" | "parsing" | "done" | "error";

export default function ResumeScreen() {
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const { profile, setParsedResumeData, setOnboardingStep } = useProfileStore();

  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseProgress, setParseProgress] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [parsingMessage, setParsingMessage] = useState("AI is reading your resume…");
  const [resumePipelineError, setResumePipelineError] = useState(false);
  const uploadBusy = useRef(false);

  const PARSING_MESSAGES = [
    "Scanning document...",
    "Extracting timeline...",
    "Formatting skills...",
    "Structuring education...",
    "Almost there...",
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (stage === "parsing") {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % PARSING_MESSAGES.length;
        setParsingMessage(PARSING_MESSAGES[idx]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [stage]);

  const pickDocument = async () => {
    if (uploadBusy.current) return;
    uploadBusy.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      setSelectedFile({ name: file.name, uri: file.uri });
      setError("");
      setStage("uploading");

      if (!user || !profile) {
        setError("Profile not ready. Try again.");
        setStage("error");
        return;
      }
      await tapMedium();

      const { resumeStoragePath, parsed } = await uploadAndParseResume(
        file.uri,
        file.name,
        user.id,
        (s, pct) => {
          if (s === "uploading") {
            setUploadProgress(pct);
          } else {
            setStage("parsing");
            setParseProgress(pct);
          }
        },
      );

      setUploadedPath(resumeStoragePath);
      setParsedData(parsed);
      setStage("done");
      setParsedResumeData(parsed);
    } catch (e: unknown) {
      console.error("[ResumeScreen] Resume pipeline:", e);
      await warning();
      setError(friendlyResumeAiError(sanitizeError(e)));
      setResumePipelineError(true);
      setStage("error");
    } finally {
      uploadBusy.current = false;
    }
  };

  const handleConfirmParsed = async (mode: "replace" | "merge") => {
    if (!profile || !parsedData || !uploadedPath) return;
    setParsing(true);
    setError("");

    try {
      const store = useProfileStore.getState();
      if (mode === "replace") {
        await store.replaceAllDataFromResume(parsedData, uploadedPath);
      } else {
        await store.mergeDataFromResume(parsedData, uploadedPath);
      }

      await store.refreshFromDB();
      setOnboardingStep("manual_review");
      store.setManualReviewStepIndex(0);
      router.push("/(onboarding)/manual-review");
    } catch (e: unknown) {
      console.error("[ResumeScreen] Save error:", e);
      setResumePipelineError(false);
      setError(friendlyResumeAiError(sanitizeError(e)));
      setStage("error");
    } finally {
      setParsing(false);
    }
  };

  const handleSkip = () => {
    setOnboardingStep("manual");
    router.push("/(onboarding)/manual");
  };

  const handleBack = () => {
    void tapLight();
    setOnboardingStep("dob");
    router.replace("/(onboarding)/dob");
  };

  const handleRetry = () => {
    setStage("idle");
    setSelectedFile(null);
    setError("");
    setResumePipelineError(false);
    setUploadProgress(0);
    setParseProgress(0);
  };

  const footer =
    stage === "idle" ? (
      <BexoButton label="Skip for now" onPress={handleSkip} variant="ghost" />
    ) : null;

  return (
    <OnboardingShell
      stepKey="resume"
      title="Got a resume?"
      subtitle="Upload it and we'll fill out your profile automatically."
      onBack={handleBack}
      footer={footer}
    >
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Edit birthday, site URL, photo, or email
      </Text>

      {stage === "idle" && (
        <TouchableOpacity
          style={[styles.dropZone, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={pickDocument}
          activeOpacity={0.8}
        >
          <View style={[styles.uploadIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="upload-cloud" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.dropLabel, { color: colors.foreground }]}>Pick your PDF</Text>
          <Text style={[styles.dropHint, { color: colors.mutedForeground }]}>Max 10MB · PDF only</Text>
        </TouchableOpacity>
      )}

      {stage === "uploading" && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stageLabel, { color: colors.foreground }]}>Uploading…</Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${uploadProgress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressPct, { color: colors.mutedForeground }]}>
            {Math.round(uploadProgress)}%
          </Text>
        </Animated.View>
      )}

      {stage === "parsing" && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stageLabel, { color: colors.foreground }]}>{parsingMessage}</Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${parseProgress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </Animated.View>
      )}

      {stage === "done" && parsedData && (
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.primary + "14" }]}>
              <Feather name="check-circle" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
              Success! We've read your resume.
            </Text>
            <View style={styles.summaryChips}>
              {parsedData.education?.length > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>
                    {parsedData.education.length} Education
                  </Text>
                </View>
              )}
              {parsedData.experiences?.length > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.destructive + "14" }]}>
                  <Text style={[styles.chipText, { color: colors.destructive }]}>
                    {parsedData.experiences.length} Jobs
                  </Text>
                </View>
              )}
              {parsedData.projects?.length > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.primary + "12" }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>
                    {parsedData.projects.length} Projects
                  </Text>
                </View>
              )}
              {parsedData.skills?.length > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.chipText, { color: colors.foreground }]}>
                    {parsedData.skills.length} Skills
                  </Text>
                </View>
              )}
            </View>
          </View>

          <BexoButton
            label={parsing ? "Importing profile…" : "Looks good, let's go"}
            onPress={() => handleConfirmParsed("replace")}
            loading={parsing}
            icon={<Feather name="arrow-right" size={16} color={colors.primaryForeground} />}
          />

          <TouchableOpacity style={styles.changeBtn} onPress={pickDocument}>
            <Text style={[styles.changeBtnText, { color: colors.mutedForeground }]}>
              Wait, let me pick another one
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {stage === "error" && (
        <Animated.View
          entering={FadeInDown.springify()}
          style={[
            styles.errorCard,
            { backgroundColor: colors.destructive + "0D", borderColor: colors.destructive + "33" },
          ]}
        >
          <View style={styles.errorHeader}>
            <Feather name="alert-circle" size={32} color={colors.destructive} />
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>Something went wrong</Text>
          </View>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
          <BexoButton label="Try again" onPress={handleRetry} />
          {resumePipelineError ? (
            <BexoButton
              label="Continue manually instead"
              variant="ghost"
              onPress={() => {
                setOnboardingStep("manual");
                router.replace("/(onboarding)/manual");
              }}
            />
          ) : null}
        </Animated.View>
      )}

      {stage === "idle" && (
        <View style={styles.features}>
          {[
            { icon: "cpu", label: "AI extracts all info automatically" },
            { icon: "shield", label: "Secure upload, private storage" },
            { icon: "edit-3", label: "Review & edit before publishing" },
          ].map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "14" }]}>
                <Feather name={f.icon as keyof typeof Feather.glyphMap} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f.label}</Text>
            </View>
          ))}
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 18, marginTop: -12 },
  dropZone: {
    height: 200,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
  progressCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
  },
  stageLabel: { fontSize: 16, fontWeight: "600" },
  progressTrack: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressPct: { fontSize: 12 },
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: "center", gap: 12 },
  summaryIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontSize: 18, fontWeight: "800" },
  summaryChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "700" },
  changeBtn: { alignItems: "center", paddingVertical: 8 },
  changeBtnText: { fontSize: 14, textDecorationLine: "underline" },
  errorCard: { borderRadius: 24, borderWidth: 1, padding: 32, alignItems: "center", gap: 20 },
  errorHeader: { alignItems: "center", gap: 12 },
  errorTitle: { fontSize: 20, fontWeight: "800" },
  errorText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  features: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 13 },
});
