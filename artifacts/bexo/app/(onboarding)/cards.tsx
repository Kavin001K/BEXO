import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { BexoButton } from "@/components/ui/BexoButton";
import { FormField } from "@/components/ui/FormField";
import { LocationInput } from "@/components/ui/LocationInput";
import { SkillTag } from "@/components/ui/SkillTag";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/stores/useProfileStore";

const SUGGESTED_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Machine Learning",
  "Swift",
  "Flutter",
  "UI/UX Design",
  "SQL",
  "AWS",
  "Docker",
  "Git",
  "Figma",
  "Next.js",
];

type CardId = "headline" | "bio" | "skills" | "location";
const CARDS: { id: CardId; title: string; subtitle: string }[] = [
  { id: "headline", title: "Your headline", subtitle: "A one-liner that defines you" },
  { id: "bio", title: "Your bio", subtitle: "Tell the world who you are" },
  { id: "skills", title: "Your skills", subtitle: "What tools do you master?" },
  { id: "location", title: "Your location", subtitle: "Where are you based?" },
];

export default function CardsScreen() {
  const colors = useColors();
  const { profile, parsedResumeData, skills: parsedSkills, updateProfile, setOnboardingStep } =
    useProfileStore();

  const [headline, setHeadline] = useState(parsedResumeData?.headline ?? profile?.headline ?? "");
  const [bio, setBio] = useState(parsedResumeData?.bio ?? profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    parsedSkills.map((s) => s.name).filter(Boolean),
  );
  const [customSkill, setCustomSkill] = useState("");
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const needsData = (id: CardId): boolean => {
    switch (id) {
      case "headline":
        return !headline.trim();
      case "bio":
        return !bio.trim();
      case "skills":
        return parsedSkills.length === 0 && selectedSkills.length === 0;
      case "location":
        return !location.trim();
      default:
        return true;
    }
  };

  const findFirstMissing = () => CARDS.findIndex((c) => needsData(c.id));

  const initialIdx = findFirstMissing();
  const [cardIdx, setCardIdx] = useState(initialIdx === -1 ? 0 : initialIdx);

  useEffect(() => {
    if (initialIdx === -1) {
      handleFinish();
    }
  }, []);

  const current = CARDS[cardIdx];

  const goNext = async () => {
    void tapLight();
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -40, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();

    let nextIdx = -1;
    for (let i = cardIdx + 1; i < CARDS.length; i++) {
      if (needsData(CARDS[i].id)) {
        nextIdx = i;
        break;
      }
    }

    if (nextIdx >= 0) {
      setCardIdx(nextIdx);
    } else {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateProfile({ headline, bio, location: location.trim() || undefined });
      const { profile: latestProfile } = useProfileStore.getState();
      const profileId = latestProfile?.id;
      if (!profileId) {
        console.warn("Cannot save skills — profile ID not available yet");
      } else if (selectedSkills.length > 0) {
        const skillRows = selectedSkills.map((name) => ({
          profile_id: profileId,
          name,
          category: "General",
          level: "intermediate" as const,
        }));
        await supabase.from("skills").upsert(skillRows, { onConflict: "profile_id,name" });
      }
      setOnboardingStep("theme");
      router.push("/(onboarding)/theme");
    } catch {
      // non-critical
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (s && !selectedSkills.includes(s)) {
      setSelectedSkills((prev) => [...prev, s]);
    }
    setCustomSkill("");
  };

  const isLast = (() => {
    for (let i = cardIdx + 1; i < CARDS.length; i++) {
      if (needsData(CARDS[i].id)) return false;
    }
    return true;
  })();

  const canContinue =
    current.id === "headline"
      ? !!headline.trim()
      : current.id === "bio"
        ? !!bio.trim()
        : current.id === "location"
          ? !!location.trim()
          : selectedSkills.length > 0;

  return (
    <OnboardingShell
      stepKey="cards"
      title={current.title}
      subtitle={current.subtitle}
      showBack={cardIdx > 0}
      onBack={cardIdx > 0 ? () => setCardIdx(cardIdx - 1) : undefined}
      footer={
        <>
          <BexoButton
            label={isLast ? (saving ? "Saving..." : "Build my portfolio") : "Continue"}
            onPress={goNext}
            loading={saving}
            disabled={!canContinue}
            icon={isLast ? <Feather name="zap" size={16} color={colors.primaryForeground} /> : undefined}
          />
          {cardIdx > 0 && (
            <BexoButton label="Back" onPress={() => setCardIdx(cardIdx - 1)} variant="ghost" disabled={saving} />
          )}
        </>
      }
    >
      <View style={styles.stepRow}>
        {CARDS.map((c, i) => (
          <View
            key={c.id}
            style={[
              styles.dot,
              {
                backgroundColor: i <= cardIdx ? colors.primary : colors.border,
                opacity: i < cardIdx ? 0.45 : 1,
                width: i === cardIdx ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      {current.id === "headline" && (
        <FormField
          label="Headline"
          placeholder='e.g. "CS Student · Full-Stack Developer"'
          value={headline}
          onChangeText={setHeadline}
          maxLength={25}
          autoFocus
        />
      )}

      {current.id === "bio" && (
        <FormField
          label="Bio"
          placeholder="Tell your story — what drives you, what you're building..."
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={400}
          style={styles.textarea}
          autoFocus
        />
      )}

      {current.id === "skills" && (
        <View style={styles.skillsSection}>
          {selectedSkills.length > 0 && (
            <View style={styles.tagRow}>
              {selectedSkills.map((s) => (
                <SkillTag key={s} label={s} selected onPress={() => toggleSkill(s)} />
              ))}
            </View>
          )}
          <Text style={[styles.suggestLabel, { color: colors.mutedForeground }]}>Suggested</Text>
          <View style={styles.tagRow}>
            {SUGGESTED_SKILLS.filter((s) => !selectedSkills.includes(s)).map((s) => (
              <SkillTag key={s} label={s} onPress={() => toggleSkill(s)} />
            ))}
          </View>
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
              <Feather name="plus" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {current.id === "location" && (
        <View style={styles.locationBlock}>
          <Text style={[styles.locationLabel, { color: colors.foreground }]}>Location</Text>
          <LocationInput
            value={location}
            onChangeText={setLocation}
            placeholder="Search your city..."
            autoFocus
          />
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  dot: { height: 8, borderRadius: 4 },
  textarea: { minHeight: 140, textAlignVertical: "top" },
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
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  locationBlock: { gap: 8 },
  locationLabel: { fontSize: 14, fontWeight: "600" },
});
