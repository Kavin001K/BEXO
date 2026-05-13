import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Animated as RNAnimated } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  runOnJS
} from "react-native-reanimated";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { YearPickerSheet } from "@/components/YearPickerSheet";
import { MonthPickerSheet } from "@/components/MonthPickerSheet";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore, Education, Experience, Project, Research } from "@/stores/useProfileStore";
import { apiFetch } from "@/lib/apiConfig";

const { width: W, height: SCREEN_H } = Dimensions.get("window");

// ─── Section config ───────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 0, label: "About",      icon: "user"       as const,  color: "#FA6AB8" },
  { id: 1, label: "Education",  icon: "book-open" as const,  color: "#8B7CF8" },
  { id: 2, label: "Experience", icon: "briefcase"  as const,  color: "#FABD6A" },
  { id: 3, label: "Projects",   icon: "code"       as const,  color: "#6AFAD0" },
  { id: 4, label: "Skills",     icon: "zap"        as const,  color: "#6AB8FA" },
  { id: 5, label: "Research",   icon: "search"     as const,  color: "#FAD06A" },
  { id: 6, label: "Contact",    icon: "mail"       as const,  color: "#6AFA6A" },
];

// Steps per section (About: 3, Edu: 5, Exp: 5, Proj: 5, Skills: 1, Research: 4, Contact: 2)
const STEPS = [3, 5, 5, 5, 1, 4, 2];

const DEGREES = ["Bachelor's", "Master's", "MBA", "PhD", "Associate's", "Diploma", "High School", "Bootcamp", "Certificate", "Other"];
const MONTHS  = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CY      = new Date().getFullYear();
const YEARS   = Array.from({ length: CY - 1984 + 6 }, (_, i) => String(CY + 5 - i));

const SKILL_MAP: Record<string, string[]> = {
  Frontend:  ["React", "Vue.js", "Angular", "Next.js", "TypeScript", "JavaScript", "Tailwind", "HTML/CSS", "Redux", "Svelte"],
  Backend:   ["Node.js", "Python", "Django", "FastAPI", "Express.js", "Go", "Rust", "Java", "Spring Boot", "PHP"],
  Mobile:    ["React Native", "Flutter", "Swift", "Kotlin", "Expo", "iOS Dev", "Android Dev"],
  Database:  ["PostgreSQL", "MongoDB", "MySQL", "Redis", "Supabase", "Firebase", "SQLite", "Prisma"],
  DevOps:    ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Terraform", "Linux", "Nginx"],
  Design:    ["Figma", "Adobe XD", "UI/UX Design", "Illustrator", "Photoshop", "Sketch", "Framer"],
  "AI / ML": ["Machine Learning", "TensorFlow", "PyTorch", "OpenAI API", "LangChain", "Pandas", "NumPy"],
  Tools:     ["Git", "GitHub", "Jira", "Notion", "Postman", "VS Code", "Vite", "Webpack"],
};

const COMMON_TECH = [
  "React", "TypeScript", "Node.js", "Python", "PostgreSQL", "Docker", "AWS",
  "Next.js", "MongoDB", "React Native", "Flutter", "Figma", "Firebase", "Go",
  "Redis", "GraphQL", "Prisma", "Tailwind", "Supabase", "OpenAI API",
];

// ─── Types ────────────────────────────────────────────────────────────────────
type EduEntry  = { institution: string; degree: string; field: string; start_year: string; end_year: string; description: string };
type ExpEntry  = { company: string; role: string; start_month: string; start_year: string; end_month: string; end_year: string; is_current: boolean; description: string };
type ProjEntry = { id?: string; title: string; description: string; tech_stack: string[]; live_url: string; github_url: string; image_url: string };
type ResEntry  = { title: string; subtitle: string; description: string; image_url: string };
type ContactEntry = { phone: string; email: string; address: string };

const newEdu  = (): EduEntry  => ({ institution: "", degree: "", field: "", start_year: "", end_year: "", description: "" });
const newExp  = (): ExpEntry  => ({ company: "", role: "", start_month: "", start_year: "", end_month: "", end_year: "", is_current: false, description: "" });
const newProj = (): ProjEntry => ({ title: "", description: "", tech_stack: [], live_url: "", github_url: "", image_url: "" });
const newRes  = (): ResEntry  => ({ title: "", subtitle: "", description: "", image_url: "" });
const newContact = (): ContactEntry => ({ phone: "", email: "", address: "" });

function SegmentedProgress({ sectionIdx, stepIdx, totalSteps }: { sectionIdx: number; stepIdx: number; totalSteps: number }) {
  const sec = SECTIONS[sectionIdx];
  const fill = Math.min((stepIdx + 1) / Math.max(totalSteps, 1), 1);
  
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontSize: 10, fontWeight: "900", color: sec.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: -2 }}>
        {sec.label}
      </Text>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <RNAnimated.View style={{ width: `${fill * 100}%` as any, height: 4, borderRadius: 2, backgroundColor: sec.color }} />
      </View>
    </View>
  );
}

// ─── QuestionHeader ───────────────────────────────────────────────────────────
function QuestionHeader({ section, title, sub }: { section: typeof SECTIONS[number]; title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={[QS.badge, { backgroundColor: section.color + "18", borderColor: section.color + "40" }]}>
        <Feather name={section.icon} size={11} color={section.color} />
        <Text style={[QS.badgeTxt, { color: section.color }]}>{section.label}</Text>
      </View>
      <Text style={QS.title}>{title}</Text>
      {sub ? <Text style={QS.sub}>{sub}</Text> : null}
    </View>
  );
}
const QS = StyleSheet.create({
  badge:    { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, gap: 5, marginBottom: 14 },
  badgeTxt: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7 },
  title:    { fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: -0.4, lineHeight: 38, marginBottom: 6 },
  sub:      { fontSize: 14, color: "rgba(255,255,255,0.42)", lineHeight: 20 },
});

