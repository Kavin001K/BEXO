import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type { ParsedResume } from "@/services/resumeParser";
import { sanitizeError } from "@/lib/errorUtils";

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year?: number | null;
  gpa?: string | null;
  description?: string | null;
}

export interface Research {
  id?: string;
  title: string;
  subtitle?: string | null;
  description: string;
  image_url?: string | null;
  file_url?: string | null;
}

export interface Experience {
  id?: string;
  company: string;
  role: string;
  start_date: string;
  end_date?: string | null;
  description: string;
  is_current: boolean;
}

export interface Project {
  id?: string;
  title: string;
  description: string;
  tech_stack: string[];
  live_url?: string | null;
  github_url?: string | null;
  image_url?: string | null;
}

export interface Skill {
  id?: string;
  name: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface Profile {
  id: string;
  user_id: string;
  handle: string;
  full_name: string;
  headline: string;
  bio: string;
  avatar_url?: string | null;
  location?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  resume_url?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_verified?: boolean;
  email_verified?: boolean;
  is_published: boolean;
  portfolio_theme: string;
  dob?: string | null;
  portfolio_font?: string | null;
  website_preference?: string | null;
  rebuild_preferences?: string | null;
  address?: string | null;
}

export interface CompletionResult {
  score: number;
  missingFields: MissingField[];
  isPassing: boolean;
}

export interface MissingField {
  key: string;
  label: string;
  type: "text" | "multiline" | "image" | "section";
  placeholder?: string;
}

interface ProfileState {
  profile: Profile | null;
  education: Education[];
  experiences: Experience[];
  projects: Project[];
  skills: Skill[];
  research: Research[];
  isLoading: boolean;
  onboardingStep: "email" | "photo" | "handle" | "dob" | "resume" | "manual" | "about" | "theme" | "font" | "preference" | "generating" | "completed";
  parsedResumeData: Partial<{
    full_name: string;
    headline: string;
    bio: string;
    education: Education[];
    experiences: Experience[];
    projects: Project[];
    skills: Skill[];
    research: Research[];
  }> | null;

