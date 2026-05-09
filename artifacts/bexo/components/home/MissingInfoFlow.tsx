import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
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
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from "react-native-reanimated";

import { BexoButton } from "@/components/ui/BexoButton";
import { LocationInput } from "@/components/ui/LocationInput";
import { useColors } from "@/hooks/useColors";
import { uploadAvatar } from "@/services/upload";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore, type MissingField } from "@/stores/useProfileStore";

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
  const { updateProfile } = useProfileStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [value, setValue] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setValue("");
      setAvatarUri(null);
    }
  }, [visible]);

  const sectionFields: MissingField[] = missingFields.filter(
    (f) => f.type === "section"
  );
  const directFields: MissingField[] = missingFields.filter(
    (f) => f.type !== "section"
  );

  // Only handle direct fields (text/multiline/image) step by step
  // Section fields (education/experience/projects/skills) redirect to edit-profile
  const actionableFields = directFields;

  const current = actionableFields[currentIndex];
  const isLast = currentIndex >= actionableFields.length - 1;
  const progressPct =
    actionableFields.length > 0
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

  const handleSaveAndNext = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!current) {
      finish();
      return;
    }
    setSaving(true);
    try {
      if (current.type === "image") {
        if (avatarUri && user?.id) {
          const url = await uploadAvatar(user.id, avatarUri);
          await updateProfile({ avatar_url: url });
        }
      } else {
        if (value.trim()) {
          await updateProfile({ [current.key]: value.trim() });
        }
      }
      if (isLast) {
        finish();
      } else {
        setCurrentIndex((i) => i + 1);
        setValue("");
        setAvatarUri(null);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (isLast) {
      finish();
    } else {
      setCurrentIndex((i) => i + 1);
      setValue("");
      setAvatarUri(null);
    }
  };

  const finish = () => {
    setCurrentIndex(0);
    setValue("");
    setAvatarUri(null);
    onDone();
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 20);
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
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: topPad }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.mutedForeground }]}>
              Complete your profile
            </Text>
            <View style={{ width: 30 }} />
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
            <Animated.View
              entering={FadeIn}
              style={[
                styles.progressFill,
                { width: `${progressPct}%` as any, backgroundColor: colors.primary },
              ]}
            />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* No actionable direct fields - just section redirects */}
            {actionableFields.length === 0 ? (
              <Animated.View entering={FadeInRight} style={styles.card}>
                <View
                  style={[styles.iconCircle, { backgroundColor: colors.primary + "22" }]}
                >
                  <Feather name="layers" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  Add missing sections
                </Text>
                <Text style={[styles.fieldSub, { color: colors.mutedForeground }]}>
                  {sectionFields.map((f) => f.label).join(", ")} — these need at
                  least one entry each. Go to Edit Profile to add them.
                </Text>
                <BexoButton
                  label="Go to Edit Profile"
                  onPress={() => {
                    finish();
                  }}
                />
              </Animated.View>
            ) : current ? (
              <Animated.View
                key={current.key}
                entering={FadeInRight.springify()}
                exiting={FadeOutLeft.springify()}
                style={styles.card}
              >
                {/* Step indicator */}
                <Text style={[styles.stepIndicator, { color: colors.mutedForeground }]}>
                  Step {currentIndex + 1} of {actionableFields.length}
                </Text>

                {/* Field icon */}
                <View
                  style={[styles.iconCircle, { backgroundColor: colors.primary + "22" }]}
                >
                  <Feather
                    name={
                      current.type === "image"
                        ? "camera"
                        : current.key === "full_name"
                        ? "user"
                        : current.key === "bio"
                        ? "align-left"
                        : "map-pin"
                    }
                    size={32}
                    color={colors.primary}
                  />
                </View>

                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  {current.label}
                </Text>

                {/* Input */}
                {current.type === "image" ? (
                  <TouchableOpacity
                    style={[
                      styles.avatarPicker,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
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
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
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
                  label={
                    saving
                      ? "Saving…"
                      : isLast
                      ? "Save & Finish"
                      : "Save & Continue"
                  }
                  onPress={handleSaveAndNext}
                  loading={saving}
                />

                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={[styles.skipLabel, { color: colors.mutedForeground }]}>
                    Skip for now
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {/* Section fields notice */}
            {sectionFields.length > 0 && (
              <View
                style={[
                  styles.sectionNotice,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Feather name="info" size={14} color={colors.mutedForeground} />
                <Text
                  style={[styles.sectionNoticeText, { color: colors.mutedForeground }]}
                >
                  You also need to add:{" "}
                  {sectionFields.map((f) => f.label).join(", ")}. Use Edit
                  Profile to add entries.
                </Text>
              </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 14, fontWeight: "600" },
  progressTrack: { height: 3, marginHorizontal: 20, borderRadius: 999, overflow: "hidden" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 999 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  card: { gap: 16, alignItems: "center" },
  stepIndicator: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  fieldSub: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  avatarPicker: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 8,
  },
  avatarPreview: { width: 160, height: 160, borderRadius: 80 },
  avatarPickerLabel: { fontSize: 12 },
  skipBtn: { paddingVertical: 8 },
  skipLabel: { fontSize: 14, textDecorationLine: "underline" },
  sectionNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionNoticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
