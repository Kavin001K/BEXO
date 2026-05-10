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

import { BexoButton }           from "@/components/ui/BexoButton";
import { useColors }             from "@/hooks/useColors";
import { supabase }              from "@/lib/supabase";
import { uploadAndParseResume }  from "@/services/resumeParser";
import { useAuthStore }          from "@/stores/useAuthStore";
import { usePortfolioStore }     from "@/stores/usePortfolioStore";
import { useProfileStore }       from "@/stores/useProfileStore";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = "options" | "uploading" | "parsed" | "replacing" | "rebuilding" | "done" | "error";

export function RebuildModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user   = useAuthStore((s) => s.user);
  const { profile, updateProfile, setEducation, setExperiences, setProjects, setSkills } = useProfileStore();
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

  // Upload new resume
  const handleUploadResume = async () => {
    if (!user?.id || !profile?.id) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
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
      setError(e.message ?? "Failed to process resume");
      setStep("error");
    }
  };

  // Replace: wipe all data and use parsed only
  const handleReplace = async () => {
    if (!profile?.id || !parsedResult || !resumePath) return;
    setStep("replacing");
    try {
      await Promise.all([
        supabase.from("education").delete().eq("profile_id", profile.id),
        supabase.from("experiences").delete().eq("profile_id", profile.id),
        supabase.from("projects").delete().eq("profile_id", profile.id),
        supabase.from("skills").delete().eq("profile_id", profile.id),
      ]);

      await updateProfile({
        full_name:    parsedResult.full_name    ?? profile.full_name,
        headline:     parsedResult.headline     ?? profile.headline,
        bio:          parsedResult.bio          ?? profile.bio,
        github_url:   parsedResult.github_url   ?? profile.github_url,
        linkedin_url: parsedResult.linkedin_url ?? profile.linkedin_url,
        location:     parsedResult.location     ?? profile.location,
        resume_url:   resumePath,
      });

      const pid = profile.id;
      await Promise.all([
        ...(parsedResult.education?.map((e: any) =>
          supabase.from("education").insert({ ...e, profile_id: pid })
        ) ?? []),
        ...(parsedResult.experiences?.map((e: any) =>
          supabase.from("experiences").insert({ ...e, profile_id: pid })
        ) ?? []),
        ...(parsedResult.projects?.map((p: any) =>
          supabase.from("projects").insert({ ...p, profile_id: pid })
        ) ?? []),
        parsedResult.skills?.length
          ? supabase.from("skills").insert(
              parsedResult.skills.map((s: any) => ({ ...s, profile_id: pid }))
            )
          : Promise.resolve(),
      ]);

      setEducation(parsedResult.education   ?? []);
      setExperiences(parsedResult.experiences ?? []);
      setProjects(parsedResult.projects    ?? []);
      setSkills(parsedResult.skills       ?? []);

      await triggerBuild(profile.id);
      setStep("rebuilding");
    } catch (e: any) {
      setError(e.message ?? "Failed to replace data");
      setStep("error");
    }
  };

  // Merge: keep existing + add new parsed data
  const handleMerge = async () => {
    if (!profile?.id || !parsedResult || !resumePath) return;
    setStep("replacing");
    try {
      const pid = profile.id;
      const updates: any = { resume_url: resumePath };
      if (parsedResult.full_name    && !profile.full_name)    updates.full_name    = parsedResult.full_name;
      if (parsedResult.headline     && !profile.headline)     updates.headline     = parsedResult.headline;
      if (parsedResult.bio          && !profile.bio)          updates.bio          = parsedResult.bio;
      if (parsedResult.github_url   && !profile.github_url)   updates.github_url   = parsedResult.github_url;
      if (parsedResult.linkedin_url && !profile.linkedin_url) updates.linkedin_url = parsedResult.linkedin_url;
      await updateProfile(updates);

      await Promise.all([
        ...(parsedResult.education?.map((e: any) =>
          supabase.from("education").upsert({ ...e, profile_id: pid }, { ignoreDuplicates: true })
        ) ?? []),
        ...(parsedResult.experiences?.map((e: any) =>
          supabase.from("experiences").upsert({ ...e, profile_id: pid }, { ignoreDuplicates: true })
        ) ?? []),
        ...(parsedResult.projects?.map((p: any) =>
          supabase.from("projects").upsert({ ...p, profile_id: pid }, { ignoreDuplicates: true })
        ) ?? []),
        parsedResult.skills?.length
          ? supabase.from("skills").upsert(
              parsedResult.skills.map((s: any) => ({ ...s, profile_id: pid })),
              { onConflict: "profile_id,name" }
            )
          : Promise.resolve(),
      ]);

      await triggerBuild(profile.id);
      setStep("rebuilding");
    } catch (e: any) {
      setError(e.message ?? "Failed to merge data");
      setStep("error");
    }
  };

  const handleRebuildNow = async () => {
    if (!profile?.id) return;
    setStep("rebuilding");
    await triggerBuild(profile.id);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[M.container, { backgroundColor: colors.background }]}>
        <View style={[M.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[M.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[M.title, { color: colors.foreground }]}>
            {step === "options"   ? "Rebuild Portfolio"  :
             step === "uploading" ? "Processing Resume"  :
             step === "parsed"    ? "Resume Parsed"      :
             step === "replacing" ? "Saving Changes"     :
             step === "rebuilding"? "Building…"          :
             step === "done"      ? "Done!"              :
                                    "Something went wrong"}
          </Text>
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
              <Text style={[M.desc, { color: colors.mutedForeground }]}>
                We found the following in your resume. Choose how to update your portfolio:
              </Text>

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
                    Keep current info and add new items from this resume
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* REPLACING / REBUILDING */}
          {(step === "replacing" || step === "rebuilding") && (
            <Animated.View entering={FadeIn.duration(300)} style={M.centeredContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[M.statusLabel, { color: colors.foreground }]}>
                {step === "replacing" ? "Saving your data…" : "Rebuilding portfolio…"}
              </Text>
              <Text style={[M.statusSub, { color: colors.mutedForeground }]}>
                {step === "rebuilding"
                  ? "Your portfolio site will be live in about 90 seconds."
                  : "Just a moment…"}
              </Text>
              {step === "rebuilding" && (
                <TouchableOpacity
                  style={[M.doneBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
                  onPress={handleClose}
                >
                  <Text style={[M.doneBtnText, { color: colors.primary }]}>Close (rebuilding in background)</Text>
                </TouchableOpacity>
              )}
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
  statusSub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  progressBar: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  summaryChipText: { fontSize: 12, fontWeight: "600" },
  mergeCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  mergeLabel: { fontSize: 15, fontWeight: "700" },
  mergeSub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  doneBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  doneBtnText: { fontSize: 13, fontWeight: "600" },
  errorIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  errorMsg: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 260 },
});