// ─── GlassInput ───────────────────────────────────────────────────────────────
function GlassInput({
  value, onChangeText, placeholder, multiline, accentColor, autoFocus, keyboardType, returnKeyType, onSubmitEditing, autoCapitalize,
}: {
  value: string; onChangeText: (v: string) => void; placeholder: string;
  multiline?: boolean; accentColor: string; autoFocus?: boolean;
  keyboardType?: any; returnKeyType?: any; onSubmitEditing?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Handle auto-focus with a slight delay to ensure animations are finished
  React.useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350); // Slightly more than the transition duration
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const iosFocusStyle = Platform.OS === "ios" && focused
    ? { shadowColor: accentColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 14 }
    : {};
  const webFocusStyle = Platform.OS === "web" && focused
    ? ({ boxShadow: `0 0 20px ${accentColor}44` } as any)
    : {};

  return (
    <TouchableOpacity 
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={[GI.wrap, { borderColor: focused ? accentColor + "99" : "rgba(255,255,255,0.1)" }, iosFocusStyle, webFocusStyle]}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.22)"
        style={[GI.input, multiline && { height: 96, textAlignVertical: "top", paddingTop: 4 }]}
        multiline={multiline}
        // We handle autoFocus manually via useEffect above for better transition support
        keyboardType={keyboardType}
        returnKeyType={returnKeyType ?? "done"}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </TouchableOpacity>
  );
}
const GI = StyleSheet.create({
  wrap:  { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, paddingVertical: Platform.OS === "web" ? 14 : 16 },
  input: { fontSize: 18, color: "#fff", fontWeight: "500", padding: 0 },
});

