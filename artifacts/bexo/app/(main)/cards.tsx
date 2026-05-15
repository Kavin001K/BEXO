import { Feather } from "@expo/vector-icons";
import {
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  InteractionManager,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";

import { IdentityCard, BexoLogo } from "@/components/IdentityCard";
import {
  CARD_PALETTES,
  CARD_TEMPLATES,
  CARD_TYPEFACES,
  getIdentityCardProps,
  getPaletteById,
  type CardPalette,
  type CardTemplateId,
} from "@/constants/identityCard";
import { useColors } from "@/hooks/useColors";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

const SHARE_WIDTH = 392;

export default function CardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, projects } = useProfileStore();
  const { analytics, portfolioUrl, updates } = usePortfolioStore();

  const [selectedPalette, setSelectedPalette] = useState<CardPalette>(CARD_PALETTES[0]);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplateId>("standard");
  const [selectedFont, setSelectedFont] = useState(CARD_TYPEFACES[0].fontFamily);
  const [isSharing, setIsSharing] = useState(false);

  const viewShotRef = useRef<any>(null);

  useEffect(() => {
    if (!profile) return;
    const p = getIdentityCardProps(profile);
    setSelectedPalette(getPaletteById(p.paletteId));
    setSelectedTemplate(p.templateId);
    setSelectedFont(p.fontFamily);
  }, [
    profile?.id,
    profile?.identity_card_palette,
    profile?.identity_card_template,
    profile?.identity_card_font,
    profile?.portfolio_theme,
  ]);

  const projectCount = useMemo(() => {
    const fromUpdates = updates?.filter((u) => u.type === "project").length ?? 0;
    return (projects?.length ?? 0) + fromUpdates;
  }, [projects?.length, updates]);

  const stats = useMemo(
    () => ({
      views: analytics?.views ?? 0,
      projects: projectCount,
    }),
    [analytics?.views, projectCount]
  );

  const cardVisualProps = useMemo(
    () => ({
      themeColor: selectedPalette.color,
      borderColor: selectedPalette.border,
      accent: selectedPalette.accent,
      fontFamily: selectedFont,
      templateId: selectedTemplate,
    }),
    [selectedPalette, selectedFont, selectedTemplate]
  );

  const handleSave = async () => {
    try {
      await updateProfile({
        identity_card_palette: selectedPalette.id,
        identity_card_template: selectedTemplate,
        identity_card_font: selectedFont,
      });
      if (Platform.OS !== "web") {
        await notificationAsync(NotificationFeedbackType.Success);
      }
      Alert.alert("Success", "Identity design saved!");
    } catch (e) {
      Alert.alert("Error", "Failed to save design");
    }
  };

  const runCaptureAndShare = useCallback(async () => {
    if (!viewShotRef.current) {
      throw new Error("Sharing engine not ready. Please try again.");
    }
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const uri = await viewShotRef.current.capture();
    if (!uri) throw new Error("Could not capture image.");
    await Sharing.shareAsync(uri, {
      mimeType: "image/jpeg",
      dialogTitle: "Share your BEXO Identity",
    });
  }, []);

  const handleShare = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Notice", "Sharing is only available on mobile devices.");
      return;
    }

    try {
      setIsSharing(true);
      await impactAsync(ImpactFeedbackStyle.Heavy);
      await runCaptureAndShare();
    } catch (err: any) {
      console.error("Share error:", err);
      Alert.alert("Share Failed", err?.message || "Failed to generate shareable image.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Customize Identity</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          Card look is separate from your published site theme. Changes here only affect your digital card and
          share image.
        </Text>

        <View style={styles.previewSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Live Preview</Text>
          <IdentityCard
            profile={profile}
            stats={stats}
            {...cardVisualProps}
          />
          <Text style={styles.previewHint}>Tap card to see the back side</Text>
        </View>

        <View style={styles.optionsSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Layout template</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesRow}>
            {CARD_TEMPLATES.map((t) => {
              const active = selectedTemplate === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    setSelectedTemplate(t.id);
                    if (Platform.OS !== "web") impactAsync(ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.templateCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    active && { borderColor: colors.primary, backgroundColor: colors.primary + "14" },
                  ]}
                >
                  <Text style={[styles.templateTitle, { color: colors.foreground }]}>{t.label}</Text>
                  <Text style={[styles.templateDesc, { color: colors.mutedForeground }]}>{t.description}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 22 }]}>Color palette</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themesRow}>
            {CARD_PALETTES.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  setSelectedPalette(t);
                  if (Platform.OS !== "web") impactAsync(ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.themeCircle,
                  { backgroundColor: t.color, borderColor: t.border },
                  selectedPalette.id === t.id && { borderWidth: 3, borderColor: colors.primary },
                ]}
              >
                {selectedPalette.id === t.id && <Feather name="check" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 22 }]}>Typography</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontsRow}>
            {CARD_TYPEFACES.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => {
                  setSelectedFont(f.fontFamily);
                  if (Platform.OS !== "web") impactAsync(ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.fontPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedFont === f.fontFamily && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + "11",
                  },
                ]}
              >
                <Text style={[styles.fontLabel, { color: colors.foreground, fontFamily: f.fontFamily }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.foreground, opacity: isSharing ? 0.55 : 1 }]}
          onPress={handleShare}
          disabled={isSharing}
          activeOpacity={0.9}
        >
          <Feather name="share-2" size={18} color={colors.background} />
          <Text style={[styles.shareBtnText, { color: colors.background }]}>
            {isSharing ? "Preparing…" : "Share Identity Image"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Off-screen poster: front + back in one capture */}
      <View style={styles.hiddenContainer} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: "jpg", quality: 0.92 }}
          style={{ width: SHARE_WIDTH }}
        >
          <LinearGradient colors={["#050810", "#0a1220"]} style={styles.sharePoster}>
            <View style={styles.sharePosterHeader}>
              <BexoLogo color="#fff" size={18} accentX={selectedPalette.accent} />
              <Text style={styles.sharePosterKicker}>Your digital identity</Text>
            </View>

            <Text style={styles.sideLabel}>Front</Text>
            <IdentityCard
              profile={profile}
              stats={stats}
              {...cardVisualProps}
              forceSide="front"
              noOuterMargins
            />

            <Text style={[styles.sideLabel, { marginTop: 6 }]}>Back</Text>
            <IdentityCard
              profile={profile}
              stats={stats}
              {...cardVisualProps}
              forceSide="back"
              noOuterMargins
            />

            <View style={styles.sharePosterFooter}>
              <Text style={styles.shareLink}>
                Visit: {portfolioUrl || `${profile?.handle ?? "you"}.mybexo.com`}
              </Text>
              <Text style={styles.shareCTA}>Built with BEXO</Text>
            </View>
          </LinearGradient>
        </ViewShot>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  saveBtn: {
    paddingHorizontal: 10,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  previewSection: {
    alignItems: "center",
    marginBottom: 36,
    minHeight: 300,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  previewHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 10,
    fontWeight: "600",
  },
  optionsSection: {
    marginBottom: 36,
  },
  templatesRow: {
    gap: 12,
    paddingRight: 20,
  },
  templateCard: {
    width: 140,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  templateTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  themesRow: {
    gap: 15,
    paddingRight: 20,
  },
  themeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fontsRow: {
    gap: 12,
    paddingRight: 20,
  },
  fontPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
  },
  fontLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    borderRadius: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: "800",
  },
  hiddenContainer: {
    position: "absolute",
    top: -8000,
    left: 0,
    width: SHARE_WIDTH,
  },
  sharePoster: {
    width: SHARE_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  sharePosterHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  sharePosterKicker: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sideLabel: {
    alignSelf: "flex-start",
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sharePosterFooter: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  shareLink: {
    color: "#00C2FF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  shareCTA: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "700",
  },
});
