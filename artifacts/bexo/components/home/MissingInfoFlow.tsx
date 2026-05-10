import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from "react-native-reanimated";

import { BexoButton } from "@/components/ui/BexoButton";
import { LocationInput } from "@/components/ui/LocationInput";
import { useColors } from "@/hooks/useColors";
import { uploadAvatar } from "@/services/upload";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore, type MissingField, type Profile } from "@/stores/useProfileStore";

interface Props {
  visible: boolean;
  missingFields: MissingField[];
  onClose: () => void;
  onDone: () => void;
}

export function MissingInfoFlow({ visible, missingFields, onClose, onDone }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { updateProfile, fetchProfile } = useProfileStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [value, setValue] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setValue("");
      setAvatarUri(null);
    }
  }, [visible]);

  const sectionFields: MissingField[] = missingFields.filter((f) => f.type === "section");
  const directFields: MissingField[]  = missingFields.filter((f) => f.type !== "section");
  const actionableFields = directFields;

  const current   = actionableFields[currentIndex];
  const isLast    = currentIndex >= actionableFields.length - 1;
  const progressPct = actionableFields.length > 0
    ? ((currentIndex + 1) / actionableFields.length) * 100
    : 100;

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to pick an avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const goNext = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= actionableFields.length) {
      if (user?.id) fetchProfile(user.id);
      onDone();
    } else {
      setValue("");
      setAvatarUri(null);
      setCurrentIndex(nextIdx);
    }
  };

  const handleSave = async () => {
    if (!current || !user) return;
    setSaving(true);

    try {
      if (current.type === "image") {
        if (!avatarUri) {
          goNext(); return;
        }
        const url = await uploadAvatar(user.id, avatarUri);
        await updateProfile({ avatar_url: url });

      } else if (current.type === "text" || current.type === "multiline") {
        if (!value.trim()) {
          goNext(); return;
        }
        const updateMap: Record<string, Partial<Profile>> = {
          full_name: { full_name: value.trim() },
          headline:  { headline:  value.trim() },
          bio:       { bio:       value.trim() },
          location:  { location:  value.trim() },
        };
        const profileUpdate = updateMap[current.key];
        if (profileUpdate) {
          await updateProfile(profileUpdate);
        }

      } else if (current.type === "section") {
        const tabMap: Record<string, string> = {
          education:  "education",
          experience: "experience",
          projects:   "projects",
          skills:     "skills",
        };
        onClose();
        router.push({
          pathname: "/edit-profile",
          params: { tab: tabMap[current.key] ?? "profile" },
        });
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      goNext();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => goNext();

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 20);
  const bottomPad = insets.bottom + 20;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["#7C6AFA18", "transparent"]}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.header, { paddingTop: topPad }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.mutedForeground }]}>
              Complete your profile
            </Text>
            <View style={{ width: 30 }} />
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
            <Animated.View
              entering={FadeIn}
              style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: colors.primary }]}
            />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {actionableFields.length === 0 ? (
              <Animated.View entering={FadeInRight} style={styles.card}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="layers" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  Add missing sections
                </Text>
                <Text style={[styles.fieldSub, { color: colors.mutedForeground, marginBottom: 8 }]}>
                  These sections need at least one entry. Tap a section to add it.
                </Text>

                <View style={{ width: "100%", gap: 10 }}>
                  {sectionFields.map((field) => (
                    <TouchableOpacity
                      key={field.key}
                      style={[styles.sectionItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => {
                        onDone();
                        router.push({
                          pathname: "/edit-profile",
                          params: { tab: field.key === "experience" ? "experience" : field.key },
                        });
                      }}
                    >
                      <View style={[styles.sectionItemIcon, { backgroundColor: colors.primary + "11" }]}>
                        <Feather
                          name={
                            field.key === "education" ? "book"
                            : field.key === "experience" ? "briefcase"
                            : field.key === "projects" ? "code"
                            : "zap"
                          }
                          size={16}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={[styles.sectionItemLabel, { color: colors.foreground }]}>{field.label}</Text>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  ))}
                </View>

                <BexoButton
                  label="Go to Edit Profile"
                  variant="secondary"
                  onPress={() => { onDone(); router.push("/edit-profile"); }}
                />
              </Animated.View>
            ) : current ? (
              <Animated.View
                key={current.key}
                entering={FadeInRight.springify()}
                exiting={FadeOutLeft.springify()}
                style={styles.card}
              >
                <Text style={[styles.stepIndicator, { color: colors.mutedForeground }]}>
                  Step {currentIndex + 1} of {actionableFields.length}
                </Text>

                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "22" }]}>
                  <Feather
                    name={
                      current.type === "image" ? "camera"
                      : current.key === "full_name" ? "user"
                      : current.key === "bio" ? "align-left"
                      : "map-pin"
                    }
                    size={32}
                    color={colors.primary}
                  />
                </View>

                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{current.label}</Text>

                {current.type === "image" ? (
                  <TouchableOpacity
                    style={[styles.avatarPicker, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={handlePickAvatar}
                  >
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
                    ) : (
                      <>
                        <Feather name="upload" size={24} color={colors.primary} />
                        <Text style={[styles.avatarPickerLabel, { color: colors.mutedForeground }]}>
                          Tap to choose a photo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : current.key === "location" ? (
                  <LocationInput
                    value={value}
                    onChangeText={setValue}
                    placeholder={current.placeholder ?? "City, Country"}
                    autoFocus
                  />
                ) : (
                  <TextInput
                    style={[
                      styles.input,
                      current.type === "multiline" && styles.textarea,
                      { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
                    ]}
                    placeholder={current.placeholder ?? ""}
                    placeholderTextColor={colors.mutedForeground}
                    value={value}
                    onChangeText={setValue}
                    multiline={current.type === "multiline"}
                    textAlignVertical={current.type === "multiline" ? "top" : "center"}
                    selectionColor={colors.primary}
                    autoFocus
                  />
                )}

                <BexoButton
                  label={saving ? "Saving…" : isLast ? "Save & Finish" : "Save & Continue"}
                  onPress={handleSave}
                  loading={saving}
                />

                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={[styles.skipLabel, { color: colors.mutedForeground }]}>Skip for now</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {sectionFields.length > 0 && actionableFields.length > 0 && (
              <TouchableOpacity
                onPress={() => { onDone(); router.push("/edit-profile"); }}
                style={[styles.sectionNotice, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Feather name="info" size={14} color={colors.mutedForeground} />
                <Text style={[styles.sectionNoticeText, { color: colors.mutedForeground }]}>
                  You also need to add:{" "}
                  {sectionFields.map((f) => f.label).join(", ")}. Tap to go to Edit Profile.
                </Text>
              </TouchableOpacity>
            )}
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  closeBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 14, fontWeight: "600" },
  progressTrack: { height: 3, marginHorizontal: 20, borderRadius: 999, overflow: "hidden" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 999 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  card: { gap: 16, alignItems: "center" },
  stepIndicator: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  fieldSub: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  input: {
    width: "100%", borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  avatarPicker: {
    width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 8,
  },
  avatarPreview: { width: 160, height: 160, borderRadius: 80 },
  avatarPickerLabel: { fontSize: 12 },
  skipBtn: { paddingVertical: 8 },
  skipLabel: { fontSize: 14, textDecorationLine: "underline" },
  sectionNotice: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  sectionNoticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  sectionItem: {
    width: "100%", flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 12, borderWidth: 1, gap: 12,
  },
  sectionItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionItemLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
});
