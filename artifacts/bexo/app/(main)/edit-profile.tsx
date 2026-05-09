import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { LocationInput } from "@/components/ui/LocationInput";
import { useColors } from "@/hooks/useColors";
import { uploadAndParseResume, uploadAvatar } from "@/services/resumeParser";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useProfileStore,
  type Education,
  type Experience,
  type Project,
  type Skill,
} from "@/stores/useProfileStore";

type TabId = "profile" | "education" | "experience" | "projects" | "skills";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "profile",    label: "Profile",    icon: "user"       },
  { id: "education",  label: "Education",  icon: "book"       },
  { id: "experience", label: "Experience", icon: "briefcase"  },
  { id: "projects",   label: "Projects",   icon: "code"       },
  { id: "skills",     label: "Skills",     icon: "zap"        },
];

const SKILL_LEVELS: Skill["level"][] = ["beginner", "intermediate", "advanced", "expert"];

const EMPTY_EDUCATION: Education = {
  institution: "", degree: "", field: "",
  start_year: new Date().getFullYear(), end_year: null, gpa: "",
};
const EMPTY_EXPERIENCE: Experience = {
  company: "", role: "", start_date: "", end_date: "", description: "", is_current: false,
};
const EMPTY_PROJECT: Project = {
  title: "", description: "", tech_stack: [], live_url: "", github_url: "",
};
const EMPTY_SKILL: Skill = {
  name: "", category: "Technical", level: "intermediate",
};

