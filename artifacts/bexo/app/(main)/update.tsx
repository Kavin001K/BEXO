import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedType = TYPES.find((t) => t.id === type)!;

  const handlePost = async () => {
    if (!profile?.id) return;
    if (!title.trim()) {
      setError("Add a title");
      return;
    }
    setError("");
    setSaving(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addUpdate({
        profile_id: profile.id,
        type,
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
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
            Keep your portfolio fresh with what you've been working on
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
              placeholder={
                type === "project"
                  ? 'e.g. "Built an AI resume parser"'
                  : type === "achievement"
                  ? 'e.g. "Won XYZ Hackathon"'
                  : type === "role"
                  ? 'e.g. "Joined Google as SWE Intern"'
                  : 'e.g. "Started MS CS at Stanford"'
              }
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
});