  setProfile: (profile: Profile) => void;
  setOnboardingStep: (step: ProfileState["onboardingStep"]) => void;
  setParsedResumeData: (data: ProfileState["parsedResumeData"]) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  addEducation: (edu: Education) => void;
  addExperience: (exp: Experience) => void;
  addProject: (proj: Project) => void;
  addSkill: (skill: Skill) => void;
  setEducation: (edu: Education[]) => void;
  setExperiences: (exp: Experience[]) => void;
  setProjects: (proj: Project[]) => void;
  setSkills: (skills: Skill[]) => void;
  saveEducation: (edu: Education) => Promise<void>;
  deleteEducation: (id: string) => Promise<void>;
  saveExperience: (exp: Experience) => Promise<void>;
  deleteExperience: (id: string) => Promise<void>;
  saveProject: (proj: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  saveSkill: (skill: Skill) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  saveResearch: (res: Research) => Promise<void>;
  deleteResearch: (id: string) => Promise<void>;
  getCompletionResult: () => CompletionResult;

  // ─── New bulk methods ───
  bulkSaveEducation: (items: Education[]) => Promise<void>;
  bulkSaveExperiences: (items: Experience[]) => Promise<void>;
  bulkSaveProjects: (items: Project[]) => Promise<void>;
  bulkSaveSkills: (items: Skill[]) => Promise<void>;
  bulkSaveResearch: (items: Research[]) => Promise<void>;
  replaceAllDataFromResume: (parsed: ParsedResume, resumePath: string) => Promise<void>;
  mergeDataFromResume: (parsed: ParsedResume, resumePath: string) => Promise<void>;
  refreshFromDB: () => Promise<void>;
  reset: () => void;
}

/** Placeholder handle created server-side for phone OTP users (`verify-otp`). */
export function isBootstrapHandle(handle: string | undefined | null): boolean {
  return !!handle?.trim() && /^u[a-f0-9]{26}$/i.test(handle.trim());
}

/** Fixes stale `onboardingStep === "email"` after sign-out when profile already has real data. */
function reconcileOnboardingStep(
  p: Profile,
  current: ProfileState["onboardingStep"],
  eduCount: number,
  expCount: number,
): ProfileState["onboardingStep"] {
  const realEmail = !!(p.email?.trim() && !p.email.endsWith("@bexo.local"));
  const hasAvatar = !!p.avatar_url?.trim();
  const hasRealHandle = !!(p.handle?.trim() && !isBootstrapHandle(p.handle));

  if (current === "email" && realEmail && hasAvatar && hasRealHandle && p.dob) {
    if (eduCount + expCount > 0 || (p.headline?.trim() && p.bio?.trim())) {
      return "completed";
    }
    return "resume";
  }
  if (current === "email" && realEmail && hasAvatar && hasRealHandle) {
    return p.dob ? "resume" : "dob";
  }
  if (current === "email" && realEmail && hasAvatar) return "handle";
  if (current === "email" && realEmail) return "photo";

  return current;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
  profile: null,
  education: [],
  experiences: [],
  projects: [],
  skills: [],
  research: [],
  isLoading: false,
  onboardingStep: "email",
  parsedResumeData: null,

  setProfile: (profile) => set({ profile }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setParsedResumeData: (data) => set({ parsedResumeData: data }),

  setEducation: (education) => set({ education }),
  setExperiences: (experiences) => set({ experiences }),
  setProjects: (projects) => set({ projects }),
  setSkills: (skills) => set({ skills }),
  setResearch: (research: Research[]) => set({ research }),

  addEducation: (edu) => set((s) => ({ education: [...s.education, edu] })),
  addExperience: (exp) => set((s) => ({ experiences: [...s.experiences, exp] })),
  addProject: (proj) => set((s) => ({ projects: [...s.projects, proj] })),
  addSkill: (skill) => set((s) => ({ skills: [...s.skills, skill] })),

  getCompletionResult: (): CompletionResult => {
    const { profile, education, experiences, projects, skills } = get();
    const missing: MissingField[] = [];
    let score = 0;

    if (profile?.full_name?.trim()) { score += 15; }
    else { missing.push({ key: "full_name", label: "Full Name", type: "text", placeholder: "Your full name" }); }

    if (profile?.headline?.trim()) { score += 15; }
    else { missing.push({ key: "headline", label: "Headline", type: "text", placeholder: "A one-liner that defines you" }); }

    if (profile?.bio?.trim()) { score += 10; }
    else { missing.push({ key: "bio", label: "Bio", type: "multiline", placeholder: "Tell your story in 2-3 sentences..." }); }

    if (profile?.avatar_url?.trim()) { score += 10; }
    else { missing.push({ key: "avatar_url", label: "Profile Photo", type: "image" }); }

    if (profile?.location?.trim()) { score += 5; }
    else { missing.push({ key: "location", label: "Location", type: "text", placeholder: "City, Country" }); }

    if (education.length > 0) { score += 15; }
    else { missing.push({ key: "education", label: "Education", type: "section", placeholder: "Add at least one education entry" }); }

    if (experiences.length > 0) { score += 15; }
    else { missing.push({ key: "experience", label: "Experience", type: "section", placeholder: "Add at least one experience entry" }); }

    if (projects.length > 0) { score += 10; }
    else { missing.push({ key: "projects", label: "Projects", type: "section", placeholder: "Add at least one project" }); }

    if (skills.length >= 3) { score += 5; }
    else { missing.push({ key: "skills", label: "Skills", type: "section", placeholder: "Add at least 3 skills" }); }

    return { score, missingFields: missing, isPassing: score >= 80 };
  },

  fetchProfile: async (userId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        const [edu, exp, proj, skillsRes, resRes] = await Promise.all([
          supabase.from("education").select("*").eq("profile_id", data.id).order("start_year", { ascending: false }),
          supabase.from("experiences").select("*").eq("profile_id", data.id).order("start_date", { ascending: false }),
          supabase.from("projects").select("*").eq("profile_id", data.id),
          supabase.from("skills").select("*").eq("profile_id", data.id),
          supabase.from("research").select("*").eq("profile_id", data.id),
        ]);
        const eduCount = edu.data?.length ?? 0;
        const expCount = exp.data?.length ?? 0;
        const nextStep = reconcileOnboardingStep(data, get().onboardingStep, eduCount, expCount);
        set({
          profile: data,
          onboardingStep: nextStep,
          education:   edu.data   ?? [],
          experiences: exp.data   ?? [],
          projects:    proj.data  ?? [],
          skills:      skillsRes.data ?? [],
          research:    resRes.data ?? [],
          isLoading:   false,
        });
      } else {
        set({ profile: null, isLoading: false });
      }
    } catch (e: any) {
      console.error("[ProfileStore] fetchProfile error:", sanitizeError(e));
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ ...updates, user_id: user.id }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("[ProfileStore] updateProfile error:", error);
      throw error;
    }
    if (data) set({ profile: data });
  },

