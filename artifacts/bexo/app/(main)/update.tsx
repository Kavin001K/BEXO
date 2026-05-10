import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { uploadAttachments, scanAttachments, LocalFile } from "@/services/achievementParser";

type UpdateType = "project" | "achievement" | "role" | "education";

const TYPES: { id: UpdateType; label: string; icon: string; color: string }[] = [
  { id: "project", label: "Project", icon: "code", color: "#7C6AFA" },
  { id: "achievement", label: "Achievement", icon: "award", color: "#6AFAD0" },
  { id: "role", label: "New Role", icon: "briefcase", color: "#FA6A6A" },
  { id: "education", label: "Education", icon: "book-open", color: "#FAD06A" },
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
  
  // Multi-file state
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [scannedAttachments, setScannedAttachments] = useState<{ url: string; type: "image" | "pdf" }[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const selectedType = TYPES.find((t) => t.id === type)!;

  const imageCount = files.filter(f => f.mimeType.includes("image")).length;
  const pdfCount = files.filter(f => f.mimeType.includes("pdf")).length;

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
      const newFiles: LocalFile[] = res.assets.map(a => ({
        uri: a.uri,
        name: a.fileName || `photo_${Date.now()}.jpg`,
        mimeType: "image/jpeg"
      }));
      setFiles([...files, ...newFiles]);
      setScannedAttachments([]); // Reset if new files added
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
      multiple: true 
    });
    
    if (!res.canceled && res.assets) {
      const newFiles: LocalFile[] = res.assets.map(a => ({
        uri: a.uri,
        name: a.name,
        mimeType: "application/pdf"
      }));
      setFiles([...files, ...newFiles]);
      setScannedAttachments([]); // Reset if new files added
      setError("");
    }
  };

  const removeFile = (uri: string) => {
    setFiles(files.filter(f => f.uri !== uri));
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
      if (result.type) setType(result.type as any);
      if (result.attachments) setScannedAttachments(result.attachments);
      
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message ?? "Scan failed.");
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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let finalAttachments = [...scannedAttachments];

      // If we haven't scanned (or added new files since scanning), upload all
      if (finalAttachments.length === 0 && files.length > 0) {
        finalAttachments = await uploadAttachments(files);
      }

      await addUpdate({
        profile_id: profile.id,
        type,
        title: title.trim(),
        description: description.trim(),
        link_url: linkUrl.trim() || null,
      }, finalAttachments);

      setTitle("");
      setDescription("");
      setLinkUrl("");
      setFiles([]);
      setScannedAttachments([]);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message ?? "Could not post update");
    } finally {
      setSaving(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 80);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[selectedType.color + "18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 16, paddingBottom: bottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Post Update</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Upload up to 5 images and 3 PDFs. AI will scan all of them.
          </Text>

          {/* Type selector */}
          <View style={styles.typeGrid}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: type === t.id ? t.color + "22" : colors.surface,
                    borderColor: type === t.id ? t.color : colors.border,
                  },
                ]}
                onPress={() => setType(t.id)}
                activeOpacity={0.8}
              >
                <Feather name={t.icon as any} size={20} color={type === t.id ? t.color : colors.mutedForeground} />
                <Text
                  style={[
                    styles.typeLabel,
                    { color: type === t.id ? t.color : colors.mutedForeground },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="e.g. Build an AI resume parser"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              selectionColor={colors.primary}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description (optional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Share more details about this update..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={400}
              textAlignVertical="top"
              selectionColor={colors.primary}
            />
          </View>

          {/* Attachments */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Attachments ({imageCount}/5 Photos, {pdfCount}/3 PDFs)
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
                  <View key={f.uri} style={[styles.attachmentPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Feather name={f.mimeType.includes("pdf") ? "file-text" : "image"} size={16} color={colors.primary} />
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
              style={[styles.scanBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "33" }]}
              onPress={handleScanWithAI}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="cpu" size={16} color={colors.primary} />
              )}
              <Text style={[styles.scanBtnLabel, { color: colors.primary }]}>
                {scanning ? "Scanning all files..." : "Scan all certificates with AI"}
              </Text>
            </TouchableOpacity>
          )}

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <BexoButton
            label={saving ? "Posting..." : "Post Update"}
            onPress={handlePost}
            loading={saving}
            disabled={!title.trim() || saving}
            icon={<Feather name="send" size={16} color="#fff" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  pageTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 14, lineHeight: 21 },
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
  typeLabel: { fontSize: 14, fontWeight: "600" },
  field: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  textarea: { minHeight: 120 },
  error: { fontSize: 13 },
  inputWrapper: { position: "relative", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 16, zIndex: 1 },
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
    marginTop: 8,
  },
  scanBtnLabel: { fontSize: 14, fontWeight: "700" },
});
