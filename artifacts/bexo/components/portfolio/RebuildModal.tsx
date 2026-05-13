import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Platform,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ParsedResumeReviewContent } from "@/components/resume/ParsedResumeReviewModal";
import { BexoButton }           from "@/components/ui/BexoButton";
import { useColors }             from "@/hooks/useColors";
import { uploadAndParseResume }  from "@/services/resumeParser";
import { useAuthStore }          from "@/stores/useAuthStore";
import { usePortfolioStore }     from "@/stores/usePortfolioStore";
import { useProfileStore }       from "@/stores/useProfileStore";
import { sanitizeError }         from "@/lib/errorUtils";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = "options" | "uploading" | "parsed" | "saving" | "saved" | "rebuilding" | "error";

export function RebuildModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user   = useAuthStore((s) => s.user);
  const { profile } = useProfileStore();
  const { triggerBuild } = usePortfolioStore();

  const [step,         setStep]         = useState<Step>("options");
  const [uploadPct,    setUploadPct]    = useState(0);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [resumePath,   setResumePath]   = useState<string | null>(null);
  const [error,        setError]        = useState("");

  const reset = () => {
    setStep("options"); setUploadPct(0);
    setParsedResult(null); setResumePath(null); setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  // Check if parse has meaningful data
  const parseHasData = parsedResult && (
    (parsedResult.education?.length ?? 0) > 0 ||
    (parsedResult.experiences?.length ?? 0) > 0 ||
    (parsedResult.projects?.length ?? 0) > 0 ||
    (parsedResult.skills?.length ?? 0) > 0
  );

  // Upload new resume
  const handleUploadResume = async () => {
    if (!user?.id || !profile?.id) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;

      setStep("uploading");
      const file = res.assets[0];

      const { resumeStoragePath, parsed } = await uploadAndParseResume(
        file.uri,
        file.name,
        user.id,
        (stage, pct) => {
          if (stage === "uploading") setUploadPct(pct * 0.5);
          else setUploadPct(50 + pct * 0.5);
        }
      );

      setResumePath(resumeStoragePath);
      setParsedResult(parsed);
      setStep("parsed");
    } catch (e: any) {
      setError(sanitizeError(e));
      setStep("error");
    }
  };

  // Replace: wipe all data and use parsed only
  const handleReplace = async () => {
    if (!profile?.id || !parsedResult || !resumePath) return;
    setStep("saving");
    try {
      // Use the new atomic replaceAllData method
      await useProfileStore.getState().replaceAllDataFromResume(parsedResult, resumePath);

      // Refresh from DB to ensure local state matches
      await useProfileStore.getState().refreshFromDB();

      setStep("saved");
    } catch (e: any) {
      setError(sanitizeError(e));
      setStep("error");
    }
  };

  // Merge: keep existing + add new parsed data (smart dedup)
  const handleMerge = async () => {
    if (!profile?.id || !parsedResult || !resumePath) return;
    setStep("saving");
    try {
      // Use the new smart merge method with deduplication
      await useProfileStore.getState().mergeDataFromResume(parsedResult, resumePath);

      // Refresh from DB to ensure local state matches
      await useProfileStore.getState().refreshFromDB();

      setStep("saved");
    } catch (e: any) {
      setError(sanitizeError(e));
      setStep("error");
    }
  };

  // Only trigger rebuild after data is confirmed saved
  const handleRebuildAfterSave = async () => {
    if (!profile?.id) return;
    setStep("rebuilding");
    await triggerBuild(profile.id);
  };

  const handleRebuildNow = async () => {
    if (!profile?.id) return;
    setStep("rebuilding");
    await triggerBuild(profile.id);
  };

  const stepTitle = (() => {
    switch (step) {
      case "options":    return "Rebuild Portfolio";
      case "uploading":  return "Processing Resume";
      case "parsed":     return "Resume Parsed";
      case "saving":     return "Saving Data";
      case "saved":      return "Data Saved!";
      case "rebuilding": return "Building…";
      case "error":      return "Something went wrong";
      default:           return "Rebuild Portfolio";
    }
  })();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[M.container, { backgroundColor: colors.background }]}>
        <View style={[M.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[M.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[M.title, { color: colors.foreground }]}>{stepTitle}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={M.content}>

          {/* OPTIONS */}
          {step === "options" && (
            <Animated.View entering={FadeIn.duration(300)} style={{ gap: 12 }}>
              <Text style={[M.desc, { color: colors.mutedForeground }]}>
                Upload a new resume to refresh your portfolio data, or rebuild with your current information.
              </Text>

              <TouchableOpacity
                style={[M.optionCard, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}
                onPress={handleUploadResume}
              >
                <LinearGradient colors={["#7C6AFA11", "transparent"]} style={StyleSheet.absoluteFill} />
                <View style={[M.optionIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="upload-cloud" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[M.optionLabel, { color: colors.foreground }]}>Upload new resume</Text>
                  <Text style={[M.optionSub, { color: colors.mutedForeground }]}>
                    AI extracts updated data. Choose to replace or merge.
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[M.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleRebuildNow}
              >
                <View style={[M.optionIcon, { backgroundColor: "#FA6A6A22" }]}>
                  <Feather name="refresh-cw" size={22} color="#FA6A6A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[M.optionLabel, { color: colors.foreground }]}>Rebuild with current data</Text>
                  <Text style={[M.optionSub, { color: colors.mutedForeground }]}>
                    Re-generate the site using your existing profile info.
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* UPLOADING */}
          {step === "uploading" && (
            <Animated.View entering={FadeIn.duration(300)} style={M.centeredContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[M.statusLabel, { color: colors.foreground }]}>
                {uploadPct < 50 ? "Uploading resume…" : "AI is reading your resume…"}
              </Text>
              <View style={[M.progressBar, { backgroundColor: colors.surface }]}>
                <Animated.View style={[M.progressFill, { width: `${uploadPct}%` as any, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[M.progressText, { color: colors.mutedForeground }]}>{Math.round(uploadPct)}%</Text>
            </Animated.View>
          )}

          {/* PARSED SUMMARY */}
          {step === "parsed" && parsedResult && (
            <Animated.View entering={FadeInDown.springify()} style={{ gap: 16 }}>
              {parseHasData ? (
                <Text style={[M.desc, { color: colors.mutedForeground }]}>
                  We found the following in your resume. Choose how to update your portfolio:
                </Text>
              ) : (
                <Text style={[M.desc, { color: "#FA6A6A" }]}>
                  AI couldn't extract structured data from this resume. The data will be saved, but you may want to add items manually.
                </Text>
              )}

              {parsedResult && (
                <View style={{ maxHeight: 340, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 12, gap: 10 }}>
                    <ParsedResumeReviewContent
                      data={parsedResult}
                      lowStructureWarning={!parseHasData}
                    />
                  </ScrollView>
                </View>
              )}

              <View style={M.summaryRow}>
                {[
                  { label: `${parsedResult.education?.length ?? 0} Education`,   icon: "book",      color: colors.primary },
                  { label: `${parsedResult.experiences?.length ?? 0} Experience`, icon: "briefcase", color: "#FA6A6A"      },
                  { label: `${parsedResult.projects?.length ?? 0} Projects`,      icon: "code",      color: "#6AFAD0"      },
                  { label: `${parsedResult.skills?.length ?? 0} Skills`,          icon: "zap",       color: "#FAD06A"      },
                ].map((item) => (
                  <View key={item.label} style={[M.summaryChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name={item.icon as any} size={12} color={item.color} />
                    <Text style={[M.summaryChipText, { color: colors.foreground }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[M.mergeCard, { backgroundColor: "#FA6A6A11", borderColor: "#FA6A6A44" }]}
                onPress={() => Alert.alert(
                  "Replace all data?",
                  "This will delete your existing education, experience, projects, and skills, then replace them with what was found in this resume. This cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Replace Everything", style: "destructive", onPress: handleReplace },
                  ]
                )}
              >
                <Feather name="trash-2" size={18} color="#FA6A6A" />
                <View style={{ flex: 1 }}>
                  <Text style={[M.mergeLabel, { color: "#FA6A6A" }]}>Replace all data</Text>
                  <Text style={[M.mergeSub, { color: colors.mutedForeground }]}>
                    Delete everything and use only what's in this resume
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color="#FA6A6A" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[M.mergeCard, { backgroundColor: "#7C6AFA11", borderColor: "#7C6AFA44" }]}
                onPress={handleMerge}
              >
                <Feather name="git-merge" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[M.mergeLabel, { color: colors.primary }]}>Add to existing data</Text>
                  <Text style={[M.mergeSub, { color: colors.mutedForeground }]}>
                    Keep current info and add only new items (duplicates removed)
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* SAVING */}
          {step === "saving" && (
            <Animated.View entering={FadeIn.duration(300)} style={M.centeredContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[M.statusLabel, { color: colors.foreground }]}>Saving your data…</Text>
              <Text style={[M.statusSub, { color: colors.mutedForeground }]}>
                Writing to database. Just a moment…
              </Text>
            </Animated.View>
          )}

          {/* SAVED — user chooses to rebuild or close */}
          {step === "saved" && (
            <Animated.View entering={FadeInDown.springify()} style={M.centeredContent}>
              <View style={[M.successIcon, { backgroundColor: "#6AFAD022" }]}>
                <Feather name="check-circle" size={32} color="#6AFAD0" />
              </View>
              <Text style={[M.statusLabel, { color: colors.foreground }]}>Data saved successfully!</Text>
              <Text style={[M.statusSub, { color: colors.mutedForeground }]}>
                Your portfolio data has been updated. You can now rebuild your site or review the changes first.
              </Text>

              <BexoButton
                label="Rebuild Portfolio Now"
                onPress={handleRebuildAfterSave}
                icon={<Feather name="refresh-cw" size={14} color="#fff" />}
              />

              <TouchableOpacity
                style={[M.doneBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[M.doneBtnText, { color: colors.mutedForeground }]}>Review changes first</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* REBUILDING */}
          {step === "rebuilding" && (
            <Animated.View entering={FadeIn.duration(300)} style={M.centeredContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[M.statusLabel, { color: colors.foreground }]}>Rebuilding portfolio…</Text>
              <Text style={[M.statusSub, { color: colors.mutedForeground }]}>
                Your portfolio site will be live in about 90 seconds.
              </Text>
              <TouchableOpacity
                style={[M.doneBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
                onPress={handleClose}
              >
                <Text style={[M.doneBtnText, { color: colors.primary }]}>Close (rebuilding in background)</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ERROR */}
          {step === "error" && (
            <Animated.View entering={FadeIn.duration(300)} style={M.centeredContent}>
              <View style={[M.errorIcon, { backgroundColor: "#FA6A6A22" }]}>
                <Feather name="alert-circle" size={32} color="#FA6A6A" />
              </View>
              <Text style={[M.statusLabel, { color: colors.foreground }]}>Something went wrong</Text>
              <Text style={[M.errorMsg, { color: colors.mutedForeground }]}>{error}</Text>
              <BexoButton label="Try again" onPress={reset} />
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const M = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  cancel: { fontSize: 15, width: 60 },
  title:  { fontSize: 17, fontWeight: "700" },
  content: { padding: 20, gap: 16, flexGrow: 1 },
  desc: { fontSize: 14, lineHeight: 21 },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden",
  },
  optionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: 15, fontWeight: "700" },
  optionSub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  centeredContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 40 },
  statusLabel: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  statusSub: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  progressBar: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  summaryChipText: { fontSize: 12, fontWeight: "600" },
  mergeCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  mergeLabel: { fontSize: 15, fontWeight: "700" },
  mergeSub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  successIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  doneBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 8, width: "100%", alignItems: "center" },
  doneBtnText: { fontSize: 13, fontWeight: "600" },
  errorIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  errorMsg: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 260 },
});