  saveEducation: async (edu) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      if (edu.id) {
        const { data, error } = await supabase.from("education").update(edu).eq("id", edu.id).select().single();
        if (error) throw error;
        if (data) set((s) => ({ education: s.education.map((e) => (e.id === edu.id ? data : e)) }));
      } else {
        const { data, error } = await supabase.from("education").insert({ ...edu, profile_id: profile.id }).select().single();
        if (error) throw error;
        if (data) set((s) => ({ education: [...s.education, data] }));
      }
    } catch (e: any) {
      console.error("[ProfileStore] saveEducation error:", sanitizeError(e));
      throw e;
    }
  },
  deleteEducation: async (id) => {
    await supabase.from("education").delete().eq("id", id);
    set((s) => ({ education: s.education.filter((e) => e.id !== id) }));
  },

  saveExperience: async (exp) => {
    const profile = get().profile;
    if (!profile) return;
    if (exp.id) {
      const { data } = await supabase.from("experiences").update(exp).eq("id", exp.id).select().single();
      if (data) set((s) => ({ experiences: s.experiences.map((e) => (e.id === exp.id ? data : e)) }));
    } else {
      const { data } = await supabase.from("experiences").insert({ ...exp, profile_id: profile.id }).select().single();
      if (data) set((s) => ({ experiences: [...s.experiences, data] }));
    }
  },
  deleteExperience: async (id) => {
    await supabase.from("experiences").delete().eq("id", id);
    set((s) => ({ experiences: s.experiences.filter((e) => e.id !== id) }));
  },

  saveProject: async (proj) => {
    const profile = get().profile;
    if (!profile) return;
    if (proj.id) {
      const { data } = await supabase.from("projects").update(proj).eq("id", proj.id).select().single();
      if (data) set((s) => ({ projects: s.projects.map((p) => (p.id === proj.id ? data : p)) }));
    } else {
      const { data } = await supabase.from("projects").insert({ ...proj, profile_id: profile.id }).select().single();
      if (data) set((s) => ({ projects: [...s.projects, data] }));
    }
  },
  deleteProject: async (id) => {
    await supabase.from("projects").delete().eq("id", id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  saveSkill: async (skill) => {
    const profile = get().profile;
    if (!profile) return;
    if (skill.id) {
      const { data } = await supabase.from("skills").update(skill).eq("id", skill.id).select().single();
      if (data) set((s) => ({ skills: s.skills.map((sk) => (sk.id === skill.id ? data : sk)) }));
    } else {
      const { data } = await supabase.from("skills").insert({ ...skill, profile_id: profile.id }).select().single();
      if (data) set((s) => ({ skills: [...s.skills, data] }));
    }
  },
  deleteSkill: async (id) => {
    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ skills: s.skills.filter((x) => x.id !== id) }));
  },

  saveResearch: async (res) => {
    const { profile } = get();
    if (!profile) return;
    const { error } = await supabase
      .from("research")
      .upsert({ ...res, profile_id: profile.id });
    if (error) throw error;
    await get().refreshFromDB();
  },

  deleteResearch: async (id) => {
    const { error } = await supabase.from("research").delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ research: s.research.filter((x) => x.id !== id) }));
  },

  bulkSaveResearch: async (items) => {
    const { profile } = get();
    if (!profile) return;
    const { error } = await supabase
      .from("research")
      .upsert(items.map((x) => ({ ...x, profile_id: profile.id })));
    if (error) throw error;
    await get().refreshFromDB();
  },

  // ─── New: Bulk save methods ───────────────────────────────────────────

  bulkSaveEducation: async (items) => {
    const profile = get().profile;
    if (!profile || items.length === 0) return;
    const rows = items.map(({ id, ...rest }) => ({ ...rest, profile_id: profile.id }));
    const { data, error } = await supabase.from("education").insert(rows).select();
    if (error) { console.error("[ProfileStore] bulkSaveEducation error:", error); throw error; }
    if (data) set((s) => ({ education: [...s.education, ...data] }));
  },

  bulkSaveExperiences: async (items) => {
    const profile = get().profile;
    if (!profile || items.length === 0) return;
    const rows = items.map(({ id, ...rest }) => ({ ...rest, profile_id: profile.id }));
    const { data, error } = await supabase.from("experiences").insert(rows).select();
    if (error) { console.error("[ProfileStore] bulkSaveExperiences error:", error); throw error; }
    if (data) set((s) => ({ experiences: [...s.experiences, ...data] }));
  },

  bulkSaveProjects: async (items) => {
    const profile = get().profile;
    if (!profile || items.length === 0) return;
    const rows = items.map(({ id, ...rest }) => ({ ...rest, profile_id: profile.id }));
    const { data, error } = await supabase.from("projects").insert(rows).select();
    if (error) { console.error("[ProfileStore] bulkSaveProjects error:", error); throw error; }
    if (data) set((s) => ({ projects: [...s.projects, ...data] }));
  },

  bulkSaveSkills: async (items) => {
    const profile = get().profile;
    if (!profile || items.length === 0) return;
    const rows = items.map(({ id, ...rest }) => ({ ...rest, profile_id: profile.id }));
    const { data, error } = await supabase.from("skills")
      .upsert(rows, { onConflict: "profile_id,name" })
      .select();
    if (error) {
      console.error("[ProfileStore] bulkSaveSkills error:", error);
      // Fallback: If constraint is missing, use simple insert
      if (error.code === "42P10") {
        const { data: insertData, error: insertError } = await supabase.from("skills").insert(rows).select();
        if (insertError) throw insertError;
        if (insertData) set((s) => ({ skills: [...s.skills, ...insertData] }));
        return;
      }
      throw error;
    }
    if (data) {
      // Merge with existing, replacing any with same name (deduplication)
      const existing = get().skills;
      const updatedNames = new Set(data.map(d => d.name));
      const filtered = existing.filter(s => !updatedNames.has(s.name));
      set({ skills: [...filtered, ...data] });
    }
  },

  /**
   * Replace all data: Delete existing records, insert new parsed data.
   */
  replaceAllDataFromResume: async (parsed, resumePath) => {
    const profile = get().profile;
    if (!profile) throw new Error("No profile loaded");
    const pid = profile.id;

    console.log("[ProfileStore] replaceAllData: Starting...");

    try {
      // 1. Update profile basic info
      const profileUpdates: any = { resume_url: resumePath };
      if (parsed.full_name) profileUpdates.full_name = parsed.full_name;
      if (parsed.headline)  profileUpdates.headline  = parsed.headline;
      if (parsed.bio)       profileUpdates.bio       = parsed.bio;
      if (parsed.email)       profileUpdates.email       = parsed.email;
      if (parsed.phone)       profileUpdates.phone       = parsed.phone;
      if (parsed.location)    profileUpdates.location    = parsed.location;
      if (parsed.website)     profileUpdates.website     = parsed.website;
      if (parsed.linkedin_url) profileUpdates.linkedin_url = parsed.linkedin_url;
      if (parsed.github_url)  profileUpdates.github_url  = parsed.github_url;

      await get().updateProfile(profileUpdates);

      // 2. Delete ALL existing sub-data
      console.log("[ProfileStore] replaceAllData: Deleting old records...");
      await Promise.all([
        supabase.from("education").delete().eq("profile_id", pid),
        supabase.from("experiences").delete().eq("profile_id", pid),
        supabase.from("projects").delete().eq("profile_id", pid),
        supabase.from("skills").delete().eq("profile_id", pid),
        supabase.from("research").delete().eq("profile_id", pid),
      ]);

      // 3. Insert NEW data using bulk helpers (to ensure local state sync)
      console.log("[ProfileStore] replaceAllData: Inserting new records...");
      
      // Clear local state first to be safe
      set({ education: [], experiences: [], projects: [], skills: [], research: [] });

      const tasks: Promise<any>[] = [];
      if (parsed.education?.length)   tasks.push(get().bulkSaveEducation(parsed.education));
      if (parsed.experiences?.length) tasks.push(get().bulkSaveExperiences(parsed.experiences));
      if (parsed.projects?.length)    tasks.push(get().bulkSaveProjects(parsed.projects));
      if (parsed.skills?.length)      tasks.push(get().bulkSaveSkills(parsed.skills));
      if (parsed.research?.length)    tasks.push(get().bulkSaveResearch(parsed.research));

      await Promise.all(tasks);

      console.log("[ProfileStore] replaceAllData: Complete.");
    } catch (e) {
      console.error("[ProfileStore] replaceAllData failed:", e);
      throw e;
    }
  },

  /**
   * Merge data: Only add missing records.
   */
  mergeDataFromResume: async (parsed, resumePath) => {
    const profile = get().profile;
    if (!profile) throw new Error("No profile loaded");

    console.log("[ProfileStore] mergeData: Starting smart merge...");

    try {
      // 1. Update profile — only fill in empty fields
      const profileUpdates: any = { resume_url: resumePath };
      if (parsed.full_name && !profile.full_name?.trim()) profileUpdates.full_name = parsed.full_name;
      if (parsed.headline  && !profile.headline?.trim())  profileUpdates.headline  = parsed.headline;
      if (parsed.bio       && !profile.bio?.trim())       profileUpdates.bio       = parsed.bio;
      if (parsed.email     && !profile.email?.trim())     profileUpdates.email     = parsed.email;
      if (parsed.phone     && !profile.phone?.trim())     profileUpdates.phone     = parsed.phone;
      if (parsed.location  && !profile.location?.trim())  profileUpdates.location  = parsed.location;
      if (parsed.website     && !profile.website?.trim())     profileUpdates.website     = parsed.website;
      if (parsed.linkedin_url && !profile.linkedin_url?.trim()) profileUpdates.linkedin_url = parsed.linkedin_url;
      if (parsed.github_url  && !profile.github_url?.trim())  profileUpdates.github_url  = parsed.github_url;

      if (Object.keys(profileUpdates).length > 1) { // more than just resume_url
        await get().updateProfile(profileUpdates);
      } else if (resumePath) {
        await get().updateProfile({ resume_url: resumePath });
      }

      // 2. Deduplicate and save new items
      const existingEdu = get().education;
      const newEdu = (parsed.education ?? []).filter(pe => {
        if (!pe.institution || !pe.degree) return false;
        return !existingEdu.some(ee =>
          ee.institution.toLowerCase().trim() === pe.institution.toLowerCase().trim() &&
          ee.degree.toLowerCase().trim() === pe.degree.toLowerCase().trim()
        );
      });

      const existingExp = get().experiences;
      const newExp = (parsed.experiences ?? []).filter(pe =>
        !existingExp.some(ee =>
          ee.company.toLowerCase().trim() === pe.company.toLowerCase().trim() &&
          ee.role.toLowerCase().trim() === pe.role.toLowerCase().trim()
        )
      );

      const existingProj = get().projects;
      const newProj = (parsed.projects ?? []).filter(pp =>
        !existingProj.some(ep =>
          ep.title.toLowerCase().trim() === pp.title.toLowerCase().trim()
        )
      );

      const existingRes = get().research;
      const newRes = (parsed.research ?? []).filter(pr =>
        !existingRes.some(er =>
          er.title.toLowerCase().trim() === pr.title.toLowerCase().trim()
        )
      );

      const tasks: Promise<any>[] = [];
      if (newEdu.length > 0)   tasks.push(get().bulkSaveEducation(newEdu));
      if (newExp.length > 0)   tasks.push(get().bulkSaveExperiences(newExp));
      if (newProj.length > 0)  tasks.push(get().bulkSaveProjects(newProj));
      if (newRes.length > 0)   tasks.push(get().bulkSaveResearch(newRes));
      if (parsed.skills?.length) tasks.push(get().bulkSaveSkills(parsed.skills)); // upsert handles skills

      await Promise.all(tasks);

      console.log("[ProfileStore] mergeData: Complete.");
    } catch (e) {
      console.error("[ProfileStore] mergeData failed:", e);
      throw e;
    }
  },

  /**
   * Re-fetch all data from DB to ensure local state is authoritative.
   */
  refreshFromDB: async () => {
    const { profile } = get();
    if (!profile) return;
    const [edu, exp, proj, sk, res] = await Promise.all([
      supabase.from("education").select("*").eq("profile_id", profile.id).order("start_year", { ascending: false }),
      supabase.from("experiences").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }),
      supabase.from("projects").select("*").eq("profile_id", profile.id),
      supabase.from("skills").select("*").eq("profile_id", profile.id),
      supabase.from("research").select("*").eq("profile_id", profile.id),
    ]);
    set({
      education: edu.data ?? [],
      experiences: exp.data ?? [],
      projects: proj.data ?? [],
      skills: sk.data ?? [],
      research: res.data ?? [],
    });
  },
  reset: () => set({
    profile: null,
    education: [],
    experiences: [],
    projects: [],
    skills: [],
    research: [],
    onboardingStep: "email",
    parsedResumeData: null,
    isLoading: false,
  }),
    }),
    {
      name: "bexo-profile-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboardingStep: state.onboardingStep,
        profile: state.profile,
        education: state.education,
        experiences: state.experiences,
        projects: state.projects,
        skills: state.skills,
        research: state.research,
      }),
    }
  )
);
