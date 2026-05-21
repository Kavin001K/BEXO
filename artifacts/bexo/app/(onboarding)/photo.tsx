import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";
import { uploadAvatar } from "@/services/upload";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";

export default function PhotoScreen() {
  const colors = useColors();
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
    void tapLight();
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    setOnboardingStep("handle");
    router.push("/(onboarding)/handle");
  };

  const skipPhoto = () => {
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
          },
        },
        { text: "Add photo", style: "default" },
      ],
    );
  };

  return (
    <OnboardingShell
      stepKey="photo"
      title="Let's put a face to the name"
      subtitle="Show your best self. A friendly photo helps people trust your work."
      onBack={handleBack}
      footer={
        <>
          <BexoButton
            label={uploading ? "Uploading..." : "Continue"}
            onPress={handleContinue}
            loading={uploading}
          />
          <BexoButton label="Skip for now" onPress={skipPhoto} variant="ghost" disabled={uploading} />
        </>
      }
    >
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>Edit email address</Text>

      <View style={styles.avatarWrap}>
        <View
          style={[
            styles.avatarRing,
            {
              borderColor: imageUri ? colors.primary : colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImg} />
          ) : (
            <Feather name="user" size={48} color={colors.mutedForeground} />
          )}
        </View>
        {imageUri ? (
          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={14} color={colors.primaryForeground} />
          </View>
        ) : null}
      </View>

      <View style={styles.btnGroup}>
        <TouchableOpacity
          style={[styles.photoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          <Feather name="image" size={20} color={colors.foreground} />
          <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Choose from gallery</Text>
        </TouchableOpacity>

        {Platform.OS !== "web" && (
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={takePhoto}
            activeOpacity={0.8}
          >
            <Feather name="camera" size={20} color={colors.foreground} />
            <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Take a quick selfie</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 18, marginTop: -12 },
  avatarWrap: { alignItems: "center", justifyContent: "center", marginVertical: 8, position: "relative" },
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
