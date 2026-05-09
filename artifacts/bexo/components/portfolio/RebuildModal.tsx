import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { uploadAndParseResume } from "@/services/resumeParser";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

interface RebuildModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RebuildModal({ visible, onClose }: RebuildModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { profile, updateProfile, setEducation, setExperiences, setProjects, setSkills } =
    useProfileStore();
  const { triggerBuild } = usePortfolioStore();

  const [preferences, setPreferences] = useState(
    profile?.rebuild_preferences ?? ""
  );
  const [resumeFile, setResumeFile] = useState<{
    name: string;
    uri: string;
  } | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeParsed, setResumeParsed] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState("");

  const handlePickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setResumeFile({ name: asset.name, uri: asset.uri });
    setResumeParsed(false);
    setError("");
  };

  const handleParseResume = async () => {
    if (!resumeFile || !user?.id) return;
    setUploadingResume(true);
    setError("");
    try {
      const { resumeUrl, parsed } = await uploadAndParseResume(
        resumeFile.uri,
        resumeFile.name,
        user.id
      );
      await updateProfile({ resume_url: resumeUrl });
      if (parsed.education?.length) setEducation(parsed.education);
      if (parsed.experiences?.length) setExperiences(parsed.experiences);
      if (parsed.projects?.length) setProjects(parsed.projects);
      if (parsed.skills?.length) setSkills(parsed.skills);
      setResumeParsed(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to process resume");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleRebuild = async () => {
    if (!profile?.id) return;
    setRebuilding(true);
    setError("");
    try {
      await updateProfile({ rebuild_preferences: preferences });
      await triggerBuild(profile.id);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 20);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["#7C6AFA14", "transparent"]}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: topPad }]}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Rebuild Portfolio
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Tell the AI what to focus on
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Preferences */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="message-circle" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Your preferences
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                    What should the AI emphasise?
                  </Text>
                </View>
              </View>

              <TextInput
                style={[
                  styles.textarea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder={
                  "e.g. Highlight my React Native and mobile development skills.\n" +
                  "Focus on recent internships. Keep it minimal and modern."
                }
                placeholderTextColor={colors.mutedForeground}
                value={preferences}
                onChangeText={setPreferences}
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />
            </View>

            {/* Resume upload */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIcon, { backgroundColor: "#6AFAD022" }]}>
                  <Feather name="file-text" size={16} color="#6AFAD0" />
                </View>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Upload new resume (optional)
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                    AI will re-parse and update your profile data
                  </Text>
                </View>
              </View>

              {resumeFile ? (
                <View
                  style={[
                    styles.fileCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: resumeParsed ? "#6AFAD0" : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={resumeParsed ? "check-circle" : "file"}
                    size={20}
                    color={resumeParsed ? "#6AFAD0" : colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.fileName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {resumeFile.name}
                    </Text>
                    {resumeParsed && (
                      <Text style={[styles.parsedBadge, { color: "#6AFAD0" }]}>
                        Parsed successfully
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={handlePickResume}>
                    <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.uploadBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={handlePickResume}
                >
                  <Feather name="upload" size={18} color={colors.primary} />
                  <Text style={[styles.uploadLabel, { color: colors.primary }]}>
                    Choose PDF Resume
                  </Text>
                </TouchableOpacity>
              )}

              {resumeFile && !resumeParsed && (
                <TouchableOpacity
                  style={[
                    styles.parseBtn,
                    { backgroundColor: "#6AFAD022", borderColor: "#6AFAD044" },
                  ]}
                  onPress={handleParseResume}
                  disabled={uploadingResume}
                >
                  {uploadingResume ? (
                    <ActivityIndicator size="small" color="#6AFAD0" />
                  ) : (
                    <Feather name="cpu" size={15} color="#6AFAD0" />
                  )}
                  <Text style={[styles.parseBtnLabel, { color: "#6AFAD0" }]}>
                    {uploadingResume ? "Parsing with AI…" : "Parse with AI"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {error ? (
              <Text style={[styles.error, { color: "#FA6A6A" }]}>{error}</Text>
            ) : null}

            <BexoButton
              label={rebuilding ? "Rebuilding…" : "Rebuild Portfolio"}
              onPress={handleRebuild}
              loading={rebuilding}
              disabled={rebuilding}
            />

            <Text style={[styles.note, { color: colors.mutedForeground }]}>
              Your portfolio will be queued for rebuild. This usually takes 1-3 minutes.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 20 },
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionSub: { fontSize: 12, marginTop: 1 },
  textarea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 130,
    lineHeight: 21,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileName: { fontSize: 13, fontWeight: "600" },
  parsedBadge: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  uploadLabel: { fontSize: 14, fontWeight: "600" },
  parseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  parseBtnLabel: { fontSize: 13, fontWeight: "600" },
  error: { fontSize: 13, textAlign: "center" },
  note: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
