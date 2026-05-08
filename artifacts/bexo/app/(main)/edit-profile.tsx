import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useColors } from "@/hooks/useColors";
import { useProfileStore, type Education, type Experience, type Project } from "@/stores/useProfileStore";

type TabId = "profile" | "education" | "experience" | "projects";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
];

// ---- Empty state for each entry type ----

const EMPTY_EDUCATION: Education = {
  institution: "",
  degree: "",
  field: "",
  start_year: new Date().getFullYear(),
  end_year: null,
  gpa: "",
};

const EMPTY_EXPERIENCE: Experience = {
  company: "",
  role: "",
  start_date: "",
  end_date: "",
  description: "",
  is_current: false,
};

const EMPTY_PROJECT: Project = {
  title: "",
  description: "",
  tech_stack: [],
  live_url: "",
  github_url: "",
};

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, education, experiences, projects, updateProfile, saveEducation, deleteEducation, saveExperience, deleteExperience, saveProject, deleteProject } =
    useProfileStore();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [saving, setSaving] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? "",
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    website: profile?.website ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    github_url: profile?.github_url ?? "",
  });

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

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  // ---- Profile save ----
  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile(profileForm);
    setSaving(false);
    Alert.alert("Saved", "Profile updated.");
  };

  // ---- Education handlers ----
  const openAddEducation = () => {
    setEditingEduId(null);
    setEduForm(EMPTY_EDUCATION);
    setEduModalVisible(true);
  };
  const openEditEducation = (edu: Education) => {
    setEditingEduId(edu.id ?? null);
    setEduForm(edu);
    setEduModalVisible(true);
  };
  const handleSaveEducation = async () => {
    if (!eduForm.institution.trim() || !eduForm.degree.trim()) return;
    await saveEducation({ ...eduForm, id: editingEduId ?? undefined });
    setEduModalVisible(false);
  };
  const handleDeleteEducation = (id: string) => {
    Alert.alert("Delete", "Remove this education entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteEducation(id) },
    ]);
  };

  // ---- Experience handlers ----
  const openAddExperience = () => {
    setEditingExpId(null);
    setExpForm(EMPTY_EXPERIENCE);
    setExpModalVisible(true);
  };
  const openEditExperience = (exp: Experience) => {
    setEditingExpId(exp.id ?? null);
    setExpForm(exp);
    setExpModalVisible(true);
  };
  const handleSaveExperience = async () => {
    if (!expForm.company.trim() || !expForm.role.trim()) return;
    await saveExperience({ ...expForm, id: editingExpId ?? undefined });
    setExpModalVisible(false);
  };
  const handleDeleteExperience = (id: string) => {
    Alert.alert("Delete", "Remove this experience entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteExperience(id) },
    ]);
  };

  // ---- Project handlers ----
  const openAddProject = () => {
    setEditingProjId(null);
    setProjForm(EMPTY_PROJECT);
    setTechInput("");
    setProjModalVisible(true);
  };
  const openEditProject = (proj: Project) => {
    setEditingProjId(proj.id ?? null);
    setProjForm(proj);
    setTechInput(proj.tech_stack?.join(", ") ?? "");
    setProjModalVisible(true);
  };
  const handleSaveProject = async () => {
    if (!projForm.title.trim()) return;
    const tech_stack = techInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await saveProject({ ...projForm, id: editingProjId ?? undefined, tech_stack });
    setProjModalVisible(false);
  };
  const handleDeleteProject = (id: string) => {
    Alert.alert("Delete", "Remove this project?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteProject(id) },
    ]);
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.foreground,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.id ? colors.primary : colors.surface,
                  borderColor: activeTab === tab.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.id ? "#fff" : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab content */}
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ---- PROFILE TAB ---- */}
          {activeTab === "profile" && (
            <View style={styles.section}>
              {(
                [
                  { key: "full_name", label: "Full Name", placeholder: "Your full name", multiline: false },
                  { key: "headline", label: "Headline", placeholder: "A one-liner that defines you", multiline: false },
                  { key: "bio", label: "Bio", placeholder: "Tell your story...", multiline: true },
                  { key: "location", label: "Location", placeholder: "City, Country", multiline: false },
                  { key: "website", label: "Website", placeholder: "https://yoursite.com", multiline: false },
                  { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you", multiline: false },
                  { key: "github_url", label: "GitHub URL", placeholder: "https://github.com/you", multiline: false },
                ] as const
              ).map(({ key, label, placeholder, multiline }) => (
                <View style={styles.field} key={key}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      multiline && styles.textarea,
                      inputStyle,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={profileForm[key] as string}
                    onChangeText={(v) => setProfileForm((p) => ({ ...p, [key]: v }))}
                    multiline={multiline}
                    textAlignVertical={multiline ? "top" : "center"}
                    selectionColor={colors.primary}
                  />
                </View>
              ))}
              <BexoButton label={saving ? "Saving..." : "Save Profile"} onPress={handleSaveProfile} loading={saving} />
            </View>
          )}

          {/* ---- EDUCATION TAB ---- */}
          {activeTab === "education" && (
            <View style={styles.section}>
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
                    <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                      {edu.start_year} — {edu.end_year ?? "Present"}
                      {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => edu.id && handleDeleteEducation(edu.id)}
                  >
                    <Feather name="trash-2" size={16} color={colors.accent ?? "#FA6A6A"} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <BexoButton label="+ Add Education" onPress={openAddEducation} variant="secondary" />
            </View>
          )}

          {/* ---- EXPERIENCE TAB ---- */}
          {activeTab === "experience" && (
            <View style={styles.section}>
              {experiences.map((exp) => (
                <TouchableOpacity
                  key={exp.id}
                  style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openEditExperience(exp)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryTitle, { color: colors.foreground }]}>{exp.role}</Text>
                    <Text style={[styles.entrySub, { color: colors.primary }]}>{exp.company}</Text>
                    <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                      {exp.start_date} — {exp.is_current ? "Present" : exp.end_date ?? ""}
                    </Text>
                    {exp.description ? (
                      <Text style={[styles.entryDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {exp.description}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => exp.id && handleDeleteExperience(exp.id)}
                  >
                    <Feather name="trash-2" size={16} color={colors.accent ?? "#FA6A6A"} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <BexoButton label="+ Add Experience" onPress={openAddExperience} variant="secondary" />
            </View>
          )}

          {/* ---- PROJECTS TAB ---- */}
          {activeTab === "projects" && (
            <View style={styles.section}>
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
                    {proj.tech_stack.length > 0 && (
                      <Text style={[styles.entryDate, { color: colors.primary }]}>
                        {proj.tech_stack.join(" · ")}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => proj.id && handleDeleteProject(proj.id)}
                  >
                    <Feather name="trash-2" size={16} color={colors.accent ?? "#FA6A6A"} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <BexoButton label="+ Add Project" onPress={openAddProject} variant="secondary" />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ---- EDUCATION MODAL ---- */}
      <Modal visible={eduModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEduModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: topPad + 8 }]}>
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
            {(
              [
                { key: "institution", label: "Institution", placeholder: "University / School name" },
                { key: "degree", label: "Degree", placeholder: "e.g. Bachelor of Science" },
                { key: "field", label: "Field of Study", placeholder: "e.g. Computer Science" },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <View style={styles.field} key={key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={eduForm[key] as string}
                  onChangeText={(v) => setEduForm((f) => ({ ...f, [key]: v }))}
                  selectionColor={colors.primary}
                />
              </View>
            ))}
            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Start Year</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  placeholder="2020"
                  placeholderTextColor={colors.mutedForeground}
                  value={eduForm.start_year ? String(eduForm.start_year) : ""}
                  onChangeText={(v) => setEduForm((f) => ({ ...f, start_year: parseInt(v) || 0 }))}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>End Year</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  placeholder="2024"
                  placeholderTextColor={colors.mutedForeground}
                  value={eduForm.end_year ? String(eduForm.end_year) : ""}
                  onChangeText={(v) => {
                    const n = parseInt(v);
                    setEduForm((f) => ({ ...f, end_year: isNaN(n) ? null : n }));
                  }}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>GPA (optional)</Text>
              <TextInput
                style={[styles.input, inputStyle]}
                placeholder="e.g. 3.8"
                placeholderTextColor={colors.mutedForeground}
                value={eduForm.gpa ?? ""}
                onChangeText={(v) => setEduForm((f) => ({ ...f, gpa: v || null }))}
                selectionColor={colors.primary}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ---- EXPERIENCE MODAL ---- */}
      <Modal visible={expModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setExpModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: topPad + 8 }]}>
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
            {(
              [
                { key: "company", label: "Company", placeholder: "Company name" },
                { key: "role", label: "Role", placeholder: "e.g. Software Engineer Intern" },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <View style={styles.field} key={key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={expForm[key] as string}
                  onChangeText={(v) => setExpForm((f) => ({ ...f, [key]: v }))}
                  selectionColor={colors.primary}
                />
              </View>
            ))}
            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Start Date</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  placeholder="Jan 2023"
                  placeholderTextColor={colors.mutedForeground}
                  value={expForm.start_date}
                  onChangeText={(v) => setExpForm((f) => ({ ...f, start_date: v }))}
                  selectionColor={colors.primary}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>End Date</Text>
                <TextInput
                  style={[styles.input, expForm.is_current && styles.inputDisabled, inputStyle]}
                  placeholder="Dec 2023"
                  placeholderTextColor={colors.mutedForeground}
                  value={expForm.is_current ? "" : (expForm.end_date ?? "")}
                  onChangeText={(v) => setExpForm((f) => ({ ...f, end_date: v }))}
                  editable={!expForm.is_current}
                  selectionColor={colors.primary}
                />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Currently working here</Text>
              <Switch
                value={expForm.is_current}
                onValueChange={(v) => setExpForm((f) => ({ ...f, is_current: v, end_date: v ? null : f.end_date }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea, inputStyle]}
                placeholder="Describe your responsibilities and achievements..."
                placeholderTextColor={colors.mutedForeground}
                value={expForm.description}
                onChangeText={(v) => setExpForm((f) => ({ ...f, description: v }))}
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ---- PROJECT MODAL ---- */}
      <Modal visible={projModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProjModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: topPad + 8 }]}>
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
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title</Text>
              <TextInput
                style={[styles.input, inputStyle]}
                placeholder="Project name"
                placeholderTextColor={colors.mutedForeground}
                value={projForm.title}
                onChangeText={(v) => setProjForm((f) => ({ ...f, title: v }))}
                selectionColor={colors.primary}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea, inputStyle]}
                placeholder="What does this project do?"
                placeholderTextColor={colors.mutedForeground}
                value={projForm.description}
                onChangeText={(v) => setProjForm((f) => ({ ...f, description: v }))}
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tech Stack (comma-separated)</Text>
              <TextInput
                style={[styles.input, inputStyle]}
                placeholder="React, TypeScript, Node.js"
                placeholderTextColor={colors.mutedForeground}
                value={techInput}
                onChangeText={setTechInput}
                selectionColor={colors.primary}
              />
            </View>
            {(
              [
                { key: "live_url", label: "Live URL", placeholder: "https://..." },
                { key: "github_url", label: "GitHub URL", placeholder: "https://github.com/..." },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <View style={styles.field} key={key}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={(projForm[key] as string) ?? ""}
                  onChangeText={(v) => setProjForm((f) => ({ ...f, [key]: v || null }))}
                  autoCapitalize="none"
                  selectionColor={colors.primary}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  tabs: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  scroll: { paddingHorizontal: 20, gap: 12 },
  section: { gap: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  textarea: { minHeight: 100 },
  inputDisabled: { opacity: 0.4 },
  rowFields: { flexDirection: "row", gap: 10 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 14, fontWeight: "500" },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  entryTitle: { fontSize: 15, fontWeight: "600" },
  entrySub: { fontSize: 13 },
  entryDate: { fontSize: 12, marginTop: 2 },
  entryDesc: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  // Modal styles
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalSave: { fontSize: 15, fontWeight: "600" },
  modalContent: { padding: 20, gap: 14 },
});