const SKILL_CATEGORIES = [
  "Programming Languages", "Frameworks", "Tools", "Databases",
  "Cloud", "Design", "Soft Skills", "Other",
];

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const {
    profile, education, experiences, projects, skills,
    updateProfile, saveEducation, deleteEducation,
    saveExperience, deleteExperience, saveProject, deleteProject,
    saveSkill, deleteSkill,
    setEducation, setExperiences, setProjects, setSkills,
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name:    profile?.full_name    ?? "",
    headline:     profile?.headline     ?? "",
    bio:          profile?.bio          ?? "",
    location:     profile?.location     ?? "",
    website:      profile?.website      ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    github_url:   profile?.github_url   ?? "",
    email:        profile?.email        ?? "",
  });

  // Avatar state
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Resume state
  const [resumeFile, setResumeFile] = useState<{ name: string; uri: string } | null>(null);
  const [parsingResume, setParsingResume] = useState(false);
  const [resumeParsed, setResumeParsed] = useState(false);

  // Education modal
  const [eduModalVisible, setEduModalVisible] = useState(false);
  const [eduForm, setEduForm] = useState<Education>(EMPTY_EDUCATION);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);

  // Experience modal
  const [expModalVisible, setExpModalVisible] = useState(false);
  const [expForm, setExpForm] = useState<Experience>(EMPTY_EXPERIENCE);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);

  // Project modal
  const [projModalVisible, setProjModalVisible] = useState(false);
  const [projForm, setProjForm] = useState<Project>(EMPTY_PROJECT);
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [techInput, setTechInput] = useState("");

  // Skill modal
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [skillForm, setSkillForm] = useState<Skill>(EMPTY_SKILL);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync form when profile loads
  React.useEffect(() => {
    if (profile && !isInitialized) {
      setProfileForm({
        full_name:    profile.full_name    ?? "",
        headline:     profile.headline     ?? "",
        bio:          profile.bio          ?? "",
        location:     profile.location     ?? "",
        website:      profile.website      ?? "",
        linkedin_url: profile.linkedin_url ?? "",
        github_url:   profile.github_url   ?? "",
        email:        profile.email        ?? "",
      });
      setIsInitialized(true);
    }
  }, [profile, isInitialized]);

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor:     colors.border,
    color:           colors.foreground,
  };

  // ---- Avatar ----
  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Allow photo library access to change your photo.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    setUploadingAvatar(true);
    try {
      if (!user?.id) throw new Error("Not authenticated");
      const url = await uploadAvatar(uri, user.id);
      await updateProfile({ avatar_url: url });
      setAvatarUri(uri);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ---- Resume ----
  const handlePickResume = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setResumeFile({ name: res.assets[0].name, uri: res.assets[0].uri });
    setResumeParsed(false);
  };

  const handleParseResume = async () => {
    if (!resumeFile || !user?.id) return;
    setParsingResume(true);
    try {
      const { resumeUrl, parsed } = await uploadAndParseResume(
        resumeFile.uri, resumeFile.name, user.id
      );
      await updateProfile({ resume_url: resumeUrl });
      if (parsed.full_name)  setProfileForm((f) => ({ ...f, full_name: parsed.full_name! }));
      if (parsed.headline)   setProfileForm((f) => ({ ...f, headline: parsed.headline! }));
      if (parsed.bio)        setProfileForm((f) => ({ ...f, bio: parsed.bio! }));
      if (parsed.location)   setProfileForm((f) => ({ ...f, location: parsed.location ?? f.location }));
      if (parsed.github_url) setProfileForm((f) => ({ ...f, github_url: parsed.github_url ?? f.github_url }));
      if (parsed.linkedin_url) setProfileForm((f) => ({ ...f, linkedin_url: parsed.linkedin_url ?? f.linkedin_url }));
      if (parsed.education?.length)   setEducation(parsed.education);
      if (parsed.experiences?.length) setExperiences(parsed.experiences);
      if (parsed.projects?.length)    setProjects(parsed.projects);
      if (parsed.skills?.length)      setSkills(parsed.skills);
      setResumeParsed(true);
      Alert.alert("Done!", "Resume parsed. Review the auto-filled data and save.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to parse resume");
    } finally {
      setParsingResume(false);
    }
  };

  // ---- Profile ----
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profileForm);
      Alert.alert("Saved", "Profile updated successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ---- Education ----
  const openAddEducation    = () => { setEditingEduId(null); setEduForm(EMPTY_EDUCATION); setEduModalVisible(true); };
  const openEditEducation   = (e: Education) => { setEditingEduId(e.id ?? null); setEduForm(e); setEduModalVisible(true); };
  const handleSaveEducation = async () => {
    if (!eduForm.institution.trim() || !eduForm.degree.trim()) return;
    await saveEducation({ ...eduForm, id: editingEduId ?? undefined });
    setEduModalVisible(false);
  };
  const handleDeleteEducation = (id: string) => Alert.alert("Delete", "Remove this education?", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteEducation(id) },
  ]);

  // ---- Experience ----
  const openAddExperience    = () => { setEditingExpId(null); setExpForm(EMPTY_EXPERIENCE); setExpModalVisible(true); };
  const openEditExperience   = (e: Experience) => { setEditingExpId(e.id ?? null); setExpForm(e); setExpModalVisible(true); };
  const handleSaveExperience = async () => {
    if (!expForm.company.trim() || !expForm.role.trim()) return;
    await saveExperience({ ...expForm, id: editingExpId ?? undefined });
    setExpModalVisible(false);
  };
  const handleDeleteExperience = (id: string) => Alert.alert("Delete", "Remove this experience?", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteExperience(id) },
  ]);

  // ---- Project ----
  const openAddProject    = () => { setEditingProjId(null); setProjForm(EMPTY_PROJECT); setTechInput(""); setProjModalVisible(true); };
  const openEditProject   = (p: Project) => { setEditingProjId(p.id ?? null); setProjForm(p); setTechInput(p.tech_stack?.join(", ") ?? ""); setProjModalVisible(true); };
  const handleSaveProject = async () => {
    if (!projForm.title.trim()) return;
    const tech_stack = techInput.split(",").map((t) => t.trim()).filter(Boolean);
    await saveProject({ ...projForm, id: editingProjId ?? undefined, tech_stack });
    setProjModalVisible(false);
  };
  const handleDeleteProject = (id: string) => Alert.alert("Delete", "Remove this project?", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteProject(id) },
  ]);

  // ---- Skill ----
  const openAddSkill    = () => { setEditingSkillId(null); setSkillForm(EMPTY_SKILL); setSkillModalVisible(true); };
  const openEditSkill   = (s: Skill) => { setEditingSkillId(s.id ?? null); setSkillForm(s); setSkillModalVisible(true); };
  const handleSaveSkill = async () => {
    if (!skillForm.name.trim()) return;
    await saveSkill({ ...skillForm, id: editingSkillId ?? undefined });
    setSkillModalVisible(false);
  };
  const handleDeleteSkill = (id: string) => Alert.alert("Delete", "Remove this skill?", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => deleteSkill(id) },
  ]);

  const avatarSource = avatarUri ?? profile?.avatar_url ?? null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: topPad + 8, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabs, { borderBottomColor: colors.border }]}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && { borderBottomColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Feather
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.id ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.id ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ---- PROFILE ---- */}
          {activeTab === "profile" && (
            <View style={styles.section}>
              {/* Avatar */}
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
                  <View
                    style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                  >
                    {avatarSource ? (
                      <Image source={{ uri: avatarSource }} style={styles.avatarImg} />
                    ) : (
                      <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                        {profile?.full_name?.[0]?.toUpperCase() ?? "B"}
                      </Text>
                    )}
                    <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
                      {uploadingAvatar ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Feather name="camera" size={12} color="#fff" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                <View>
                  <Text style={[styles.avatarLabel, { color: colors.foreground }]}>
                    Profile Photo
                  </Text>
                  <Text style={[styles.avatarSub, { color: colors.mutedForeground }]}>
                    Tap the circle to change
                  </Text>
                </View>
              </View>

              {/* Resume upload */}
              <View
                style={[styles.resumeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <LinearGradient
                  colors={["#6AFAD011", "transparent"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                <View style={styles.resumeTop}>
                  <View style={[styles.resumeIcon, { backgroundColor: "#6AFAD022" }]}>
                    <Feather name="file-text" size={18} color="#6AFAD0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resumeTitle, { color: colors.foreground }]}>
                      {profile?.resume_url ? "Resume uploaded" : "Upload Resume"}
                    </Text>
                    <Text style={[styles.resumeSub, { color: colors.mutedForeground }]}>
                      {resumeFile
                        ? resumeFile.name
                        : profile?.resume_url
                        ? "AI will re-parse if you upload a new one"
                        : "AI will auto-fill your profile from PDF"}
                    </Text>
                  </View>
                  {resumeParsed && (
                    <View style={styles.parsedBadge}>
                      <Feather name="check-circle" size={14} color="#6AFAD0" />
                    </View>
                  )}
                </View>
                <View style={styles.resumeBtns}>
                  <TouchableOpacity
                    style={[styles.resumeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={handlePickResume}
                  >
                    <Feather name="upload" size={13} color={colors.primary} />
                    <Text style={[styles.resumeBtnLabel, { color: colors.primary }]}>
                      Choose PDF
                    </Text>
                  </TouchableOpacity>
                  {resumeFile && !resumeParsed && (
                    <TouchableOpacity
                      style={[styles.resumeBtn, { backgroundColor: "#6AFAD022", borderColor: "#6AFAD044" }]}
                      onPress={handleParseResume}
                      disabled={parsingResume}
                    >
                      {parsingResume ? (
                        <ActivityIndicator size="small" color="#6AFAD0" />
                      ) : (
                        <Feather name="cpu" size={13} color="#6AFAD0" />
                      )}
                      <Text style={[styles.resumeBtnLabel, { color: "#6AFAD0" }]}>
                        {parsingResume ? "Parsing…" : "Parse with AI"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Text fields */}
              {([
                  { key: "full_name",    label: "Full Name",    placeholder: "Your full name",                    multiline: false },
                  { key: "headline",     label: "Headline",     placeholder: "A one-liner that defines you",       multiline: false },
                  { key: "bio",          label: "Bio",          placeholder: "Tell your story...",                 multiline: true  },
                  { key: "email",        label: "Email",        placeholder: "hello@you.com",                     multiline: false },
                  { key: "website",      label: "Website",      placeholder: "https://yoursite.com",              multiline: false },
                  { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you",        multiline: false },
                  { key: "github_url",   label: "GitHub URL",   placeholder: "https://github.com/you",            multiline: false },
                ] as const
              ).map(({ key, label, placeholder, multiline }) => (
                <View style={styles.field} key={key}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    style={[styles.input, multiline && styles.textarea, inputStyle]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={profileForm[key] as string}
                    onChangeText={(v) => setProfileForm((p) => ({ ...p, [key]: v }))}
                    multiline={multiline}
                    textAlignVertical={multiline ? "top" : "center"}
                    selectionColor={colors.primary}
                    autoCapitalize={key === "email" || key.includes("url") ? "none" : "words"}
                    keyboardType={key === "email" ? "email-address" : "default"}
                  />
                </View>
              ))}

              {/* Location with autocomplete */}
              <View style={[styles.field, { zIndex: 100 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Location</Text>
                <LocationInput
                  value={profileForm.location}
                  onChangeText={(v) => setProfileForm((p) => ({ ...p, location: v }))}
                  placeholder="City, Country"
                />
              </View>
              <BexoButton
                label={saving ? "Saving…" : "Save Profile"}
                onPress={handleSaveProfile}
                loading={saving}
              />
            </View>
          )}

          {/* ---- EDUCATION ---- */}
          {activeTab === "education" && (
            <View style={styles.section}>
              {education.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="book" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No education added yet
                  </Text>
                </View>
              )}
              {education.map((edu) => (
                <TouchableOpacity
                  key={edu.id}
                  style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openEditEducation(edu)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryTitle, { color: colors.foreground }]}>{edu.institution}</Text>
                    <Text style={[styles.entrySub, { color: colors.mutedForeground }]}>
                      {edu.degree} in {edu.field}
                    </Text>
                    <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
                      {edu.start_year} — {edu.end_year ?? "Present"}{edu.gpa ? ` · GPA ${edu.gpa}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => edu.id && handleDeleteEducation(edu.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={15} color="#FA6A6A" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <BexoButton label="+ Add Education" onPress={openAddEducation} variant="secondary" />
            </View>
          )}

          {/* ---- EXPERIENCE ---- */}
          {activeTab === "experience" && (
            <View style={styles.section}>
              {experiences.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="briefcase" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No experience added yet
                  </Text>
                </View>
              )}
              {experiences.map((exp) => (
                <TouchableOpacity
                  key={exp.id}
                  style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openEditExperience(exp)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryTitle, { color: colors.foreground }]}>{exp.role}</Text>
                    <Text style={[styles.entrySub, { color: colors.primary }]}>{exp.company}</Text>
                    <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
                      {exp.start_date} — {exp.is_current ? "Present" : exp.end_date ?? ""}
                    </Text>
                    {exp.description ? (
                      <Text style={[styles.entryDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {exp.description}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => exp.id && handleDeleteExperience(exp.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={15} color="#FA6A6A" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <BexoButton label="+ Add Experience" onPress={openAddExperience} variant="secondary" />
            </View>
          )}

          {/* ---- PROJECTS ---- */}
          {activeTab === "projects" && (
            <View style={styles.section}>
              {projects.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="code" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No projects added yet
                  </Text>
                </View>
              )}
              {projects.map((proj) => (
                <TouchableOpacity
                  key={proj.id}
                  style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openEditProject(proj)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryTitle, { color: colors.foreground }]}>{proj.title}</Text>
                    {proj.description ? (
                      <Text style={[styles.entryDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {proj.description}
                      </Text>
                    ) : null}
                    {proj.tech_stack?.length > 0 && (
                      <Text style={[styles.entryMeta, { color: colors.primary }]}>
                        {proj.tech_stack.join(" · ")}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => proj.id && handleDeleteProject(proj.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={15} color="#FA6A6A" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <BexoButton label="+ Add Project" onPress={openAddProject} variant="secondary" />
            </View>
          )}

          {/* ---- SKILLS ---- */}
          {activeTab === "skills" && (
            <View style={styles.section}>
              {skills.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="zap" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No skills added yet
                  </Text>
                </View>
              )}
              <View style={styles.skillGrid}>
                {skills.map((sk) => (
                  <TouchableOpacity
                    key={sk.id}
                    style={[styles.skillChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => openEditSkill(sk)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.skillName, { color: colors.foreground }]}>{sk.name}</Text>
                      <Text style={[styles.skillLevel, { color: colors.primary }]}>{sk.level}</Text>
                    </View>
                    <TouchableOpacity onPress={() => sk.id && handleDeleteSkill(sk.id)}>
                      <Feather name="x" size={14} color="#FA6A6A" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
              <BexoButton label="+ Add Skill" onPress={openAddSkill} variant="secondary" />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ---- EDUCATION MODAL ---- */}
      <Modal visible={eduModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEduModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEduModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingEduId ? "Edit Education" : "Add Education"}
            </Text>
            <TouchableOpacity onPress={handleSaveEducation}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {([ { key: "institution", label: "Institution", placeholder: "University / School" },
                 { key: "degree",      label: "Degree",      placeholder: "e.g. Bachelor of Science" },
                 { key: "field",       label: "Field",       placeholder: "e.g. Computer Science" } ] as const
            ).map(({ key, label, placeholder }) => (
              <View style={styles.field} key={key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={eduForm[key] as string} onChangeText={(v) => setEduForm((f) => ({ ...f, [key]: v }))}
                  selectionColor={colors.primary} />
              </View>
            ))}
            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Start Year</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder="2020"
                  placeholderTextColor={colors.mutedForeground}
                  value={eduForm.start_year ? String(eduForm.start_year) : ""}
                  onChangeText={(v) => setEduForm((f) => ({ ...f, start_year: parseInt(v) || 0 }))}
                  keyboardType="numeric" selectionColor={colors.primary} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>End Year</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder="2024"
                  placeholderTextColor={colors.mutedForeground}
                  value={eduForm.end_year ? String(eduForm.end_year) : ""}
                  onChangeText={(v) => { const n = parseInt(v); setEduForm((f) => ({ ...f, end_year: isNaN(n) ? null : n })); }}
                  keyboardType="numeric" selectionColor={colors.primary} />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>GPA (optional)</Text>
              <TextInput style={[styles.input, inputStyle]} placeholder="e.g. 3.8"
                placeholderTextColor={colors.mutedForeground} value={eduForm.gpa ?? ""}
                onChangeText={(v) => setEduForm((f) => ({ ...f, gpa: v || null }))} selectionColor={colors.primary} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ---- EXPERIENCE MODAL ---- */}
      <Modal visible={expModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setExpModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setExpModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingExpId ? "Edit Experience" : "Add Experience"}
            </Text>
            <TouchableOpacity onPress={handleSaveExperience}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {([ { key: "company", label: "Company", placeholder: "Company name" },
                 { key: "role",    label: "Role",    placeholder: "e.g. Software Engineer Intern" } ] as const
            ).map(({ key, label, placeholder }) => (
              <View style={styles.field} key={key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={expForm[key] as string} onChangeText={(v) => setExpForm((f) => ({ ...f, [key]: v }))}
                  selectionColor={colors.primary} />
              </View>
            ))}
            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Start Date</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder="Jan 2023"
                  placeholderTextColor={colors.mutedForeground} value={expForm.start_date}
                  onChangeText={(v) => setExpForm((f) => ({ ...f, start_date: v }))} selectionColor={colors.primary} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>End Date</Text>
                <TextInput style={[styles.input, expForm.is_current && styles.inputDisabled, inputStyle]}
                  placeholder="Dec 2023" placeholderTextColor={colors.mutedForeground}
                  value={expForm.is_current ? "" : (expForm.end_date ?? "")}
                  onChangeText={(v) => setExpForm((f) => ({ ...f, end_date: v }))}
                  editable={!expForm.is_current} selectionColor={colors.primary} />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Currently working here</Text>
              <Switch value={expForm.is_current}
                onValueChange={(v) => setExpForm((f) => ({ ...f, is_current: v, end_date: v ? null : f.end_date }))}
                trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput style={[styles.input, styles.textarea, inputStyle]}
                placeholder="Responsibilities and achievements..." placeholderTextColor={colors.mutedForeground}
                value={expForm.description} onChangeText={(v) => setExpForm((f) => ({ ...f, description: v }))}
                multiline textAlignVertical="top" selectionColor={colors.primary} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ---- PROJECT MODAL ---- */}
      <Modal visible={projModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProjModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setProjModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingProjId ? "Edit Project" : "Add Project"}
            </Text>
            <TouchableOpacity onPress={handleSaveProject}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Project Name *</Text>
              <TextInput style={[styles.input, inputStyle]} placeholder="My Awesome App"
                placeholderTextColor={colors.mutedForeground} value={projForm.title}
                onChangeText={(v) => setProjForm((f) => ({ ...f, title: v }))} selectionColor={colors.primary} />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput style={[styles.input, styles.textarea, inputStyle]}
                placeholder="What does it do? What was your role?" placeholderTextColor={colors.mutedForeground}
                value={projForm.description} onChangeText={(v) => setProjForm((f) => ({ ...f, description: v }))}
                multiline textAlignVertical="top" selectionColor={colors.primary} />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tech Stack (comma-separated)</Text>
              <TextInput style={[styles.input, inputStyle]} placeholder="React, Node.js, PostgreSQL"
                placeholderTextColor={colors.mutedForeground} value={techInput}
                onChangeText={setTechInput} autoCapitalize="none" selectionColor={colors.primary} />
            </View>
            {([ { key: "live_url",   label: "Live URL",   placeholder: "https://..." },
                 { key: "github_url", label: "GitHub URL", placeholder: "https://github.com/..." } ] as const
            ).map(({ key, label, placeholder }) => (
              <View style={styles.field} key={key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground} value={(projForm[key] as string) ?? ""}
                  onChangeText={(v) => setProjForm((f) => ({ ...f, [key]: v || null }))}
                  autoCapitalize="none" selectionColor={colors.primary} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ---- SKILL MODAL ---- */}
      <Modal visible={skillModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSkillModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSkillModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingSkillId ? "Edit Skill" : "Add Skill"}
            </Text>
            <TouchableOpacity onPress={handleSaveSkill}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Skill Name *</Text>
              <TextInput style={[styles.input, inputStyle]} placeholder="e.g. React Native"
                placeholderTextColor={colors.mutedForeground} value={skillForm.name}
                onChangeText={(v) => setSkillForm((f) => ({ ...f, name: v }))} selectionColor={colors.primary} />
            </View>

            {/* Category picker */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerTrigger, inputStyle]}
                onPress={() => setShowCatPicker(true)}
              >
                <Text style={{ color: colors.foreground, fontSize: 15 }}>{skillForm.category}</Text>
                <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {showCatPicker && (
              <View style={[styles.catList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {SKILL_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catItem, cat === skillForm.category && { backgroundColor: colors.primary + "22" }]}
                    onPress={() => { setSkillForm((f) => ({ ...f, category: cat })); setShowCatPicker(false); }}
                  >
                    <Text style={[styles.catLabel, { color: cat === skillForm.category ? colors.primary : colors.foreground }]}>
                      {cat}
                    </Text>
                    {cat === skillForm.category && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Level picker */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Level</Text>
              <View style={styles.levelRow}>
                {SKILL_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.levelBtn,
                      {
                        backgroundColor: skillForm.level === lvl ? colors.primary : colors.surface,
                        borderColor: skillForm.level === lvl ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSkillForm((f) => ({ ...f, level: lvl }))}
                  >
                    <Text
                      style={[
                        styles.levelLabel,
                        { color: skillForm.level === lvl ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  tabs: {
    paddingHorizontal: 16, gap: 0, borderBottomWidth: 1, flexDirection: "row",
  },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
  section: { gap: 12 },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2,
    alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarInitial: { fontSize: 28, fontWeight: "800" },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  avatarLabel: { fontSize: 15, fontWeight: "600" },
  avatarSub: { fontSize: 12, marginTop: 2 },
  resumeCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, overflow: "hidden",
  },
  resumeTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  resumeIcon: {
    width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  resumeTitle: { fontSize: 14, fontWeight: "700" },
  resumeSub: { fontSize: 12, marginTop: 1 },
  parsedBadge: { width: 24, alignItems: "center" },
  resumeBtns: { flexDirection: "row", gap: 8 },
  resumeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  resumeBtnLabel: { fontSize: 12, fontWeight: "600" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  inputDisabled: { opacity: 0.4 },
  rowFields: { flexDirection: "row", gap: 10 },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4,
  },
  switchLabel: { fontSize: 14, fontWeight: "500" },
  emptyState: {
    alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, gap: 10,
  },
  emptyText: { fontSize: 13 },
  entryCard: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, gap: 10,
  },
  entryTitle: { fontSize: 15, fontWeight: "600" },
  entrySub: { fontSize: 13 },
  entryMeta: { fontSize: 12, marginTop: 2 },
  entryDesc: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  skillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  skillName: { fontSize: 13, fontWeight: "600" },
  skillLevel: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  pickerTrigger: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  catList: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
  },
  catItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  catLabel: { fontSize: 14, fontWeight: "500" },
  levelRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  levelBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
  },
  levelLabel: { fontSize: 12, fontWeight: "600" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalSave: { fontSize: 15, fontWeight: "600" },
  modalContent: { padding: 20, gap: 14 },
});
