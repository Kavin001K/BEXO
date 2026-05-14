import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkillTag } from "@/components/ui/SkillTag";
import { useColors } from "@/hooks/useColors";
import { useProfileStore } from "@/stores/useProfileStore";

const TERMS_URL = "https://mybexo.com/terms";
const PRIVACY_URL = "https://mybexo.com/privacy";

const SECTION_META = [
  { label: "About", sub: "Headline & bio", icon: "user" as const, color: "#FA6AB8" },
  { label: "Education", sub: "Schools & degrees", icon: "book-open" as const, color: "#8B7CF8" },
  { label: "Experience", sub: "Roles & impact", icon: "briefcase" as const, color: "#FABD6A" },
  { label: "Projects", sub: "Things you shipped", icon: "code" as const, color: "#6AFAD0" },
  { label: "Skills", sub: "Stack & tools", icon: "zap" as const, color: "#6AB8FA" },
  { label: "Research", sub: "Publications & papers", icon: "search" as const, color: "#FAD06A" },
  { label: "Contact", sub: "Email & presence", icon: "mail" as const, color: "#6AFA6A" },
];

function yearFromIso(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "";
  const y = iso.split("-")[0];
  return /^\d{4}$/.test(y) ? y : "";
}

function parseStep(raw: string | undefined, max: number): number {
  const n = parseInt(String(raw ?? "0"), 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

export default function ManualReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ step?: string }>();

  const profile = useProfileStore((s) => s.profile);
  const education = useProfileStore((s) => s.education);
  const experiences = useProfileStore((s) => s.experiences);
  const projects = useProfileStore((s) => s.projects);
  const skills = useProfileStore((s) => s.skills);
  const research = useProfileStore((s) => s.research);
  const persistedReviewStep = useProfileStore((s) => s.manualReviewStepIndex ?? 0);
  const { updateProfile, setOnboardingStep, setManualReviewStepIndex } = useProfileStore();

  const termsIndex = SECTION_META.length;
  const lastIndex = termsIndex;

  const [step, setStep] = useState(0);

  const applyStep = useCallback(
    (next: number) => {
      const p = Math.max(0, Math.min(lastIndex, next));
      setStep(p);
      setManualReviewStepIndex(p);
    },
    [lastIndex, setManualReviewStepIndex],
  );

  // Deep link (e.g. from full manual) wins over persisted index.
  useEffect(() => {
    const raw = params.step;
    if (raw === undefined || String(raw).trim() === "") return;
    const p = parseStep(Array.isArray(raw) ? raw[0] : raw, lastIndex);
    setStep(p);
    setManualReviewStepIndex(p);
  }, [params.step, lastIndex, setManualReviewStepIndex]);

  // Cold restart: restore last summary step from persisted store when no URL step.
  useEffect(() => {
    const raw = params.step;
    if (raw !== undefined && String(raw).trim() !== "") return;
    const saved = Number(persistedReviewStep);
    const p = Math.max(0, Math.min(lastIndex, Number.isFinite(saved) ? saved : 0));
    setStep(p);
    if (p !== persistedReviewStep) setManualReviewStepIndex(p);
  }, [persistedReviewStep, params.step, lastIndex, setManualReviewStepIndex]);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const haptic = useCallback((style: "light" | "medium" = "light") => {
    if (Platform.OS === "web") return;
    if (style === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const openFullEditor = useCallback(
    (sectionIdx: number) => {
      haptic("medium");
      setManualReviewStepIndex(sectionIdx);
      setOnboardingStep("manual");
      router.push({
        pathname: "/(onboarding)/manual",
        params: {
          focusSection: String(sectionIdx),
          returnTo: "manual-review",
          resumeStep: String(sectionIdx),
        },
      });
    },
    [haptic, setManualReviewStepIndex, setOnboardingStep],
  );

  const goBack = () => {
    haptic();
    if (step > 0) applyStep(step - 1);
    else router.replace("/(onboarding)/resume");
  };

  const goNext = () => {
    haptic();
    if (step < termsIndex) applyStep(step + 1);
  };

  const onFinishToTheme = async () => {
    if (!termsAccepted || !profile?.id || finishing) return;
    setFinishing(true);
    try {
      await updateProfile({ consent_accepted_at: new Date().toISOString() });
      setManualReviewStepIndex(0);
      setOnboardingStep("theme");
      router.replace("/(onboarding)/theme");
    } catch (e) {
      console.error("[ManualReview] finish:", e);
    } finally {
      setFinishing(false);
    }
  };

  const meta = step < termsIndex ? SECTION_META[step] : null;
  const accentColor = meta?.color ?? colors.primary;
  const topPad = insets.top + (Platform.OS === "web" ? 56 : 8);
  const botPad = insets.bottom + (Platform.OS === "web" ? 28 : 16);

  const progress = useMemo(() => (step + 1) / (lastIndex + 1), [step, lastIndex]);

  const renderSummary = () => {
    if (!profile) {
      return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Profile loading…</Text>
        </View>
      );
    }

    switch (step) {
      case 0:
        return (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Headline</Text>
            <Text style={[styles.previewHeadline, { color: colors.foreground }]}>
              {profile.headline?.trim() || "—"}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Bio</Text>
            <Text style={[styles.previewBody, { color: colors.secondaryForeground }]}>
              {profile.bio?.trim() || "—"}
            </Text>
          </View>
        );
      case 1:
        if (education.length === 0) {
          return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No education imported</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Add schools in the full editor, or continue if you will add them later.
              </Text>
            </View>
          );
        }
        return (
          <View style={{ gap: 12 }}>
            {education.map((e, i) => (
              <View
                key={e.id ?? i}
                style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{e.institution}</Text>
                <Text style={[styles.itemSub, { color: colors.primary }]}>
                  {e.degree}
                  {e.field ? ` · ${e.field}` : ""}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  {e.start_year}
                  {e.end_year ? ` – ${e.end_year}` : ""}
                </Text>
              </View>
            ))}
          </View>
        );
      case 2:
        if (experiences.length === 0) {
          return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No roles imported</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                You can add experience from the full editor anytime.
              </Text>
            </View>
          );
        }
        return (
          <View style={{ gap: 12 }}>
            {experiences.map((x, i) => (
              <View
                key={x.id ?? i}
                style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{x.role}</Text>
                <Text style={[styles.itemSub, { color: colors.primary }]}>{x.company}</Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  {yearFromIso(x.start_date) || "—"}
                  {x.is_current ? " – Present" : x.end_date ? ` – ${yearFromIso(x.end_date)}` : ""}
                </Text>
                {x.description ? (
                  <Text style={[styles.itemDesc, { color: colors.secondaryForeground }]} numberOfLines={4}>
                    {x.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      case 3:
        if (projects.length === 0) {
          return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No projects imported</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Showcase work in the full editor when you are ready.
              </Text>
            </View>
          );
        }
        return (
          <View style={{ gap: 12 }}>
            {projects.map((p, i) => (
              <View
                key={p.id ?? i}
                style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{p.title}</Text>
                {p.description ? (
                  <Text style={[styles.itemDesc, { color: colors.secondaryForeground }]} numberOfLines={5}>
                    {p.description}
                  </Text>
                ) : null}
                {p.tech_stack?.length ? (
                  <View style={styles.tagRow}>
                    {p.tech_stack.slice(0, 8).map((t) => (
                      <SkillTag key={t} label={t} size="sm" />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        );
      case 4:
        if (skills.length === 0) {
          return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No skills imported</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Add skills from the full editor to strengthen your profile.
              </Text>
            </View>
          );
        }
        return (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.tagRow}>
              {skills.map((s, i) => (
                <SkillTag key={s.id ?? `${s.name}-${i}`} label={s.name} />
              ))}
            </View>
          </View>
        );
      case 5:
        if (research.length === 0) {
          return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No research entries</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Optional section — add papers or talks in the full editor if relevant.
              </Text>
            </View>
          );
        }
        return (
          <View style={{ gap: 12 }}>
            {research.map((r, i) => (
              <View
                key={r.id ?? i}
                style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{r.title}</Text>
                {r.subtitle ? (
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{r.subtitle}</Text>
                ) : null}
                {r.description ? (
                  <Text style={[styles.itemDesc, { color: colors.secondaryForeground }]} numberOfLines={4}>
                    {r.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      case 6:
        return (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Email</Text>
            <Text style={[styles.previewBody, { color: colors.foreground }]}>
              {profile.email?.trim() || "—"}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Phone</Text>
            <Text style={[styles.previewBody, { color: colors.foreground }]}>
              {profile.phone?.trim() || "—"}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Address</Text>
            <Text style={[styles.previewBody, { color: colors.foreground }]}>
              {profile.address?.trim() || "—"}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderTerms = () => (
    <Animated.View entering={FadeInDown.delay(60).springify()} style={{ gap: 16 }}>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.termsLead, { color: colors.secondaryForeground }]}>
          Almost there. Confirm you have read our policies before we move on to themes and your live site.
        </Text>
      </View>

      <View style={[styles.legalLinksRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={[styles.legalLink, { color: colors.primary }]}>Terms & Conditions</Text>
        </TouchableOpacity>
        <Text style={[styles.legalDot, { color: colors.mutedForeground }]}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={[styles.legalLink, { color: colors.primary }]}>Privacy Notice</Text>
        </TouchableOpacity>
      </View>

      <Pressable
        onPress={() => {
          haptic();
          setTermsAccepted((v) => !v);
        }}
        style={({ pressed }) => [
          styles.consentRow,
          {
            borderColor: termsAccepted ? colors.primary + "66" : colors.border,
            backgroundColor: pressed ? colors.surface : colors.card,
          },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: termsAccepted ? colors.primary : colors.border,
              backgroundColor: termsAccepted ? colors.primary : "transparent",
            },
          ]}
        >
          {termsAccepted ? <Feather name="check" size={14} color="#fff" /> : null}
        </View>
        <Text style={[styles.consentText, { color: colors.foreground }]}>
          I have read and agree to the{" "}
          <Text style={{ color: colors.primary, fontWeight: "700" }} onPress={() => Linking.openURL(TERMS_URL)}>
            Terms & Conditions
          </Text>{" "}
          and{" "}
          <Text style={{ color: colors.primary, fontWeight: "700" }} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Privacy Notice
          </Text>
          , and I understand how BEXO uses my profile data to generate my public portfolio.
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[SECTION_META[Math.min(step, SECTION_META.length - 1)].color + "22", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 0.45 }}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: botPad + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(420)}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={goBack} style={[styles.iconBtn, { borderColor: colors.border }]} hitSlop={12}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.stepPill, { color: colors.mutedForeground, borderColor: colors.border }]}>
              {step < termsIndex ? `Summary ${step + 1} / ${SECTION_META.length}` : "Terms"}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>

          {step <= termsIndex - 1 && meta ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: meta.color + "22" }]}>
                <Feather name={meta.icon} size={22} color={meta.color} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>{meta.label}</Text>
              <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>{meta.sub}</Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="shield" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>Terms & privacy</Text>
              <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
                One quick confirmation before themes.
              </Text>
            </Animated.View>
          )}

          {step < termsIndex ? (
            <>
              {renderSummary()}
              <TouchableOpacity
                onPress={() => openFullEditor(step)}
                style={[styles.secondaryBtn, { borderColor: colors.primary + "44", backgroundColor: colors.primary + "10" }]}
                activeOpacity={0.85}
              >
                <Feather name="edit-3" size={16} color={colors.primary} />
                <Text style={[styles.secondaryBtnTxt, { color: colors.primary }]}>Add or edit in full form</Text>
              </TouchableOpacity>
            </>
          ) : (
            renderTerms()
          )}
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: botPad,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        {step < termsIndex ? (
          <TouchableOpacity onPress={goNext} activeOpacity={0.9} style={styles.primaryWrap}>
            <LinearGradient
              colors={[accentColor, accentColor + "AA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryTxt}>Next summary</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onFinishToTheme}
            disabled={!termsAccepted || finishing}
            activeOpacity={0.9}
            style={[styles.primaryWrap, (!termsAccepted || finishing) && { opacity: 0.38 }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + "AA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              {finishing ? <ActivityIndicator color="#fff" /> : null}
              <Text style={styles.primaryTxt}>Continue to theme</Text>
              {!finishing ? <Feather name="arrow-right" size={18} color="#fff" /> : null}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, gap: 18 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPill: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 22,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  hero: { marginBottom: 8, gap: 6 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  heroSub: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  previewLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  previewHeadline: { fontSize: 18, fontWeight: "700", lineHeight: 26 },
  previewBody: { fontSize: 15, lineHeight: 23 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  itemTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  itemSub: { fontSize: 14, fontWeight: "600" },
  itemMeta: { fontSize: 13, fontWeight: "500" },
  itemDesc: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptySub: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  secondaryBtnTxt: { fontSize: 15, fontWeight: "700" },
  termsLead: { fontSize: 15, lineHeight: 23 },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  legalLink: { fontSize: 14, fontWeight: "800" },
  legalDot: { fontSize: 16, fontWeight: "700" },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  consentText: { flex: 1, fontSize: 14, lineHeight: 22 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryWrap: { borderRadius: 16, overflow: "hidden" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  primaryTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
