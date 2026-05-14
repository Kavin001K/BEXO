import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
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
  const insets = useSafeAreaInsets();
  const user   = useAuthStore((s) => s.user);
  const { profile, setParsedResumeData, setOnboardingStep } = useProfileStore();

  const [selectedFile, setSelectedFile]     = useState<{ name: string; uri: string } | null>(null);
  const [uploadedPath, setUploadedPath]     = useState<string | null>(null);
  const [parsedData,   setParsedData]       = useState<ParsedResume | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseProgress,  setParseProgress]  = useState(0);
  const [stage,        setStage]            = useState<Stage>("idle");
  const [parsing,      setParsing]          = useState(false);
  const [error,        setError]            = useState("");
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
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
        }
      );

      setUploadedPath(resumeStoragePath);
      setParsedData(parsed);
      setStage("done");

      // Store parsed data for preview — DO NOT set into Zustand yet
      // (items without DB IDs would break edit/delete later)
      setParsedResumeData(parsed);

    } catch (e: unknown) {
      console.error("[ResumeScreen] Resume pipeline:", e);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
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

      // Resume data is in the profile — show 7-section summaries + terms before theme
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 40);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: bottomPad }]}
      >
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back to edit birthday and earlier steps"
          style={styles.backRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.primary} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.backHint, { color: colors.mutedForeground }]}>
          Edit birthday, site URL, photo, or email
        </Text>

        <View style={styles.stepRow}>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary, width: 30 }]} />
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>Got a resume?</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Upload it and we'll fill out your profile automatically. Like magic.
        </Text>

        {/* Idle: drop zone */}
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

        {/* Uploading state */}
        {stage === "uploading" && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stageLabel, { color: colors.foreground }]}>Uploading…</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` as any, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressPct, { color: colors.mutedForeground }]}>{Math.round(uploadProgress)}%</Text>
          </Animated.View>
        )}

        {/* Parsing state */}
        {stage === "parsing" && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color="#6AFAD0" />
            <Text style={[styles.stageLabel, { color: colors.foreground }]}>{parsingMessage}</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${parseProgress}%` as any, backgroundColor: "#6AFAD0" }]} />
            </View>
          </Animated.View>
        )}

        {/* Done: summary + confirm choices */}
        {stage === "done" && parsedData && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: "#6AFAD044" }]}>
              <View style={[styles.summaryIcon, { backgroundColor: "#6AFAD022" }]}>
                <Feather name="check-circle" size={22} color="#6AFAD0" />
              </View>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Success! We've read your resume.</Text>
              <View style={styles.summaryChips}>
                {parsedData.education?.length > 0 && (
                  <View style={[styles.chip, { backgroundColor: colors.primary + "22" }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>{parsedData.education.length} Education</Text>
                  </View>
                )}
                {parsedData.experiences?.length > 0 && (
                  <View style={[styles.chip, { backgroundColor: "#FA6A6A22" }]}>
                    <Text style={[styles.chipText, { color: "#FA6A6A" }]}>{parsedData.experiences.length} Jobs</Text>
                  </View>
                )}
                {parsedData.projects?.length > 0 && (
                  <View style={[styles.chip, { backgroundColor: "#6AFAD022" }]}>
                    <Text style={[styles.chipText, { color: "#6AFAD0" }]}>{parsedData.projects.length} Projects</Text>
                  </View>
                )}
                {parsedData.skills?.length > 0 && (
                  <View style={[styles.chip, { backgroundColor: "#FAD06A22" }]}>
                    <Text style={[styles.chipText, { color: "#FAD06A" }]}>{parsedData.skills.length} Skills</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <BexoButton
                label={parsing ? "Importing profile…" : "Looks good, let's go"}
                onPress={() => handleConfirmParsed("replace")}
                loading={parsing}
                icon={<Feather name="arrow-right" size={16} color="#fff" />}
              />
            </View>

            <TouchableOpacity style={styles.changeBtn} onPress={pickDocument}>
              <Text style={[styles.changeBtnText, { color: colors.mutedForeground }]}>Wait, let me pick another one</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Error state */}
        {stage === "error" && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.errorCard, { backgroundColor: "#FA6A6A11", borderColor: "#FA6A6A44" }]}>
            <View style={styles.errorHeader}>
              <Feather name="alert-circle" size={32} color="#FA6A6A" />
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

        {/* AI features (idle only) */}
        {stage === "idle" && (
          <View style={styles.features}>
            {[
              { icon: "cpu",      label: "AI extracts all info automatically" },
              { icon: "shield",   label: "Secure upload, private storage"     },
              { icon: "edit-3",   label: "Review & edit before publishing"    },
            ].map((f) => (
              <View key={f.icon} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name={f.icon as any} size={14} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        )}

        {stage === "idle" && (
          <BexoButton label="Skip for now" onPress={handleSkip} variant="ghost" />
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingHorizontal: 28, gap: 18 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  backLabel: { fontSize: 17, fontWeight: "600" },
  backHint: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  dot: { width: 20, height: 4, borderRadius: 2 },
  headline: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  sub: { fontSize: 14, lineHeight: 21 },
  dropZone: {
    height: 200, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  uploadIcon: { width: 60, height: 60, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dropLabel: { fontSize: 16, fontWeight: "600" },
  dropHint: { fontSize: 13 },
  progressCard: {
    borderRadius: 20, borderWidth: 1, padding: 28,
    alignItems: "center", gap: 14,
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
