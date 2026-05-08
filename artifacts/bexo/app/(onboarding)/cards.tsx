import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
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
import { SkillTag } from "@/components/ui/SkillTag";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/stores/useProfileStore";

const SUGGESTED_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python",
  "Machine Learning", "Swift", "Flutter", "UI/UX Design",
  "SQL", "AWS", "Docker", "Git", "Figma", "Next.js"
];

type CardId = "headline" | "bio" | "skills";
const CARDS: { id: CardId; title: string; subtitle: string }[] = [
  { id: "headline", title: "Your headline", subtitle: "A one-liner that defines you" },
  { id: "bio", title: "Your bio", subtitle: "Tell the world who you are" },
  { id: "skills", title: "Your skills", subtitle: "What tools do you master?" },
];

export default function CardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, parsedResumeData, skills: parsedSkills, setSkills, updateProfile, setOnboardingStep } = useProfileStore();

  const [cardIdx, setCardIdx] = useState(0);
  const [headline, setHeadline] = useState(parsedResumeData?.headline ?? profile?.headline ?? "");
  const [bio, setBio] = useState(parsedResumeData?.bio ?? profile?.bio ?? "");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    parsedSkills.map((s) => s.name).filter(Boolean)
  );
  const [customSkill, setCustomSkill] = useState("");
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const current = CARDS[cardIdx];

  const goNext = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -40, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();

    if (cardIdx < CARDS.length - 1) {
      setCardIdx(cardIdx + 1);
    } else {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateProfile({ headline, bio });
      const profileId = profile?.id;
      if (profileId && selectedSkills.length > 0) {
        const skillRows = selectedSkills.map((name) => ({
          profile_id: profileId,
          name,
          category: "General",
          level: "intermediate" as const,
        }));
        await supabase.from("skills").upsert(skillRows, { onConflict: "profile_id,name" });
      }
      setOnboardingStep("generating");
      router.push("/(onboarding)/generating");
    } catch {
      // non-critical
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (s && !selectedSkills.includes(s)) {
      setSelectedSkills((prev) => [...prev, s]);
    }
    setCustomSkill("");
  };

  const isLast = cardIdx === CARDS.length - 1;
  const canContinue =
    current.id === "headline"
      ? !!headline.trim()
      : current.id === "bio"
      ? !!bio.trim()
      : selectedSkills.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#7C6AFA18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepRow}>
          {CARDS.map((c, i) => (
            <View
              key={c.id}
              style={[styles.dot, { backgroundColor: i <= cardIdx ? colors.primary : colors.border }]}
            />
          ))}
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>

        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            {current.title}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {current.subtitle}
          </Text>
        </Animated.View>

        {current.id === "headline" && (
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder='e.g. "CS Student · Full-Stack Developer"'
            placeholderTextColor={colors.mutedForeground}
            value={headline}
            onChangeText={setHeadline}
            maxLength={100}
            selectionColor={colors.primary}
            autoFocus
          />
        )}

        {current.id === "bio" && (
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="Tell your story — what drives you, what you're building, where you're headed..."
            placeholderTextColor={colors.mutedForeground}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={400}
            textAlignVertical="top"
            selectionColor={colors.primary}
            autoFocus
          />
        )}

        {current.id === "skills" && (
          <View style={styles.skillsSection}>
            {/* Selected skills */}
            {selectedSkills.length > 0 && (
              <View style={styles.tagRow}>
                {selectedSkills.map((s) => (
                  <SkillTag key={s} label={s} selected onPress={() => toggleSkill(s)} />
                ))}
              </View>
            )}
            {/* Suggestions */}
            <Text style={[styles.suggestLabel, { color: colors.mutedForeground }]}>
              Suggested
            </Text>
            <View style={styles.tagRow}>
              {SUGGESTED_SKILLS.filter((s) => !selectedSkills.includes(s)).map((s) => (
                <SkillTag key={s} label={s} onPress={() => toggleSkill(s)} />
              ))}
            </View>
            {/* Custom */}
            <View style={styles.customRow}>
              <TextInput
                style={[
                  styles.customInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Add custom skill..."
                placeholderTextColor={colors.mutedForeground}
                value={customSkill}
                onChangeText={setCustomSkill}
                onSubmitEditing={addCustomSkill}
                returnKeyType="done"
                selectionColor={colors.primary}
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={addCustomSkill}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <BexoButton
          label={isLast ? (saving ? "Saving..." : "Build My Portfolio") : "Continue"}
          onPress={goNext}
          loading={saving}
          disabled={!canContinue}
          icon={isLast ? <Feather name="zap" size={16} color="#fff" /> : undefined}
        />

        {cardIdx > 0 && (
          <BexoButton
            label="Back"
            onPress={() => setCardIdx(cardIdx - 1)}
            variant="ghost"
            disabled={saving}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingHorizontal: 28, gap: 18 },
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  dot: { width: 20, height: 4, borderRadius: 2 },
  headline: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  sub: { fontSize: 14, lineHeight: 21 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  textarea: { minHeight: 140 },
  skillsSection: { gap: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  customRow: { flexDirection: "row", gap: 10 },
  customInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
