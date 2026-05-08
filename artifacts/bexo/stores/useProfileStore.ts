import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year?: number | null;
  gpa?: string | null;
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
  is_published: boolean;
  portfolio_theme: string;
}

interface ProfileState {
  profile: Profile | null;
  education: Education[];
  experiences: Experience[];
  projects: Project[];
  skills: Skill[];
  isLoading: boolean;
  onboardingStep: "handle" | "resume" | "photo" | "cards" | "generating" | "done";
  parsedResumeData: Partial<{
    full_name: string;
    headline: string;
    bio: string;
    education: Education[];
    experiences: Experience[];
    projects: Project[];
    skills: Skill[];
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
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  education: [],
  experiences: [],
  projects: [],
  skills: [],
  isLoading: false,
  onboardingStep: "handle",
  parsedResumeData: null,

  setProfile: (profile) => set({ profile }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setParsedResumeData: (data) => set({ parsedResumeData: data }),

  setEducation: (education) => set({ education }),
  setExperiences: (experiences) => set({ experiences }),
  setProjects: (projects) => set({ projects }),
  setSkills: (skills) => set({ skills }),

  addEducation: (edu) =>
    set((s) => ({ education: [...s.education, edu] })),
  addExperience: (exp) =>
    set((s) => ({ experiences: [...s.experiences, exp] })),
  addProject: (proj) =>
    set((s) => ({ projects: [...s.projects, proj] })),
  addSkill: (skill) =>
    set((s) => ({ skills: [...s.skills, skill] })),

  saveEducation: async (edu) => {
    const profile = get().profile;
    if (!profile) return;
    if (edu.id) {
      const { data } = await supabase
        .from("education")
        .update(edu)
        .eq("id", edu.id)
        .select()
        .single();
      if (data) set((s) => ({ education: s.education.map((e) => (e.id === edu.id ? data : e)) }));
    } else {
      const { data } = await supabase
        .from("education")
        .insert({ ...edu, profile_id: profile.id })
        .select()
        .single();
      if (data) set((s) => ({ education: [...s.education, data] }));
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
      const { data } = await supabase
        .from("experiences")
        .update(exp)
        .eq("id", exp.id)
        .select()
        .single();
      if (data) set((s) => ({ experiences: s.experiences.map((e) => (e.id === exp.id ? data : e)) }));
    } else {
      const { data } = await supabase
        .from("experiences")
        .insert({ ...exp, profile_id: profile.id })
        .select()
        .single();
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
      const { data } = await supabase
        .from("projects")
        .update(proj)
        .eq("id", proj.id)
        .select()
        .single();
      if (data) set((s) => ({ projects: s.projects.map((p) => (p.id === proj.id ? data : p)) }));
    } else {
      const { data } = await supabase
        .from("projects")
        .insert({ ...proj, profile_id: profile.id })
        .select()
        .single();
      if (data) set((s) => ({ projects: [...s.projects, data] }));
    }
  },
  deleteProject: async (id) => {
    await supabase.from("projects").delete().eq("id", id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  fetchProfile: async (userId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      set({ profile: data, onboardingStep: "done" });
      const [edu, exp, proj, skills] = await Promise.all([
        supabase.from("education").select("*").eq("profile_id", data.id),
        supabase.from("experiences").select("*").eq("profile_id", data.id),
        supabase.from("projects").select("*").eq("profile_id", data.id),
        supabase.from("skills").select("*").eq("profile_id", data.id),
      ]);
      set({
        education: edu.data ?? [],
        experiences: exp.data ?? [],
        projects: proj.data ?? [],
        skills: skills.data ?? [],
      });
    }
    set({ isLoading: false });
  },

  updateProfile: async (updates) => {
    const profile = get().profile;
    if (!profile) return;
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .select()
      .single();
    if (data) set({ profile: data });
  },
}));
