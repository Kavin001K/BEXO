import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
import { useProfileStore } from "@/stores/useProfileStore";
import { apiFetch } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";

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

const STEPS = [2, 5, 5, 4, 1, 4, 2]; // Steps per section (including review steps)

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
type ProjEntry = { title: string; subtitle: string; description: string; tech_stack: string[]; live_url: string; github_url: string; image_url: string };
type ResEntry  = { title: string; subtitle: string; description: string; image_url: string };
type ContactEntry = { phone: string; email: string; address: string };

const newEdu  = (): EduEntry  => ({ institution: "", degree: "", field: "", start_year: "", end_year: "", description: "" });
const newExp  = (): ExpEntry  => ({ company: "", role: "", start_month: "", start_year: "", end_month: "", end_year: "", is_current: false, description: "" });
const newProj = (): ProjEntry => ({ title: "", subtitle: "", description: "", tech_stack: [], live_url: "", github_url: "", image_url: "" });
const newRes  = (): ResEntry  => ({ title: "", subtitle: "", description: "", image_url: "" });
const newContact = (): ContactEntry => ({ phone: "", email: "", address: "" });

// ─── SegmentedProgress ────────────────────────────────────────────────────────
function SegmentedProgress({ sectionIdx, stepIdx, totalSteps }: { sectionIdx: number; stepIdx: number; totalSteps: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {SECTIONS.map((sec, i) => {
        const done   = i < sectionIdx;
        const active = i === sectionIdx;
        const fill   = done ? 1 : active ? Math.min((stepIdx + 1) / Math.max(totalSteps, 1), 1) : 0;
        return (
          <View key={sec.id} style={{ flex: 1, gap: 3 }}>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <Animated.View style={{ width: `${fill * 100}%` as any, height: 3, borderRadius: 2, backgroundColor: sec.color }} />
            </View>
            <Text style={{ fontSize: 8, fontWeight: "700", color: active ? sec.color : (done ? sec.color + "80" : "rgba(255,255,255,0.25)"), textAlign: "center", letterSpacing: 0.4, textTransform: "uppercase" }}>
              {sec.label}
            </Text>
          </View>
        );
      })}
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
  const iosFocusStyle = Platform.OS === "ios" && focused
    ? { shadowColor: accentColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 14 }
    : {};
  const webFocusStyle = Platform.OS === "web" && focused
    ? ({ boxShadow: `0 0 20px ${accentColor}44` } as any)
    : {};

  return (
    <View style={[GI.wrap, { borderColor: focused ? accentColor + "99" : "rgba(255,255,255,0.1)" }, iosFocusStyle, webFocusStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.22)"
        style={[GI.input, multiline && { height: 96, textAlignVertical: "top", paddingTop: 4 }]}
        multiline={multiline}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType ?? "done"}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
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
  yearSheetRef: React.RefObject<BottomSheetModal>;
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
  monthSheetRef: React.RefObject<BottomSheetModal>;
  yearSheetRef: React.RefObject<BottomSheetModal>;
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
  const { profile, setOnboardingStep } = useProfileStore();

  // Section & step
  const [sectionIdx, setSectionIdx] = useState(0);
  const [stepIdx,    setStepIdx   ] = useState(0);
  // About
  const [headline, setHeadline] = useState(profile?.headline || "");
  const [bio,      setBio     ] = useState(profile?.bio      || "");

  // Education
  const [eduEntries,       setEduEntries      ] = useState<EduEntry[]>([]);
  const [edu,              setEdu             ] = useState<EduEntry>(newEdu());
  const [eduYearPickerFor, setEduYearPickerFor] = useState<"start" | "end" | null>(null);

  // Experience
  const [expEntries, setExpEntries] = useState<ExpEntry[]>([]);
  const [exp,        setExp       ] = useState<ExpEntry>(newExp());
  const [expYearPickerFor, setExpYearPickerFor] = useState<"start" | "end" | null>(null);
  const [expMonthPickerFor, setExpMonthPickerFor] = useState<"start" | "end" | null>(null);

  // Projects
  const [projEntries, setProjEntries] = useState<ProjEntry[]>([]);
  const [proj,        setProj       ] = useState<ProjEntry>(newProj());

  // Skills
  const [skills, setSkills] = useState<string[]>([]);

  // Research
  const [resEntries, setResEntries] = useState<ResEntry[]>([]);
  const [res,        setRes       ] = useState<ResEntry>(newRes());

  // Contact
  const [contact, setContact] = useState<ContactEntry>({
    phone: profile?.phone || "",
    email: profile?.email || "",
    address: "",
  });

  // Save state
  const [saving, setSaving] = useState(false);

  // BottomSheet Refs
  const yearSheetRef  = useRef<BottomSheetModal>(null);
  const monthSheetRef = useRef<BottomSheetModal>(null);



  // Transition animation
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;

  const sec   = SECTIONS[sectionIdx];
  const color = sec.color;

  // Steps per section: [edu_steps, exp_steps, proj_steps, skills_steps]
  // "review" is the extra step at index totalSteps-1
  const STEPS = [5, 5, 5, 1];

  const haptic = (style: "light" | "medium" | "select" = "select") => {
    if (Platform.OS === "web") return;
    if (style === "select") Haptics.selectionAsync();
    else Haptics.impactAsync(style === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  };

  const transition = useCallback((dir: "fwd" | "bwd", cb: () => void) => {
    const exitTo    = dir === "fwd" ? -W * 0.45 : W * 0.45;
    const enterFrom = dir === "fwd" ?  W * 0.45 : -W * 0.45;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: exitTo, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      translateX.setValue(enterFrom);
      cb();
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
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

  const addAnotherEntry = (section: number) => {
    haptic("medium");
    if (section === 1) { setEduEntries((e) => [...e, edu]); setEdu(newEdu()); }
    if (section === 2) { setExpEntries((e) => [...e, exp]); setExp(newExp()); }
    if (section === 3) { setProjEntries((e) => [...e, proj]); setProj(newProj()); }
    if (section === 5) { setResEntries((e) => [...e, res]); setRes(newRes()); }
    transition("fwd", () => setStepIdx(0));
  };

  const proceedToNextSection = () => {
    haptic("medium");
    
    // Final check for each section to save the "currently being edited" item if it's valid
    if (sectionIdx === 1 && edu.institution.trim()) {
      setEduEntries((e) => [...e, edu]);
      setEdu(newEdu());
    }
    if (sectionIdx === 2 && exp.company.trim()) {
      setExpEntries((e) => [...e, exp]);
      setExp(newExp());
    }
    if (sectionIdx === 3 && proj.title.trim()) {
      setProjEntries((e) => [...e, proj]);
      setProj(newProj());
    }
    if (sectionIdx === 5 && res.title.trim()) {
      setResEntries((e) => [...e, res]);
      setRes(newRes());
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
    setSaving(true);
    haptic("medium");
    const finalEdu   = sectionIdx >= 1 && edu.institution.trim() ? [...eduEntries, edu] : eduEntries;
    const finalExp   = sectionIdx >= 2 && exp.company.trim()     ? [...expEntries, exp] : expEntries;
    const finalProj  = sectionIdx >= 3 && proj.title.trim()      ? [...projEntries, proj] : projEntries;
    const finalSkills = skills;
    const finalRes   = sectionIdx >= 5 && res.title.trim()       ? [...resEntries, res] : resEntries;

    try {
      const pid = profile?.id;
      if (pid) {
        // Save About & Contact info
        await supabase.from("profiles").update({
          headline,
          bio,
          phone: contact.phone || profile.phone,
          email: contact.email || profile.email,
          address: contact.address,
        }).eq("id", pid);

        if (finalEdu.length > 0) {
          await supabase.from("education").insert(finalEdu.map((e) => ({
            profile_id: pid, institution: e.institution, degree: e.degree,
            field: e.field, description: e.description,
            start_year: e.start_year ? Number(e.start_year) : null,
            end_year: e.end_year && e.end_year !== "Present" ? Number(e.end_year) : null,
          })));
        }
        if (finalExp.length > 0) {
          await supabase.from("experiences").insert(finalExp.map((e) => ({
            profile_id: pid, company: e.company, role: e.role,
            start_date: e.start_year ? `${e.start_year}-${String(MONTHS.indexOf(e.start_month) + 1).padStart(2, "0")}-01` : null,
            end_date: e.is_current || !e.end_year ? null : `${e.end_year}-${String(MONTHS.indexOf(e.end_month) + 1).padStart(2, "0")}-01`,
            is_current: e.is_current,
            description: e.description,
          })));
        }
        if (finalProj.length > 0) {
          await supabase.from("projects").insert(finalProj.map((p) => ({
            profile_id: pid, title: p.title, description: p.description,
            tech_stack: p.tech_stack, live_url: p.live_url || null, github_url: p.github_url || null,
          })));
        }
        if (finalSkills.length > 0) {
          await supabase.from("skills").insert(finalSkills.map((s) => ({ profile_id: pid, name: s })));
        }
        if (finalRes.length > 0) {
          await supabase.from("research").insert(finalRes.map((r) => ({
            profile_id: pid, title: r.title, subtitle: r.subtitle, description: r.description,
          })));
        }
      }
    } catch (err) {
      console.error("[Manual] Save error:", err);
    } finally {
      setSaving(false);
      setOnboardingStep("theme");
      router.push("/(onboarding)/theme");
    }
  };

  // ── Validation ──
  const isReviewStep  = (sectionIdx === 1 && stepIdx === 4) || (sectionIdx === 2 && stepIdx === 4) || (sectionIdx === 3 && stepIdx === 4) || (sectionIdx === 5 && stepIdx === 3);
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
        </View>
      );
      if (stepIdx === 1) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Tell us more" sub="A brief bio for your profile" />
          <GlassInput value={bio} onChangeText={setBio} placeholder="I love building products that people use every day…" accentColor={color} multiline autoFocus />
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
          <EntryCard
            label="Education"
            lines={[edu.institution, `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}`, `${edu.start_year}${edu.end_year ? ` – ${edu.end_year}` : ""}`]}
            accentColor={color}
            onEdit={() => transition("bwd", () => setStepIdx(0))}
          />
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
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={S.stepWrap}>
            <QuestionHeader section={sec} title="What were your big wins?" sub="Key achievements — or let AI write it" />
            <GlassInput value={exp.description} onChangeText={(v) => setExp({ ...exp, description: v })} placeholder="e.g. Led redesign of checkout flow, reducing drop-off by 32%…" accentColor={color} multiline />
            <AIBulletsPanel role={exp.role} company={exp.company} accentColor={color} onAddBullet={(b) => setExp((e) => ({ ...e, description: e.description ? `${e.description}\n• ${b}` : `• ${b}` }))} />
          </View>
        </ScrollView>
      );
      if (stepIdx === 4) return (
        <View style={S.stepWrap}>
          <QuestionHeader section={sec} title="Saved!" sub={`${exp.role} at ${exp.company}`} />
          <EntryCard
            label="Experience"
            lines={[exp.role, exp.company, exp.is_current ? `${exp.start_month} ${exp.start_year} – Present` : `${exp.start_month} ${exp.start_year} – ${exp.end_month} ${exp.end_year}`]}
            accentColor={color}
            onEdit={() => transition("bwd", () => setStepIdx(0))}
          />
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
        </View>
      );
      if (stepIdx === 2) return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={S.stepWrap}>
            <QuestionHeader section={sec} title="Tech stack?" sub="Tap everything you used — optional" />
            <TechTagGrid selected={proj.tech_stack} onChange={(v) => setProj({ ...proj, tech_stack: v })} accentColor={color} />
          </View>
        </ScrollView>
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
          <EntryCard
            label="Project"
            lines={[proj.title, proj.description, proj.tech_stack.slice(0, 4).join(" · ")]}
            accentColor={color}
            onEdit={() => transition("bwd", () => setStepIdx(0))}
          />
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
          <EntryCard
            label="Research"
            lines={[res.title, res.subtitle, res.description]}
            accentColor={color}
            onEdit={() => transition("bwd", () => setStepIdx(0))}
          />
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

          {/* ── Animated content ── */}
          <Animated.View style={[{ flex: 1 }, { opacity, transform: [{ translateX }] }]}>
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
