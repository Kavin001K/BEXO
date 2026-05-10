import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { uploadAttachments } from "@/services/achievementParser";
import { showErrorAlert } from "@/lib/errorUtils";

type DetailType = "update" | "education" | "experience" | "project";

export default function DetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { type, id } = useLocalSearchParams<{ type: DetailType; id: string }>();

  const { updates, updateUpdate, deleteUpdate, addAttachment, deleteAttachment } = usePortfolioStore();
  const {
    education, saveEducation, deleteEducation,
    experiences, saveExperience, deleteExperience,
    projects, saveProject, deleteProject,
  } = useProfileStore();

  const [item, setItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ASSETS_BASE = "https://assets.mybexo.com";

  const ensureAbsolute = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${ASSETS_BASE}/${url.startsWith("/") ? url.slice(1) : url}`;
  };

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subTitle, setSubTitle] = useState(""); // institution, company, etc.
  const [date, setDate] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    let found: any = null;
    if (type === "update") {
      found = updates.find((u) => u.id === id);
    } else if (type === "education") {
      found = education.find((e) => e.id === id);
    } else if (type === "experience") {
      found = experiences.find((e) => e.id === id);
    } else if (type === "project") {
      found = projects.find((p) => p.id === id);
    }

    if (found) {
      setItem(found);
      if (type === "update") {
        setTitle(found.title);
        setDescription(found.description);
        setLinkUrl(found.link_url ?? "");
      } else if (type === "education") {
        setTitle(found.institution);
        setSubTitle(found.degree);
        setDescription(found.field ?? "");
        setDate(found.start_year?.toString() ?? "");
      } else if (type === "experience") {
        setTitle(found.company);
        setSubTitle(found.role);
        setDescription(found.description);
        setDate(found.start_date);
      } else if (type === "project") {
        setTitle(found.title);
        setDescription(found.description);
        setLinkUrl(found.live_url ?? "");
      }
    }
  }, [type, id, updates, education, experiences, projects]);

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (type === "update") {
        await updateUpdate(id, { title, description, link_url: linkUrl });
      } else if (type === "education") {
        const year = parseInt(date);
        await saveEducation({
          ...item,
          institution: title,
          degree: subTitle,
          field: description,
          start_year: !isNaN(year) ? year : item.start_year,
        });
      } else if (type === "experience") {
        await saveExperience({
          ...item,
          company: title,
          role: subTitle,
          description,
          start_date: date,
        });
      } else if (type === "project") {
        await saveProject({
          ...item,
          title,
          description,
          live_url: linkUrl,
        });
      }
      setIsEditing(false);
    } catch (e: any) {
      showErrorAlert(e, "Save Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!res.canceled && res.assets) {
      setLoading(true);
      try {
        const localFiles = res.assets.map(a => ({
          uri: a.uri,
          name: a.fileName || `photo_${Date.now()}.jpg`,
          mimeType: "image/jpeg"
        }));
        const uploaded = await uploadAttachments(localFiles);
        for (const attr of uploaded) {
          await addAttachment(id, attr);
        }
      } catch (e: any) {
        showErrorAlert(e, "Upload Failed");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddPDF = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", multiple: true });
    if (!res.canceled && res.assets) {
      setLoading(true);
      try {
        const localFiles = res.assets.map(a => ({
          uri: a.uri,
          name: a.name,
          mimeType: "application/pdf"
        }));
        const uploaded = await uploadAttachments(localFiles);
        for (const attr of uploaded) {
          await addAttachment(id, attr);
        }
      } catch (e: any) {
        showErrorAlert(e, "Upload Failed");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAttachment = (attrId: string) => {
    Alert.alert("Delete Attachment", "Remove this file permanently?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: () => deleteAttachment(attrId) 
      }
    ]);
  };

  const openSafeUrl = (url: string) => {
    if (!url) return;
    const clean = url.trim();
    Linking.openURL(clean).catch(() => {
      Alert.alert("Error", "Could not open this link.");
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (type === "update") await deleteUpdate(id);
              else if (type === "education") await deleteEducation(id);
              else if (type === "experience") await deleteExperience(id);
              else if (type === "project") await deleteProject(id);
              router.back();
            } catch (e: any) {
              showErrorAlert(e, "Delete Failed");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const attachments = item.attachments ?? [];
  const images = attachments.filter((a: any) => a.type === "image");
  const pdfs = attachments.filter((a: any) => a.type === "pdf");
  const headerImage = images.length > 0 ? ensureAbsolute(images[0].url) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {/* Header Image or Placeholder */}
          <View style={styles.header}>
            {headerImage ? (
              <Image source={{ uri: headerImage }} style={styles.headerImage} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[colors.primary + "33", colors.background]}
                style={styles.headerPlaceholder}
              >
                <Feather
                  name={
                    type === "update" ? "award" :
                    type === "education" ? "book" :
                    type === "experience" ? "briefcase" : "layout"
                  }
                  size={48}
                  color={colors.primary}
                />
              </LinearGradient>
            )}
            <TouchableOpacity
              style={[styles.backBtn, { top: insets.top + 10 }]}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            {/* Attachments Section */}
            {(attachments.length > 0 || (isEditing && type === "update")) && (
              <View style={[styles.section, { marginTop: -8, marginBottom: 8 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Attachments</Text>
                  {isEditing && type === "update" && (
                    <View style={styles.addButtons}>
                      <TouchableOpacity onPress={handleAddPhoto} style={styles.smallAddBtn}>
                        <Feather name="image" size={14} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleAddPDF} style={styles.smallAddBtn}>
                        <Feather name="file-text" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                {/* Image Gallery */}
                {images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                    {images.map((img: any, idx: number) => {
                      const absUrl = ensureAbsolute(img.url);
                      return (
                        <TouchableOpacity 
                          key={img.id} 
                          onPress={() => isEditing ? handleDeleteAttachment(img.id) : openSafeUrl(absUrl)}
                          activeOpacity={0.9}
                          style={styles.galleryItem}
                        >
                          <Image source={{ uri: absUrl }} style={styles.galleryImage} contentFit="cover" />
                          {idx === 0 && <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>Cover</Text></View>}
                          {isEditing && (
                            <View style={styles.deleteBadge}>
                              <Feather name="x" size={10} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* PDF List */}
                {pdfs.length > 0 && (
                  <View style={styles.pdfList}>
                    {pdfs.map((pdf: any) => {
                      const absUrl = ensureAbsolute(pdf.url);
                      return (
                        <TouchableOpacity 
                          key={pdf.id} 
                          style={[styles.pdfItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => isEditing ? handleDeleteAttachment(pdf.id) : openSafeUrl(absUrl)}
                        >
                          <View style={[styles.pdfIcon, { backgroundColor: "#FA6A6A22" }]}>
                            <Feather name="file-text" size={16} color="#FA6A6A" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pdfName, { color: colors.foreground }]} numberOfLines={1}>
                              {pdf.name || "View PDF Document"}
                            </Text>
                            <Text style={[styles.pdfSub, { color: colors.mutedForeground }]}>
                              {isEditing ? "Tap to remove file" : "Tap to open attachment"}
                            </Text>
                          </View>
                          <Feather name={isEditing ? "trash-2" : "chevron-right"} size={16} color={isEditing ? "#FA6A6A" : colors.mutedForeground} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeLabel, { color: colors.primary }]}>{type.toUpperCase()}</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Title"
                    placeholderTextColor={colors.mutedForeground}
                  />
                ) : (
                  <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                style={[styles.editBtn, { backgroundColor: isEditing ? colors.primary + "22" : colors.surface }]}
              >
                <Feather name={isEditing ? "x" : "edit-2"} size={16} color={isEditing ? colors.primary : colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Subtitle / Organisation */}
            {(subTitle || isEditing) && (type === "education" || type === "experience") && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  {type === "education" ? "Degree" : "Role"}
                </Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface }]}
                    value={subTitle}
                    onChangeText={setSubTitle}
                  />
                ) : (
                  <Text style={[styles.subTitle, { color: colors.foreground }]}>{subTitle}</Text>
                )}
              </View>
            )}

            {/* Date */}
            {(date || isEditing) && (type === "education" || type === "experience") && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Date / Year</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface }]}
                    value={date}
                    onChangeText={setDate}
                    placeholder="e.g. 2024 or Oct 2023"
                  />
                ) : (
                  <View style={styles.row}>
                    <Feather name="calendar" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{date}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Description</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface }]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={[styles.description, { color: colors.foreground }]}>
                  {description || "No description provided."}
                </Text>
              )}
            </View>

            {(linkUrl || isEditing) && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Link</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface }]}
                    value={linkUrl}
                    onChangeText={setLinkUrl}
                    placeholder="https://..."
                  />
                ) : (
                  <TouchableOpacity style={styles.row} onPress={() => linkUrl && openSafeUrl(ensureAbsolute(linkUrl))}>
                    <Feather name="link" size={14} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary }]}>{linkUrl}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isEditing && (
              <View style={styles.actions}>
                <BexoButton
                  label="Save Changes"
                  onPress={handleSave}
                  loading={loading}
                />
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.deleteBtn}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FA6A6A" />
                  ) : (
                    <>
                      <Feather name="trash-2" size={16} color="#FA6A6A" />
                      <Text style={styles.deleteText}>Delete Item</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 260, position: "relative" },
  headerImage: { width: "100%", height: "100%" },
  headerPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 24, gap: 24 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  typeLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  titleInput: { fontSize: 26, fontWeight: "900", borderBottomWidth: 1, paddingBottom: 4 },
  editBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  subTitle: { fontSize: 18, fontWeight: "700" },
  description: { fontSize: 15, lineHeight: 24, opacity: 0.8 },
  input: { padding: 14, borderRadius: 12, fontSize: 15, fontWeight: "600" },
  textArea: { padding: 14, borderRadius: 12, fontSize: 15, lineHeight: 22, minHeight: 120 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { fontSize: 14, fontWeight: "600" },
  linkText: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
  actions: { marginTop: 20, gap: 16 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FA6A6A33",
  },
  deleteText: { color: "#FA6A6A", fontSize: 15, fontWeight: "700" },
  gallery: { marginTop: 4 },
  galleryItem: { marginRight: 12, position: "relative" },
  galleryImage: { width: 160, height: 110, borderRadius: 12 },
  coverBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coverBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  pdfList: { gap: 10, marginTop: 12 },
  pdfItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  pdfIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pdfName: { fontSize: 15, fontWeight: "700" },
  pdfSub: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  addButtons: { flexDirection: "row", gap: 12 },
  smallAddBtn: { padding: 6, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)" },
  deleteBadge: { position: "absolute", top: -6, right: 6, backgroundColor: "#FA6A6A", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000" },
});