// ─── ChipRow ──────────────────────────────────────────────────────────────────
function ChipRow({ options, value, onChange, accentColor }: { options: string[]; value: string; onChange: (v: string) => void; accentColor: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {options.map((opt) => {
        const sel = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => { onChange(opt); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
            style={[CR.chip, sel ? { backgroundColor: accentColor, borderColor: accentColor } : { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.14)" }]}
          >
            <Text style={[CR.label, { color: sel ? "#fff" : "rgba(255,255,255,0.7)" }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const CR = StyleSheet.create({
  chip:  { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  label: { fontSize: 14, fontWeight: "600" },
});

// YearPickerModal removed in favor of YearPickerSheet


// ─── MonthGrid ────────────────────────────────────────────────────────────────
function MonthGrid({ value, onChange, accentColor }: { value: string; onChange: (v: string) => void; accentColor: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {MONTHS.map((m) => {
        const sel = m === value;
        return (
          <TouchableOpacity
            key={m}
            onPress={() => { onChange(m); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
            style={[MG.chip, sel ? { backgroundColor: accentColor, borderColor: accentColor } : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }]}
          >
            <Text style={[MG.txt, { color: sel ? "#fff" : "rgba(255,255,255,0.65)" }]}>{m}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const MG = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  txt:  { fontSize: 13, fontWeight: "600" },
});

// ─── TechTagGrid ──────────────────────────────────────────────────────────────
function TechTagGrid({ selected, onChange, accentColor }: { selected: string[]; onChange: (v: string[]) => void; accentColor: string }) {
  const toggle = (t: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);
  };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {COMMON_TECH.map((t) => {
        const sel = selected.includes(t);
        return (
          <TouchableOpacity
            key={t}
            onPress={() => toggle(t)}
            style={[TT.chip, sel ? { backgroundColor: accentColor + "28", borderColor: accentColor } : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }]}
          >
            <Text style={[TT.txt, { color: sel ? accentColor : "rgba(255,255,255,0.6)" }]}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const TT = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  txt:  { fontSize: 13, fontWeight: "600" },
});

// ─── SkillCategoryGrid ────────────────────────────────────────────────────────
function SkillCategoryGrid({ selected, onChange, accentColor }: { selected: string[]; onChange: (v: string[]) => void; accentColor: string }) {
  const toggle = (s: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
      {Object.entries(SKILL_MAP).map(([cat, skills]) => (
        <View key={cat} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: accentColor, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{cat}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {skills.map((skill) => {
              const sel = selected.includes(skill);
              return (
                <TouchableOpacity
                  key={skill}
                  onPress={() => toggle(skill)}
                  style={[SC.chip, sel ? { backgroundColor: accentColor + "28", borderColor: accentColor } : { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }]}
                >
                  <Text style={[SC.txt, { color: sel ? accentColor : "rgba(255,255,255,0.52)" }]}>{skill}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
const SC = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  txt:  { fontSize: 12, fontWeight: "600" },
});

// ─── AIBulletsPanel ───────────────────────────────────────────────────────────
function AIBulletsPanel({ role, company, onAddBullet, accentColor }: {
  role: string; company: string; onAddBullet: (b: string) => void; accentColor: string;
}) {
  const [loading,  setLoading ] = useState(false);
  const [bullets,  setBullets ] = useState<string[]>([]);
  const [shown,    setShown   ] = useState(false);

  const generate = async () => {
    if (!role.trim()) return;
    setLoading(true);
    setShown(true);
    try {
      const res  = await apiFetch("/onboarding/generate-bullets", { method: "POST", body: JSON.stringify({ role, company }) });
      const data = await res.json();
      setBullets(Array.isArray(data.bullets) ? data.bullets : []);
    } catch { setBullets([]); }
    finally  { setLoading(false); }
  };

  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <TouchableOpacity
        onPress={generate}
        style={[AB.btn, { borderColor: accentColor + "55", backgroundColor: accentColor + "0F" }]}
      >
        <Text style={{ fontSize: 13, color: accentColor, fontWeight: "700" }}>✨  Generate with AI</Text>
        <Text style={{ fontSize: 11, color: accentColor + "88" }}>({role || "enter role first"})</Text>
      </TouchableOpacity>
      {loading && <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textAlign: "center", paddingVertical: 8 }}>Crafting achievement bullets…</Text>}
      {shown && !loading && bullets.map((b, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => { onAddBullet(b); if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
          style={[AB.bullet, { borderColor: "rgba(255,255,255,0.09)" }]}
        >
          <View style={[AB.dot, { backgroundColor: accentColor }]} />
          <Text style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 19 }}>{b}</Text>
          <Feather name="plus-circle" size={16} color={accentColor} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
const AB = StyleSheet.create({
  btn:    { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 11 },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderWidth: 1, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)" },
  dot:    { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
});

// ─── EntryCard ────────────────────────────────────────────────────────────────
function EntryCard({ label, lines, accentColor, onEdit }: { label: string; lines: string[]; accentColor: string; onEdit: () => void }) {
  return (
    <View style={[EC.card, { borderColor: accentColor + "44", backgroundColor: accentColor + "09" }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: accentColor, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</Text>
          {lines.filter(Boolean).map((l, i) => (
            <Text key={i} style={[EC.line, { color: i === 0 ? "#fff" : "rgba(255,255,255,0.55)", fontSize: i === 0 ? 16 : 13, fontWeight: i === 0 ? "700" : "500" }]}>{l}</Text>
          ))}
        </View>
        <TouchableOpacity onPress={onEdit} style={[EC.editBtn, { backgroundColor: accentColor + "22" }]}>
          <Feather name="edit-2" size={12} color={accentColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const EC = StyleSheet.create({
  card:    { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 2 },
  line:    { lineHeight: 22, marginBottom: 1 },
  editBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});

// ─── DateRangeRow — for education year picking ────────────────────────────────
function EduDateRow({ edu, setEdu, color, eduYearPickerFor, setEduYearPickerFor, yearSheetRef }: {
  edu: EduEntry; setEdu: (e: EduEntry) => void; color: string;
  eduYearPickerFor: "start" | "end" | null; setEduYearPickerFor: (v: "start" | "end" | null) => void;
  yearSheetRef: React.RefObject<BottomSheetModal | null>;
}) {
  const handlePress = (v: "start" | "end") => {
    setEduYearPickerFor(v);
    yearSheetRef.current?.present();
  };

  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <TouchableOpacity style={[S.yearBtn, { borderColor: edu.start_year ? color + "88" : "rgba(255,255,255,0.12)" }]} onPress={() => handlePress("start")}>
        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4, fontWeight: "700", letterSpacing: 0.5 }}>FROM</Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: edu.start_year ? "#fff" : "rgba(255,255,255,0.2)" }}>{edu.start_year || "Year"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[S.yearBtn, { borderColor: edu.end_year ? color + "88" : "rgba(255,255,255,0.12)" }]} onPress={() => handlePress("end")}>
        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4, fontWeight: "700", letterSpacing: 0.5 }}>TO</Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: edu.end_year ? (edu.end_year === "Present" ? color : "#fff") : "rgba(255,255,255,0.2)" }}>{edu.end_year || "Year"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── ExpDateSection ───────────────────────────────────────────────────────────
function ExpDateSection({ exp, setExp, color, monthSheetRef, yearSheetRef, setMonthPickerFor, setYearPickerFor }: {
  exp: ExpEntry; setExp: (e: ExpEntry) => void; color: string;
  monthSheetRef: React.RefObject<BottomSheetModal | null>;
  yearSheetRef: React.RefObject<BottomSheetModal | null>;
  setMonthPickerFor: (v: "start" | "end" | null) => void;
  setYearPickerFor: (v: "start" | "end" | null) => void;
}) {
  const openMonth = (v: "start" | "end") => { setMonthPickerFor(v); monthSheetRef.current?.present(); };
  const openYear  = (v: "start" | "end") => { setYearPickerFor(v);  yearSheetRef.current?.present();  };

  return (
    <View>
      <Text style={S.fieldLabel}>Start Date</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <TouchableOpacity style={[S.monthYearBtn, { borderColor: exp.start_month ? color + "88" : "rgba(255,255,255,0.1)" }]} onPress={() => openMonth("start")}>
          <Text style={[S.monthYearTxt, { color: exp.start_month ? "#fff" : "rgba(255,255,255,0.28)" }]}>{exp.start_month || "Month"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.monthYearBtn, { borderColor: exp.start_year ? color + "88" : "rgba(255,255,255,0.1)" }]} onPress={() => openYear("start")}>
          <Text style={[S.monthYearTxt, { color: exp.start_year ? "#fff" : "rgba(255,255,255,0.28)" }]}>{exp.start_year || "Year"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); setExp({ ...exp, is_current: !exp.is_current }); }}
        style={[S.toggleRow, { borderColor: exp.is_current ? color + "70" : "rgba(255,255,255,0.1)", backgroundColor: exp.is_current ? color + "12" : "transparent" }]}
      >
        <View style={[S.toggleDot, { backgroundColor: exp.is_current ? color : "rgba(255,255,255,0.3)" }]} />
        <Text style={{ fontSize: 14, fontWeight: "600", color: exp.is_current ? color : "rgba(255,255,255,0.6)" }}>Currently working here</Text>
      </TouchableOpacity>

      {!exp.is_current && (
        <>
          <Text style={[S.fieldLabel, { marginTop: 16 }]}>End Date</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={[S.monthYearBtn, { borderColor: exp.end_month ? color + "88" : "rgba(255,255,255,0.1)" }]} onPress={() => openMonth("end")}>
              <Text style={[S.monthYearTxt, { color: exp.end_month ? "#fff" : "rgba(255,255,255,0.28)" }]}>{exp.end_month || "Month"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.monthYearBtn, { borderColor: exp.end_year ? color + "88" : "rgba(255,255,255,0.1)" }]} onPress={() => openYear("end")}>
              <Text style={[S.monthYearTxt, { color: exp.end_year ? "#fff" : "rgba(255,255,255,0.28)" }]}>{exp.end_year || "Year"}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ManualEntryScreen
// ─────────────────────────────────────────────────────────────────────────────
export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const { 
    profile, 
    setOnboardingStep, 
    updateProfile,
    education,
    experiences,
    projects,
    research 
  } = useProfileStore();

  // Section & step
  const [sectionIdx, setSectionIdx] = useState(0);
  const [stepIdx,    setStepIdx   ] = useState(0);
  // About
  const [headline, setHeadline] = useState(profile?.headline || "");
  const [bio,      setBio     ] = useState(profile?.bio      || "");

  // Education
  const [edu,              setEdu             ] = useState<EduEntry>(newEdu());
  const [eduYearPickerFor, setEduYearPickerFor] = useState<"start" | "end" | null>(null);

  // Experience
  const [exp,        setExp       ] = useState<ExpEntry>(newExp());
  const [expYearPickerFor, setExpYearPickerFor] = useState<"start" | "end" | null>(null);
  const [expMonthPickerFor, setExpMonthPickerFor] = useState<"start" | "end" | null>(null);

  // Projects
  const [proj,        setProj       ] = useState<ProjEntry>(newProj());

  // Skills
  const [skills, setSkills] = useState<string[]>([]);

  // Research
  const [res,        setRes       ] = useState<ResEntry>(newRes());

  // Contact
  const [contact, setContact] = useState<ContactEntry>({
    phone: profile?.phone || "",
    email: profile?.email || "",
    address: profile?.address || "",
  });

  // Save state
  const [saving, setSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState<string | null>(null);

  // BottomSheet Refs
  const yearSheetRef  = useRef<BottomSheetModal>(null);
  const monthSheetRef = useRef<BottomSheetModal>(null);

  const suggestAbout = useCallback(
    async (target: "headline" | "bio") => {
      const hint = target === "headline" ? headline : bio;
      if (aiSuggestLoading || !profile?.full_name?.trim() || !hint.trim()) return;
      setAiSuggestLoading(target);
      try {
        const res = await apiFetch("/onboarding/suggest-about", {
          method: "POST",
          body: JSON.stringify({
            full_name: profile.full_name,
            headline_hint: headline,
            bio_hint: bio,
            skills,
            target,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (target === "headline" && typeof data.headline === "string" && data.headline.trim()) {
          setHeadline(data.headline.trim());
        }
        if (target === "bio" && typeof data.bio === "string" && data.bio.trim()) {
          setBio(data.bio.trim());
        }
      } catch {
        /* ignore */
      } finally {
        setAiSuggestLoading(null);
      }
    },
    [profile?.full_name, headline, bio, skills, aiSuggestLoading],
  );

  const suggestSkills = async () => {
    if (aiSuggestLoading || (!headline.trim() && !bio.trim())) return;
    setAiSuggestLoading("skills");
    haptic("medium");
    try {
      const res = await apiFetch("/onboarding/suggest-skills", {
        method: "POST",
        body: JSON.stringify({ 
          headline, 
          bio, 
          existing_skills: skills,
          experiences: useProfileStore.getState().experiences.map(e => ({ role: e.role, company: e.company }))
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.skills)) {
        setSkills(prev => [...new Set([...prev, ...data.skills])]);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("[Manual] suggestSkills error:", err);
    } finally {
      setAiSuggestLoading(null);
    }
  };

  const suggestDescription = async (type: "project" | "research") => {
    const title = type === "project" ? proj.title : res.title;
    if (aiSuggestLoading || !title.trim()) return;
    setAiSuggestLoading(type);
    haptic("medium");
    try {
      const resApi = await apiFetch("/onboarding/suggest-description", {
        method: "POST",
        body: JSON.stringify({ type, title, tech_stack: type === "project" ? proj.tech_stack : [] })
      });
      const data = await resApi.json().catch(() => ({}));
      if (resApi.ok && typeof data.description === "string") {
        if (type === "project") setProj(p => ({ ...p, description: data.description }));
        else setRes(r => ({ ...r, description: data.description }));
      }
    } catch (err) {
      console.error("[Manual] suggestDescription error:", err);
    } finally {
      setAiSuggestLoading(null);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;
    const id = setInterval(async () => {
      const h = headline.trim();
      const b = bio.trim();
      if (!h && !b) return;
      if (h === (profile.headline ?? "").trim() && b === (profile.bio ?? "").trim()) return;
      try {
        await updateProfile({ headline: h, bio: b });
        setDraftSavedAt(Date.now());
      } catch {
        /* offline / validation — skip */
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [profile?.id, profile?.headline, profile?.bio, headline, bio, updateProfile]);

  // Transition animation
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const sec   = SECTIONS[sectionIdx];
  const color = sec.color;

  // Section-specific logic used by handleNext and renderContent

  const haptic = (style: "light" | "medium" | "select" = "select") => {
    try {
      if (Platform.OS === "web") return;
      if (style === "select") Haptics.selectionAsync();
      else Haptics.impactAsync(style === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn("Haptics failed", e);
    }
  };

  const transition = useCallback((dir: "fwd" | "bwd", cb: () => void) => {
    const exitTo    = dir === "fwd" ? -W * 0.45 : W * 0.45;
    const enterFrom = dir === "fwd" ?  W * 0.45 : -W * 0.45;
    
    opacity.value = withTiming(0, { duration: 130 });
    translateX.value = withTiming(exitTo, { duration: 130 }, (finished) => {
      if (finished) {
        translateX.value = enterFrom;
        if (cb) runOnJS(cb)();
        opacity.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
      }
    });
  }, [opacity, translateX]);

  const goBack = () => {
    haptic("light");
    if (stepIdx > 0) {
      transition("bwd", () => setStepIdx((s) => s - 1));
    } else if (sectionIdx > 0) {
      transition("bwd", () => { setSectionIdx((s) => s - 1); setStepIdx(STEPS[sectionIdx - 1] - 1); });
    } else {
      router.back();
    }
  };

  const skipSection = () => {
    haptic("light");
    if (sectionIdx < 3) {
      transition("fwd", () => { setSectionIdx((s) => s + 1); setStepIdx(0); });
    }
  };

  const goToReview = () => {
    haptic("medium");
    transition("fwd", () => setStepIdx(STEPS[sectionIdx] - 1));
  };

  const advanceStep = () => {
    haptic("select");
    transition("fwd", () => setStepIdx((s) => s + 1));
  };

  const addAnotherEntry = async (section: number) => {
    haptic("medium");
    setSaving(true);
    const store = useProfileStore.getState();
    try {
      if (section === 1 && edu.institution.trim()) {
        await store.saveEducation({
          ...edu,
          start_year: Number(edu.start_year) || 0,
          end_year: edu.end_year && edu.end_year !== "Present" ? Number(edu.end_year) : null,
        });
        setEdu(newEdu());
      }
      if (section === 2 && exp.company.trim()) {
        await store.saveExperience({
          ...exp,
          start_date: `${exp.start_year}-${String(MONTHS.indexOf(exp.start_month) + 1).padStart(2, "0")}-01`,
          end_date: exp.is_current || !exp.end_year ? null : `${exp.end_year}-${String(MONTHS.indexOf(exp.end_month) + 1).padStart(2, "0")}-01`,
        });
        setExp(newExp());
      }
      if (section === 3 && proj.title.trim()) {
        await store.saveProject(proj);
        setProj(newProj());
      }
      if (section === 5 && res.title.trim()) {
        await store.saveResearch(res);
        setRes(newRes());
      }
      transition("fwd", () => setStepIdx(0));
    } catch (err) {
      console.error("[Manual] addAnother error:", err);
    } finally {
      setSaving(false);
    }
  };

  const proceedToNextSection = async () => {
    haptic("medium");
    setSaving(true);
    const store = useProfileStore.getState();
    
    try {
      // Save current draft if valid
      if (sectionIdx === 1 && edu.institution.trim()) {
        await store.saveEducation({
          ...edu,
          start_year: Number(edu.start_year) || 0,
          end_year: edu.end_year && edu.end_year !== "Present" ? Number(edu.end_year) : null,
        });
        setEdu(newEdu());
      }
      if (sectionIdx === 2 && exp.company.trim()) {
        await store.saveExperience({
          ...exp,
          start_date: `${exp.start_year}-${String(MONTHS.indexOf(exp.start_month) + 1).padStart(2, "0")}-01`,
          end_date: exp.is_current || !exp.end_year ? null : `${exp.end_year}-${String(MONTHS.indexOf(exp.end_month) + 1).padStart(2, "0")}-01`,
        });
        setExp(newExp());
      }
      if (sectionIdx === 3 && proj.title.trim()) {
        await store.saveProject(proj);
        setProj(newProj());
      }
      if (sectionIdx === 5 && res.title.trim()) {
        await store.saveResearch(res);
        setRes(newRes());
      }
    } catch (err) {
      console.error("[Manual] nextSection save error:", err);
    }

    if (sectionIdx < 6) {
      transition("fwd", () => { 
        setSectionIdx((s) => s + 1); 
        setStepIdx(0); 
      });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    // We don't block by 'saving' here because proceedToNextSection might have set it
    // instead we just do one final sync
    haptic("medium");
    setSaving(true);
    const store = useProfileStore.getState();

    try {
      if (profile?.id) {
        // Final sync for contact and skills
        await store.updateProfile({
          headline,
          bio,
          phone: contact.phone || profile.phone,
          email: contact.email || profile.email,
          address: contact.address,
        });

        if (skills.length > 0) {
          await store.bulkSaveSkills(skills.map(s => ({
            name: s,
            category: "General",
            level: "intermediate" as const,
          })));
        }
      }
    } catch (err) {
      console.error("[Manual] Final save error:", err);
    } finally {
      setSaving(false);
      setOnboardingStep("theme");
      router.push("/(onboarding)/theme");
    }
  };


  // ── Validation ──
  const isReviewStep  = stepIdx === STEPS[sectionIdx] - 1 && sectionIdx !== 4;
  const isSkillsStep  = sectionIdx === 4;
  const canContinue   = (() => {
    if (isReviewStep || isSkillsStep) return true;
    if (sectionIdx === 0) {
      if (stepIdx === 0) return headline.trim().length > 0;
      if (stepIdx === 1) return bio.trim().length > 0;
    }
    if (sectionIdx === 1) {
      if (stepIdx === 0) return edu.institution.trim().length > 0;
      if (stepIdx === 1) return edu.degree.length > 0;
      if (stepIdx === 2) return true;
      if (stepIdx === 3) return edu.start_year.length > 0;
    }
    if (sectionIdx === 2) {
      if (stepIdx === 0) return exp.company.trim().length > 0;
      if (stepIdx === 1) return exp.role.trim().length > 0;
      if (stepIdx === 2) return exp.start_year.length > 0;
      if (stepIdx === 3) return true;
    }
    if (sectionIdx === 3) {
      if (stepIdx === 0) return proj.title.trim().length > 0;
      if (stepIdx === 1) return proj.description.trim().length > 0;
      if (stepIdx === 2) return true;
      if (stepIdx === 3) return true;
    }
    if (sectionIdx === 5) {
      if (stepIdx === 0) return res.title.trim().length > 0;
      if (stepIdx === 1) return res.description.trim().length > 0;
      if (stepIdx === 2) return true;
    }
    if (sectionIdx === 6) {
      if (stepIdx === 0) return contact.email.trim().includes("@"); // Email
      if (stepIdx === 1) return true; // Address
    }
    return true;
  })();

  // ── Next handler ──
  const handleNext = () => {
    if (!isReviewStep && !isSkillsStep && stepIdx === STEPS[sectionIdx] - 2) {
      goToReview();
    } else if (!isReviewStep && !isSkillsStep) {
      advanceStep();
    }
  };

  // ── Step content ──
  const renderContent = () => {
    // ── ABOUT ────────────────────────────────────────────────────────────────
    if (sectionIdx === 0) {
      if (stepIdx === 0) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="What's your headline?" sub="A short, catchy summary of who you are" />
          <GlassInput value={headline} onChangeText={setHeadline} placeholder="e.g. Product Designer at BEXO" accentColor={color} autoFocus returnKeyType="next" onSubmitEditing={canContinue ? handleNext : undefined} />
          <TouchableOpacity
            onPress={() => suggestAbout("headline")}
            disabled={aiSuggestLoading !== null || !headline.trim()}
            style={{ 
              marginTop: 12, 
              paddingVertical: 12, 
              borderRadius: 12, 
              borderWidth: 1, 
              borderColor: (aiSuggestLoading || !headline.trim()) ? "rgba(255,255,255,0.1)" : color + "44", 
              alignItems: "center", 
              backgroundColor: (aiSuggestLoading || !headline.trim()) ? "transparent" : color + "12",
              opacity: !headline.trim() ? 0.5 : 1
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: !headline.trim() ? "rgba(255,255,255,0.3)" : color }}>
              {aiSuggestLoading === "headline" ? "Generating…" : headline.trim() ? "Suggest a headline with AI" : "Enter a headline to use AI"}
            </Text>
          </TouchableOpacity>
        </View>
      );
      if (stepIdx === 1) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Tell us more" sub="A brief bio for your profile" />
          <GlassInput value={bio} onChangeText={setBio} placeholder="I love building products that people use every day…" accentColor={color} multiline autoFocus />
          <TouchableOpacity
            onPress={() => suggestAbout("bio")}
            disabled={aiSuggestLoading !== null || !bio.trim()}
            style={{ 
              marginTop: 12, 
              paddingVertical: 12, 
              borderRadius: 12, 
              borderWidth: 1, 
              borderColor: (aiSuggestLoading || !bio.trim()) ? "rgba(255,255,255,0.1)" : color + "44", 
              alignItems: "center", 
              backgroundColor: (aiSuggestLoading || !bio.trim()) ? "transparent" : color + "12",
              opacity: !bio.trim() ? 0.5 : 1
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: !bio.trim() ? "rgba(255,255,255,0.3)" : color }}>
              {aiSuggestLoading === "bio" ? "Generating…" : bio.trim() ? "Suggest a bio with AI" : "Enter a bio to use AI"}
            </Text>
          </TouchableOpacity>
        </View>
      );
      if (stepIdx === 2) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Profile Preview" sub="How you'll appear to others" />
          <EntryCard
            label="About You"
            lines={[headline, bio]}
            accentColor={color}
            onEdit={() => setStepIdx(0)}
          />
        </View>
      );
    }

    // ── EDUCATION ──────────────────────────────────────────────────────────────
    if (sectionIdx === 1) {
      if (stepIdx === 0) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Tell us about your studies" sub="University, college, or institution name" />
          <GlassInput value={edu.institution} onChangeText={(v) => setEdu({ ...edu, institution: v })} placeholder="e.g. MIT, Stanford, BITS Pilani…" accentColor={color} autoFocus returnKeyType="next" onSubmitEditing={canContinue ? handleNext : undefined} />
        </View>
      );
      if (stepIdx === 1) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="What did you graduate with?" sub="Select the type of qualification" />
          <ChipRow options={DEGREES} value={edu.degree} onChange={(v) => setEdu({ ...edu, degree: v })} accentColor={color} />
        </View>
      );
      if (stepIdx === 2) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="What was your major?" sub="Major, specialisation or subject — optional" />
          <GlassInput value={edu.field} onChangeText={(v) => setEdu({ ...edu, field: v })} placeholder="e.g. Computer Science, Design, Finance…" accentColor={color} autoFocus returnKeyType="next" onSubmitEditing={handleNext} />
        </View>
      );
      if (stepIdx === 3) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="When was this?" sub="Your study period" />
          <EduDateRow 
            edu={edu} 
            setEdu={setEdu} 
            color={color} 
            eduYearPickerFor={eduYearPickerFor} 
            setEduYearPickerFor={setEduYearPickerFor}
            yearSheetRef={yearSheetRef}
          />
        </View>
      );
      if (stepIdx === 4) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Saved!" sub="Looks great — want to add another?" />
          <View style={{ gap: 12 }}>
            {education.map((item, idx) => (
              <EntryCard
                key={item.id || idx}
                label="Education"
                lines={[item.institution, `${item.degree}${item.field ? ` in ${item.field}` : ""}`, `${item.start_year}${item.end_year ? ` – ${item.end_year}` : ""}`]}
                accentColor={color}
                onEdit={() => {
                  setEdu({
                    id: item.id,
                    institution: item.institution,
                    degree: item.degree,
                    field: item.field,
                    start_year: String(item.start_year),
                    end_year: item.end_year ? String(item.end_year) : "Present",
                    description: item.description || "",
                  });
                  transition("bwd", () => setStepIdx(0));
                }}
              />
            ))}
          </View>
          <TouchableOpacity style={[S.addBtn, { borderColor: color + "50", backgroundColor: color + "0F" }]} onPress={() => addAnotherEntry(1)}>
            <Feather name="plus" size={15} color={color} />
            <Text style={{ color, fontWeight: "700", fontSize: 14 }}>Add another education</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── EXPERIENCE ─────────────────────────────────────────────────────────────
    if (sectionIdx === 2) {
      if (stepIdx === 0) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Where did you work?" sub="Most recent or most relevant first" />
          <GlassInput value={exp.company} onChangeText={(v) => setExp({ ...exp, company: v })} placeholder="e.g. Google, Figma, Startup Inc, Freelance…" accentColor={color} autoFocus returnKeyType="next" onSubmitEditing={canContinue ? handleNext : undefined} />
        </View>
      );
      if (stepIdx === 1) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="What was your job title?" sub="Official title at this company" />
          <GlassInput value={exp.role} onChangeText={(v) => setExp({ ...exp, role: v })} placeholder="e.g. Product Designer, SWE Intern, CTO…" accentColor={color} autoFocus returnKeyType="next" onSubmitEditing={canContinue ? handleNext : undefined} />
        </View>
      );
      if (stepIdx === 2) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="When was this?" sub="Select start and end dates" />
          <ExpDateSection 
            exp={exp} 
            setExp={setExp} 
            color={color}
            monthSheetRef={monthSheetRef}
            yearSheetRef={yearSheetRef}
            setMonthPickerFor={setExpMonthPickerFor}
            setYearPickerFor={setExpYearPickerFor}
          />
        </View>
      );
      if (stepIdx === 3) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="What were your big wins?" sub="Key achievements — or let AI write it" />
          <GlassInput value={exp.description} onChangeText={(v) => setExp({ ...exp, description: v })} placeholder="e.g. Led redesign of checkout flow, reducing drop-off by 32%…" accentColor={color} multiline />
          <AIBulletsPanel role={exp.role} company={exp.company} accentColor={color} onAddBullet={(b) => setExp((e) => ({ ...e, description: e.description ? `${e.description}\n• ${b}` : `• ${b}` }))} />
        </View>
      );
      if (stepIdx === 4) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Saved!" sub={`${exp.role} at ${exp.company}`} />
          <View style={{ gap: 12 }}>
            {experiences.map((item, idx) => (
              <EntryCard
                key={item.id || idx}
                label="Experience"
                lines={[
                  item.role, 
                  item.company, 
                  item.is_current 
                    ? `${item.start_date.split("-")[0]} – Present` 
                    : `${item.start_date.split("-")[0]} – ${item.end_date ? item.end_date.split("-")[0] : ""}`
                ]}
                accentColor={color}
                onEdit={() => {
                  const [sy, sm] = item.start_date.split("-");
                  const [ey, em] = item.end_date?.split("-") || ["", ""];
                  setExp({
                    id: item.id,
                    company: item.company,
                    role: item.role,
                    start_month: MONTHS[Number(sm) - 1],
                    start_year: sy,
                    end_month: em ? MONTHS[Number(em) - 1] : "",
                    end_year: ey,
                    is_current: item.is_current,
                    description: item.description || "",
                  });
                  transition("bwd", () => setStepIdx(0));
                }}
              />
            ))}
          </View>
          <TouchableOpacity style={[S.addBtn, { borderColor: color + "50", backgroundColor: color + "0F" }]} onPress={() => addAnotherEntry(2)}>
            <Feather name="plus" size={15} color={color} />
            <Text style={{ color, fontWeight: "700", fontSize: 14 }}>Add another role</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── PROJECTS ───────────────────────────────────────────────────────────────
    if (sectionIdx === 3) {
      if (stepIdx === 0) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="What's a project you're proud of?" sub="A project you've built" />
          <GlassInput value={proj.title} onChangeText={(v) => setProj({ ...proj, title: v })} placeholder="e.g. Portfolio App, E-Commerce Site, CLI Tool…" accentColor={color} autoFocus returnKeyType="next" onSubmitEditing={canContinue ? handleNext : undefined} />
        </View>
      );
      if (stepIdx === 1) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Tell us more about it" sub="What it does, who it's for, why you built it" />
          <GlassInput value={proj.description} onChangeText={(v) => setProj({ ...proj, description: v })} placeholder="A short, punchy description…" accentColor={color} multiline autoFocus />
          <TouchableOpacity
            onPress={() => suggestDescription("project")}
            disabled={aiSuggestLoading !== null || !proj.title.trim()}
            style={{ 
              marginTop: 12, 
              paddingVertical: 12, 
              borderRadius: 12, 
              borderWidth: 1, 
              borderColor: (aiSuggestLoading || !proj.title.trim()) ? "rgba(255,255,255,0.1)" : color + "44", 
              alignItems: "center", 
              backgroundColor: (aiSuggestLoading || !proj.title.trim()) ? "transparent" : color + "12",
              opacity: !proj.title.trim() ? 0.5 : 1
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: !proj.title.trim() ? "rgba(255,255,255,0.3)" : color }}>
              {aiSuggestLoading === "project" ? "Generating…" : proj.title.trim() ? "Generate description with AI" : "Enter project title first"}
            </Text>
          </TouchableOpacity>
        </View>
      );
      if (stepIdx === 2) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Tech stack?" sub="Tap everything you used — optional" />
          <TechTagGrid selected={proj.tech_stack} onChange={(v) => setProj({ ...proj, tech_stack: v })} accentColor={color} />
        </View>
      );
      if (stepIdx === 3) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Any links?" sub="Optional — skip if not applicable" />
          <View style={{ gap: 12 }}>
            <GlassInput value={proj.live_url} onChangeText={(v) => setProj({ ...proj, live_url: v })} placeholder="🌐  Live site URL  (optional)" accentColor={color} keyboardType="url" autoCapitalize="none" />
            <GlassInput value={proj.github_url} onChangeText={(v) => setProj({ ...proj, github_url: v })} placeholder="⌥  GitHub repository URL  (optional)" accentColor={color} keyboardType="url" autoCapitalize="none" />
          </View>
        </View>
      );
      if (stepIdx === 4) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Saved!" sub={proj.title} />
          <View style={{ gap: 12 }}>
            {projects.map((item, idx) => (
              <EntryCard
                key={item.id || idx}
                label="Project"
                lines={[item.title, item.description, item.tech_stack.slice(0, 4).join(" · ")]}
                accentColor={color}
                onEdit={() => {
                  setProj({
                    ...item,
                    github_url: item.github_url || "",
                    live_url: item.live_url || "",
                    image_url: item.image_url || "",
                  });
                  transition("bwd", () => setStepIdx(0));
                }}
              />
            ))}
          </View>
          <TouchableOpacity style={[S.addBtn, { borderColor: color + "50", backgroundColor: color + "0F" }]} onPress={() => addAnotherEntry(3)}>
            <Feather name="plus" size={15} color={color} />
            <Text style={{ color, fontWeight: "700", fontSize: 14 }}>Add another project</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── SKILLS ─────────────────────────────────────────────────────────────────
    if (sectionIdx === 4) return (
      <View style={[S.stepWrap, { flex: 1 }]}>
        <QuestionHeader section={sec} title="What are you great at?" sub={`Tap everything that applies  ·  ${skills.length} selected`} />
        <TouchableOpacity
          onPress={suggestSkills}
          disabled={aiSuggestLoading !== null || (!headline.trim() && !bio.trim())}
          style={{ 
            marginBottom: 16, 
            paddingVertical: 12, 
            borderRadius: 12, 
            borderWidth: 1, 
            borderColor: (aiSuggestLoading || (!headline.trim() && !bio.trim())) ? "rgba(255,255,255,0.1)" : color + "44", 
            alignItems: "center", 
            backgroundColor: (aiSuggestLoading || (!headline.trim() && !bio.trim())) ? "transparent" : color + "12",
            opacity: (!headline.trim() && !bio.trim()) ? 0.5 : 1
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: (!headline.trim() && !bio.trim()) ? "rgba(255,255,255,0.3)" : color }}>
            {aiSuggestLoading === "skills" ? "Generating skills…" : (headline.trim() || bio.trim()) ? "✨ Discover skills from profile with AI" : "Enter headline/bio first to suggest skills"}
          </Text>
        </TouchableOpacity>
        <SkillCategoryGrid selected={skills} onChange={setSkills} accentColor={color} />
      </View>
    );

    // ── RESEARCH ───────────────────────────────────────────────────────────────
    if (sectionIdx === 5) {
      if (stepIdx === 0) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Any research work?" sub="Title of your research paper or project" />
          <GlassInput value={res.title} onChangeText={(v) => setRes({ ...res, title: v })} placeholder="e.g. AI in Healthcare, Crypto Analysis…" accentColor={color} autoFocus returnKeyType="next" onSubmitEditing={canContinue ? handleNext : undefined} />
        </View>
      );
      if (stepIdx === 1) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="What was it about?" sub="A brief summary of your research" />
          <GlassInput value={res.description} onChangeText={(v) => setRes({ ...res, description: v })} placeholder="Summary of findings, methodology…" accentColor={color} multiline autoFocus />
          <TouchableOpacity
            onPress={() => suggestDescription("research")}
            disabled={aiSuggestLoading !== null || !res.title.trim()}
            style={{ 
              marginTop: 12, 
              paddingVertical: 12, 
              borderRadius: 12, 
              borderWidth: 1, 
              borderColor: (aiSuggestLoading || !res.title.trim()) ? "rgba(255,255,255,0.1)" : color + "44", 
              alignItems: "center", 
              backgroundColor: (aiSuggestLoading || !res.title.trim()) ? "transparent" : color + "12",
              opacity: !res.title.trim() ? 0.5 : 1
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: !res.title.trim() ? "rgba(255,255,255,0.3)" : color }}>
              {aiSuggestLoading === "research" ? "Generating…" : res.title.trim() ? "Generate summary with AI" : "Enter research title first"}
            </Text>
          </TouchableOpacity>
        </View>
      );
      if (stepIdx === 2) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Subtitle?" sub="A short catchy subtitle — optional" />
          <GlassInput value={res.subtitle} onChangeText={(v) => setRes({ ...res, subtitle: v })} placeholder="e.g. Published in Nature, 2024" accentColor={color} autoFocus returnKeyType="done" onSubmitEditing={handleNext} />
        </View>
      );
      if (stepIdx === 3) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Saved!" sub={res.title} />
          <View style={{ gap: 12 }}>
            {research.map((item, idx) => (
              <EntryCard
                key={item.id || idx}
                label="Research"
                lines={[item.title, item.subtitle || "", item.description.substring(0, 100) + "..."]}
                accentColor={color}
                onEdit={() => {
                  setRes({
                    ...item,
                    subtitle: item.subtitle || "",
                    image_url: item.image_url || "",
                  });
                  transition("bwd", () => setStepIdx(0));
                }}
              />
            ))}
          </View>
          <TouchableOpacity style={[S.addBtn, { borderColor: color + "50", backgroundColor: color + "0F" }]} onPress={() => addAnotherEntry(5)}>
            <Feather name="plus" size={15} color={color} />
            <Text style={{ color, fontWeight: "700", fontSize: 14 }}>Add another research</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── CONTACT ────────────────────────────────────────────────────────────────
    if (sectionIdx === 6) {
      if (stepIdx === 0) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Work email?" sub="Your professional email address" />
          <GlassInput value={contact.email} onChangeText={(v) => setContact({ ...contact, email: v })} placeholder="e.g. kavin@bexo.com" accentColor={color} keyboardType="email-address" autoCapitalize="none" autoFocus returnKeyType="next" onSubmitEditing={handleNext} />
        </View>
      );
      if (stepIdx === 1) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Where are you based?" sub="City, Country or full address" />
          <GlassInput value={contact.address} onChangeText={(v) => setContact({ ...contact, address: v })} placeholder="e.g. San Francisco, CA" accentColor={color} autoFocus returnKeyType="done" onSubmitEditing={handleNext} />
        </View>
      );
    }

    return null;
  };

  const topPad = insets.top + (Platform.OS === "web" ? 60 : 12);
  const botPad = insets.bottom + (Platform.OS === "web" ? 24 : 8);

  return (
    <View style={[S.root]}>
      {/* Animated background orb */}
      <View style={S.orbContainer} pointerEvents="none">
        <LinearGradient
          colors={[color + "30", color + "10", "transparent"]}
          style={S.orb}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
      </View>

      <KeyboardAwareScrollViewCompat style={{ flex: 1 }}>
        <View style={[S.inner, { paddingTop: topPad, paddingBottom: botPad }]}>

          {/* ── Header ── */}
          <View style={S.header}>
            <TouchableOpacity onPress={goBack} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.75)" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 14 }}>
              <SegmentedProgress sectionIdx={sectionIdx} stepIdx={isReviewStep ? STEPS[sectionIdx] : stepIdx} totalSteps={STEPS[sectionIdx]} />
            </View>
            <View style={[S.badge, { backgroundColor: color + "1A", borderColor: color + "44" }]}>
              <Feather name={sec.icon} size={11} color={color} />
              <Text style={{ fontSize: 11, color, fontWeight: "700", marginLeft: 4 }}>{sectionIdx + 1}/7</Text>
            </View>
          </View>

          {draftSavedAt ? (
            <Text style={{ fontSize: 11, color: "#6AFAD0", textAlign: "right", marginBottom: 6, marginTop: -4 }}>
              Draft saved to your profile
            </Text>
          ) : null}

          {/* ── Animated content ── */}
          <Animated.View style={[{ flex: 1 }, animatedContentStyle]}>
            {renderContent()}
          </Animated.View>

          {/* ── Footer ── */}
          <View style={S.footer}>
            {/* Review step footer */}
            {isReviewStep && (
              <View style={{ width: "100%", gap: 10 }}>
                <TouchableOpacity onPress={proceedToNextSection} style={S.primaryBtnWrap}>
                  <LinearGradient colors={[color, color + "BB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.primaryBtn}>
                    <Text style={S.primaryBtnTxt}>{sectionIdx < 6 ? `Next: ${SECTIONS[sectionIdx + 1].label}` : "Finish"}</Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={skipSection} style={S.ghostBtn}>
                  <Text style={S.ghostBtnTxt}>Skip next section</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Skills section footer */}
            {isSkillsStep && (
              <TouchableOpacity onPress={proceedToNextSection} style={S.primaryBtnWrap}>
                <LinearGradient colors={[color, color + "BB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.primaryBtn}>
                  <Text style={S.primaryBtnTxt}>{`Next: ${SECTIONS[sectionIdx + 1].label}`}</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Normal step footer */}
            {!isReviewStep && !isSkillsStep && (
              <View style={{ width: "100%", gap: 10 }}>
                <TouchableOpacity onPress={handleNext} disabled={!canContinue} style={[S.primaryBtnWrap, !canContinue && { opacity: 0.3 }]}>
                  <LinearGradient colors={[color, color + "BB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.primaryBtn}>
                    <Text style={S.primaryBtnTxt}>Continue</Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={skipSection} style={S.ghostBtn}>
                  <Text style={S.ghostBtnTxt}>Skip entire section</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>
      </KeyboardAwareScrollViewCompat>

      {/* ── Modals / Sheets ── */}
      <YearPickerSheet
        ref={yearSheetRef}
        accentColor={color}
        allowPresent={sectionIdx === 1 ? eduYearPickerFor === "end" : (expYearPickerFor === "end" && !exp.is_current)}
        value={
          sectionIdx === 1
            ? eduYearPickerFor === "start" ? edu.start_year : edu.end_year
            : expYearPickerFor === "start" ? exp.start_year : exp.end_year
        }
        onChange={(v) => {
          if (sectionIdx === 1) {
            setEdu(eduYearPickerFor === "start" ? { ...edu, start_year: v } : { ...edu, end_year: v });
            if (eduYearPickerFor === "start" && !edu.end_year) {
              setTimeout(() => {
                setEduYearPickerFor("end");
                yearSheetRef.current?.present();
              }, 400);
            }
          } else {
            setExp(expYearPickerFor === "start" ? { ...exp, start_year: v } : { ...exp, end_year: v });
            // If picked start year, move to end month if not current
            if (expYearPickerFor === "start" && !exp.is_current && !exp.end_month) {
              setTimeout(() => {
                setExpMonthPickerFor("end");
                monthSheetRef.current?.present();
              }, 400);
            } else if (expYearPickerFor === "end" && !exp.end_year) {
              // already set end year, just dismiss (handled by sheet)
            }
          }
        }}
        onClose={() => {
          setEduYearPickerFor(null);
          setExpYearPickerFor(null);
        }}
      />

      <MonthPickerSheet
        ref={monthSheetRef}
        accentColor={color}
        value={expMonthPickerFor === "start" ? exp.start_month : exp.end_month}
        onChange={(v) => {
          setExp(expMonthPickerFor === "start" ? { ...exp, start_month: v } : { ...exp, end_month: v });
          // If picked start month, move to start year
          if (expMonthPickerFor === "start" && !exp.start_year) {
            setTimeout(() => {
              setExpYearPickerFor("start");
              yearSheetRef.current?.present();
            }, 400);
          } else if (expMonthPickerFor === "end" && !exp.end_year) {
            // If picked end month, move to end year
            setTimeout(() => {
              setExpYearPickerFor("end");
              yearSheetRef.current?.present();
            }, 400);
          }
        }}
        onClose={() => setExpMonthPickerFor(null)}
      />
    </View>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#0A0A0F" },
  orbContainer: { position: "absolute", top: -80, left: -80, width: SCREEN_H * 0.65, height: SCREEN_H * 0.65, borderRadius: 9999, overflow: "hidden" },
  orb:          { flex: 1 },
  inner:        { flex: 1, paddingHorizontal: 22 },
  header:       { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  backBtn:      { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  badge:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  stepWrap:     { gap: 14 },
  footer:       { paddingTop: 14, alignItems: "flex-end" },
  primaryBtnWrap: { alignSelf: "stretch" },
  primaryBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 16 },
  primaryBtnTxt: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: 0.15 },
  ghostBtn:     { alignSelf: "center", paddingVertical: 6 },
  ghostBtnTxt:  { fontSize: 12, color: "rgba(255,255,255,0.28)", textDecorationLine: "underline" },
  addBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 13, borderWidth: 1 },
  yearBtn:      { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  fieldLabel:   { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: 0.8 },
  monthYearBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 13, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  monthYearTxt: { fontSize: 15, fontWeight: "700" },
  toggleRow:    { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  toggleDot:    { width: 10, height: 10, borderRadius: 5 },
});
