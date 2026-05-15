import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { uploadAvatar } from "@/services/upload";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

export default function PhotoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const setOnboardingStep = useProfileStore((s) => s.setOnboardingStep);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [imageUri, setImageUri] = useState<string | null>(profile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Permission required to access photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setError("");
    }
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOnboardingStep("email");
    router.replace("/(onboarding)/email");
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setError("");
    }
  };

  const handleContinue = async () => {
    if (!user) return;
    if (imageUri) {
      setUploading(true);
      try {
        const url = await uploadAvatar(user.id, imageUri);
        await updateProfile({ avatar_url: url });
      } catch (e: any) {
        setError(e.message ?? "Upload failed");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    setOnboardingStep("handle");
    router.push("/(onboarding)/handle");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#FA6A6A18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back to edit email"
          style={styles.backRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.primary} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.backHint, { color: colors.mutedForeground }]}>
          Edit email address
        </Text>

        <View style={styles.stepRow}>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary, width: 30 }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          Let's put a face to the name
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Show your best self. A friendly photo helps people trust your work.
        </Text>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View
            style={[
              styles.avatarRing,
              { borderColor: imageUri ? colors.primary : colors.border, backgroundColor: colors.surface },
            ]}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatarImg} />
            ) : (
              <Feather name="user" size={48} color={colors.mutedForeground} />
            )}
          </View>
          {imageUri && (
            <View style={[styles.checkBadge, { backgroundColor: colors.mint }]}>
              <Feather name="check" size={14} color="#0A0A0F" />
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Feather name="image" size={20} color={colors.foreground} />
            <Text style={[styles.photoBtnText, { color: colors.foreground }]}>
              Choose from my gallery
            </Text>
          </TouchableOpacity>

          {Platform.OS !== "web" && (
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={takePhoto}
              activeOpacity={0.8}
            >
              <Feather name="camera" size={20} color={colors.foreground} />
              <Text style={[styles.photoBtnText, { color: colors.foreground }]}>
                Take a quick selfie
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
        ) : null}

        <BexoButton
          label={uploading ? "Uploading..." : "Continue"}
          onPress={handleContinue}
          loading={uploading}
        />

        <BexoButton
          label="Skip for now"
          onPress={() => {
            Alert.alert(
              "Keep going?",
              "A portfolio with a friendly photo is much more likely to be seen. You can always add one later in your settings.",
              [
                { 
                  text: "Skip anyway", 
                  style: "destructive",
                  onPress: () => {
                    setOnboardingStep("handle");
                    router.push("/(onboarding)/handle");
                  }
                },
                { text: "Add photo", style: "default" }
              ]
            );
          }}
          variant="ghost"
          disabled={uploading}
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingHorizontal: 28, gap: 18, alignItems: "stretch" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  backLabel: { fontSize: 17, fontWeight: "600" },
  backHint: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  dot: { width: 20, height: 4, borderRadius: 2 },
  headline: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  sub: { fontSize: 14, lineHeight: 21 },
  avatarWrap: { alignItems: "center", justifyContent: "center", marginVertical: 16, position: "relative" },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 140, height: 140, borderRadius: 70 },
  checkBadge: {
    position: "absolute",
    bottom: 4,
    right: "50%",
    marginRight: -80,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGroup: { gap: 10 },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  photoBtnText: { fontSize: 15, fontWeight: "500" },
  error: { fontSize: 13 },
});
