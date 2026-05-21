import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { FormField } from "@/components/ui/FormField";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { success, tapLight, tapMedium } from "@/lib/haptics";
import { sanitizeError } from "@/lib/errorUtils";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { uploadAttachments, scanAttachments, LocalFile } from "@/services/achievementParser";

type UpdateType = "project" | "achievement" | "role" | "education";

const TYPES: { id: UpdateType; label: string; icon: string; colorKey: "primary" | "accent" | "mint" | "warning" }[] = [
  { id: "project", label: "Project", icon: "code", colorKey: "primary" },
  { id: "achievement", label: "Achievement", icon: "award", colorKey: "mint" },
  { id: "role", label: "New Role", icon: "briefcase", colorKey: "accent" },
  { id: "education", label: "Education", icon: "book-open", colorKey: "warning" },
];

export default function UpdateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((s) => s.profile);
  const { addUpdate } = usePortfolioStore();

  const [type, setType] = useState<UpdateType>("achievement");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [scannedAttachments, setScannedAttachments] = useState<{ url: string; type: "image" | "pdf" }[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const imageCount = files.filter((f) => f.mimeType.includes("image")).length;
  const pdfCount = files.filter((f) => f.mimeType.includes("pdf")).length;

  const handlePickPhoto = async () => {
    if (imageCount >= 5) {
      setError("Max 5 images allowed");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5 - imageCount,
    });

    if (!res.canceled && res.assets) {
      const newFiles: LocalFile[] = res.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `photo_${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      }));
      setFiles([...files, ...newFiles]);
      setScannedAttachments([]);
      setError("");
    }
  };

  const handlePickPDF = async () => {
    if (pdfCount >= 3) {
      setError("Max 3 PDFs allowed");
      return;
    }
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: true,
    });

    if (!res.canceled && res.assets) {
      const newFiles: LocalFile[] = res.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: "application/pdf",
      }));
      setFiles([...files, ...newFiles]);
      setScannedAttachments([]);
      setError("");
    }
  };

  const removeFile = (uri: string) => {
    setFiles(files.filter((f) => f.uri !== uri));
    setScannedAttachments([]);
  };

  const handleScanWithAI = async () => {
    if (files.length === 0) return;
    setScanning(true);
    setError("");
    try {
      const result = await scanAttachments(files);
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.type) setType(result.type as UpdateType);
      if (result.attachments) setScannedAttachments(result.attachments);
      await success();
    } catch (e: unknown) {
      setError(sanitizeError(e));
    } finally {
      setScanning(false);
    }
  };

  const handlePost = async () => {
    if (!profile?.id || !profile.user_id) return;
    if (!title.trim()) {
      setError("Add a title");
      return;
    }
    setError("");
    setSaving(true);
    await tapMedium();
    try {
      let finalAttachments = [...scannedAttachments];

      if (finalAttachments.length === 0 && files.length > 0) {
        finalAttachments = await uploadAttachments(files);
      }

      await addUpdate(
        {
          profile_id: profile.id,
          type,
          title: title.trim(),
          description: description.trim(),
          link_url: linkUrl.trim() || null,
        },
        finalAttachments
      );

      setTitle("");
      setDescription("");
      setLinkUrl("");
      setFiles([]);
      setScannedAttachments([]);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(sanitizeError(e));
    } finally {
      setSaving(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + 80;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 8, paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Post update"
          subtitle="Upload up to 5 images and 3 PDFs. AI can scan certificates and awards."
        />

        <View style={styles.typeGrid}>
          {TYPES.map((t) => {
            const tint = colors[t.colorKey];
            const active = type === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: active ? tint + "14" : colors.surface,
                    borderColor: active ? tint : colors.border,
                  },
                ]}
                onPress={() => {
                  void tapLight();
                  setType(t.id);
                }}
                activeOpacity={0.85}
              >
                <Feather name={t.icon as any} size={20} color={active ? tint : colors.mutedForeground} />
                <Text style={[styles.typeLabel, { color: active ? tint : colors.mutedForeground }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FormField
          label="Title"
          placeholder="e.g. Built an AI resume parser"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          error={error && !title.trim() ? error : undefined}
        />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description (optional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="Share more details about this update…"
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={400}
            textAlignVertical="top"
            selectionColor={colors.primary}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Attachments ({imageCount}/5 photos, {pdfCount}/3 PDFs)
          </Text>
          <View style={styles.attachmentRow}>
            <TouchableOpacity
              style={[styles.attachBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handlePickPhoto}
            >
              <Feather name="image" size={18} color={colors.mutedForeground} />
              <Text style={[styles.attachBtnLabel, { color: colors.mutedForeground }]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handlePickPDF}
            >
              <Feather name="file-text" size={18} color={colors.mutedForeground} />
              <Text style={[styles.attachBtnLabel, { color: colors.mutedForeground }]}>PDF</Text>
            </TouchableOpacity>
          </View>

          {files.length > 0 && (
            <View style={styles.fileList}>
              {files.map((f) => (
                <View
                  key={f.uri}
                  style={[styles.attachmentPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Feather
                    name={f.mimeType.includes("pdf") ? "file-text" : "image"}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.attachmentName, { color: colors.foreground }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeFile(f.uri)} style={styles.removeMedia}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {files.length > 0 && (type === "achievement" || type === "education") && (
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "33" }]}
            onPress={handleScanWithAI}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="cpu" size={16} color={colors.primary} />
            )}
            <Text style={[styles.scanBtnLabel, { color: colors.primary }]}>
              {scanning ? "Scanning all files…" : "Scan certificates with AI"}
            </Text>
          </TouchableOpacity>
        )}

        {error && title.trim() ? (
          <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
        ) : null}

        <BexoButton
          label={saving ? "Posting…" : "Post update"}
          onPress={handlePost}
          loading={saving}
          disabled={!title.trim() || saving}
          icon={<Feather name="send" size={16} color="#fff" />}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 16, paddingTop: 8 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeLabel: { fontSize: 14, fontWeight: "600", fontFamily: fonts.sansMedium },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  textarea: { minHeight: 120 },
  error: { fontSize: 13 },
  attachmentRow: { flexDirection: "row", gap: 12 },
  fileList: { gap: 8, marginTop: 8 },
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  attachBtnLabel: { fontSize: 14, fontWeight: "600" },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  attachmentName: { flex: 1, fontSize: 14, fontWeight: "500" },
  removeMedia: { padding: 4 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  scanBtnLabel: { fontSize: 14, fontWeight: "700" },
});
