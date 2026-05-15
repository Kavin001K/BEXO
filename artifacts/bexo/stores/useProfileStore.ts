import { randomUUID } from "expo-crypto";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { createEncryptedJSONStorage } from "@/lib/zustandEncryptedStorage";
import type { ParsedResume } from "@/services/resumeParser";
import { sanitizeError } from "@/lib/errorUtils";
import { validateProfileFieldPatch } from "@/lib/profileFields";

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
  /** Public portfolio visibility (mirrors product UI; map to DB if column exists). */
  is_public?: boolean | null;
  notifications_enabled?: boolean | null;
  portfolio_theme: string;
  /** Card color palette slug (midnight, ocean, …). */
  identity_card_palette?: string | null;
  /** Card layout: standard | compact | bold. */
  identity_card_template?: string | null;
  /** Expo Google Font postscript name for the digital card only. */
  identity_card_font?: string | null;
  dob?: string | null;
  portfolio_font?: string | null;
  website_preference?: string | null;
  rebuild_preferences?: string | null;
  address?: string | null;
  consent_accepted_at?: string | null;
  updated_at?: string | null;
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
  onboardingStep:
    | "email"
    | "photo"
    | "handle"
    | "dob"
    | "resume"
    | "manual_review"
    | "manual"
    | "about"
    | "theme"
    | "font"
    | "preference"
    | "generating"
    | "completed";
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
  /** Persisted step in resume summary flow (0–6 = section summaries, 7 = terms). Survives app restart. */
  manualReviewStepIndex: number;

  setProfile: (profile: Profile) => void;
  setOnboardingStep: (step: ProfileState["onboardingStep"]) => void;
  setParsedResumeData: (data: ProfileState["parsedResumeData"]) => void;
  setManualReviewStepIndex: (index: number) => void;
  checkHandle: (handle: string) => Promise<boolean>;
  createProfile: (payload: any) => Promise<void>;
  fetchProfile: (userId?: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  addEducation: (edu: Education) => void;
  addExperience: (exp: Experience) => void;
  addProject: (proj: Project) => void;
  addSkill: (skill: Skill) => void;
  setEducation: (edu: Education[]) => void;
  setExperiences: (exp: Experience[]) => void;
  setProjects: (proj: Project[]) => void;
  setSkills: (skills: Skill[]) => void;
  setResearch: (research: Research[]) => void;
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
  isProfileComplete: () => boolean;
  getCompletionResult: () => CompletionResult;

  // New bulk methods
  bulkSaveEducation: (items: Education[]) => Promise<void>;
  bulkSaveExperiences: (items: Experience[]) => Promise<void>;
  bulkSaveProjects: (items: Project[]) => Promise<void>;
  bulkSaveSkills: (items: Skill[]) => Promise<void>;
  bulkSaveResearch: (items: Research[]) => Promise<void>;
  replaceAllDataFromResume: (parsed: ParsedResume, resumePath: string) => Promise<void>;
  mergeDataFromResume: (parsed: ParsedResume, resumePath: string) => Promise<void>;
  syncOnboardingStepFromData: () => void;
  refreshFromDB: () => Promise<void>;
  reset: () => void;
}

const profilePersistStorage = createEncryptedJSONStorage();

function stripEducationForDb(i: Education) {
  const { start_month, end_month, description, ...rest } = i as any;
  return rest;
}

function stripExperienceForDb(i: Experience) {
  const { start_month, start_year, end_month, end_year, ...rest } = i as any;
  return rest;
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
      manualReviewStepIndex: 0,

      setProfile: (profile) => set({ profile }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      setParsedResumeData: (data) => set({ parsedResumeData: data }),
      setManualReviewStepIndex: (index) =>
        set({
          manualReviewStepIndex: Math.max(0, Math.min(7, Math.floor(Number.isFinite(index) ? index : 0))),
        }),

      setEducation: (education) => set({ education }),
      setExperiences: (experiences) => set({ experiences }),
      setProjects: (projects) => set({ projects }),
      setSkills: (skills) => set({ skills }),
      setResearch: (research: Research[]) => set({ research }),

      addEducation: (edu) => set((s) => ({ education: [...s.education, edu] })),
      addExperience: (exp) => set((s) => ({ experiences: [...s.experiences, exp] })),
      addProject: (proj) => set((s) => ({ projects: [...s.projects, proj] })),
      addSkill: (skill) => set((s) => ({ skills: [...s.skills, skill] })),

      isProfileComplete: () => {
        const { profile } = get();
        if (!profile) return false;
        // Basic completeness check: must have handle, full_name, and email
        return !!(profile.handle?.trim() && profile.full_name?.trim() && profile.email?.trim());
      },

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

      checkHandle: async (val: string) => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("handle", val.toLowerCase())
            .maybeSingle();
          return !data;
        } catch {
          return false;
        }
      },

      createProfile: async (payload: any) => {
        const { data, error } = await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "user_id" })
          .select()
          .single();
        
        if (error) throw error;
        set({ profile: data });
      },

      fetchProfile: async (userId?: string) => {
        // Fallback to current authenticated user if no ID is provided
        const effectiveId = userId || get().profile?.user_id || (await supabase.auth.getUser()).data.user?.id;

        if (!effectiveId || effectiveId === "undefined") {
          console.warn("[ProfileStore] fetchProfile: No valid user ID available.");
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const { data: profile, error: pErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", effectiveId)
            .maybeSingle();

          if (pErr) throw pErr;
          if (!profile) {
            set({ profile: null, isLoading: false });
            return;
          }

          const [edu, exp, proj, sk, res] = await Promise.all([
            supabase.from("education").select("*").eq("profile_id", profile.id).order("start_year", { ascending: false }),
            supabase.from("experiences").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }),
            supabase.from("projects").select("*").eq("profile_id", profile.id),
            supabase.from("skills").select("*").eq("profile_id", profile.id),
            supabase.from("research").select("*").eq("profile_id", profile.id),
          ]);

          set({
            profile,
            education: edu.data ?? [],
            experiences: exp.data ?? [],
            projects: proj.data ?? [],
            skills: sk.data ?? [],
            research: res.data ?? [],
            isLoading: false,
          });

          // After fetching, sync the onboarding step based on actual data density.
          // This fulfills the "start from where they left off properly" requirement.
          get().syncOnboardingStepFromData();
        } catch (e: any) {
          console.error("[ProfileStore] fetchProfile error:", sanitizeError(e));
          set({ isLoading: false });
        }
      },

      updateProfile: async (updates: Partial<Profile>) => {
        const profile = get().profile;
        if (!profile) return;

        const linkKeys = ["handle", "linkedin_url", "github_url", "website"] as const;
        const subset: Record<string, unknown> = {};
        for (const k of linkKeys) {
          if (k in updates && updates[k] !== undefined) {
            subset[k] = updates[k];
          }
        }
        let patch: Partial<Profile> = { ...updates };
        if (Object.keys(subset).length > 0) {
          const v = validateProfileFieldPatch(subset);
          if (!v.success) throw new Error(v.message);
          patch = { ...updates, ...v.data };
        }

        const { data, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", profile.id)
          .select()
          .single();
        
        if (error) throw error;
        set({ profile: data });
      },

      saveEducation: async (edu: Education) => {
        const profile = get().profile;
        if (!profile) return;
        
        // Strip UI-only fields
        const { start_month, end_month, ...cleanEdu } = edu as any;
        const payload = { ...cleanEdu, profile_id: profile.id };
        
        const { data, error } = await supabase
          .from("education")
          .upsert(payload)
          .select()
          .single();
        
        if (error) throw error;
        set((s) => ({
          education: edu.id 
            ? s.education.map((e) => (e.id === edu.id ? data : e))
            : [...s.education, data],
        }));
      },

      deleteEducation: async (id: string) => {
        const { error } = await supabase.from("education").delete().eq("id", id);
        if (error) throw error;
        set((s) => ({ education: s.education.filter((e) => e.id !== id) }));
      },

      saveExperience: async (exp: Experience) => {
        const profile = get().profile;
        if (!profile) return;
        
        // Strip UI-only fields
        const { start_month, start_year, end_month, end_year, ...cleanExp } = exp as any;
        const payload = { ...cleanExp, profile_id: profile.id };

        const { data, error } = await supabase
          .from("experiences")
          .upsert(payload)
          .select()
          .single();
        
        if (error) throw error;
        set((s) => ({
          experiences: exp.id 
            ? s.experiences.map((e) => (e.id === exp.id ? data : e))
            : [...s.experiences, data],
        }));
      },

      deleteExperience: async (id: string) => {
        const { error } = await supabase.from("experiences").delete().eq("id", id);
        if (error) throw error;
        set((s) => ({ experiences: s.experiences.filter((e) => e.id !== id) }));
      },

      saveProject: async (proj: Project) => {
        const profile = get().profile;
        if (!profile) return;
        const payload = { ...proj, profile_id: profile.id };
        const { data, error } = await supabase
          .from("projects")
          .upsert(payload)
          .select()
          .single();
        
        if (error) throw error;
        set((s) => ({
          projects: proj.id 
            ? s.projects.map((p) => (p.id === proj.id ? data : p))
            : [...s.projects, data],
        }));
      },

      deleteProject: async (id: string) => {
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) throw error;
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
      },

      saveSkill: async (skill: Skill) => {
        const profile = get().profile;
        if (!profile) return;
        const payload = { ...skill, profile_id: profile.id };
        const { data, error } = await supabase
          .from("skills")
          .upsert(payload)
          .select()
          .single();
        
        if (error) throw error;
        set((s) => ({
          skills: skill.id 
            ? s.skills.map((sk) => (sk.id === skill.id ? data : sk))
            : [...s.skills, data],
        }));
      },

      deleteSkill: async (id: string) => {
        const { error } = await supabase.from("skills").delete().eq("id", id);
        if (error) throw error;
        set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) }));
      },

      saveResearch: async (res: Research) => {
        const profile = get().profile;
        if (!profile) return;
        const payload = { ...res, profile_id: profile.id };
        const { data, error } = await supabase
          .from("research")
          .upsert(payload)
          .select()
          .single();
        
        if (error) throw error;
        set((s) => ({
          research: res.id 
            ? s.research.map((r) => (r.id === res.id ? data : r))
            : [...s.research, data],
        }));
      },

      deleteResearch: async (id: string) => {
        const { error } = await supabase.from("research").delete().eq("id", id);
        if (error) throw error;
        set((s) => ({ research: s.research.filter((r) => r.id !== id) }));
      },

      bulkSaveEducation: async (items: Education[]) => {
        const profile = get().profile;
        if (!profile || items.length === 0) return;
        const payload = items.map((i) => ({
          ...stripEducationForDb(i),
          id: i.id ?? randomUUID(),
          profile_id: profile.id,
        }));
        const { error } = await supabase
          .from("education")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
        await get().refreshFromDB();
      },

      bulkSaveExperiences: async (items: Experience[]) => {
        const profile = get().profile;
        if (!profile || items.length === 0) return;
        const payload = items.map((i) => ({
          ...stripExperienceForDb(i),
          id: i.id ?? randomUUID(),
          profile_id: profile.id,
        }));
        const { error } = await supabase
          .from("experiences")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
        await get().refreshFromDB();
      },

      bulkSaveProjects: async (items: Project[]) => {
        const profile = get().profile;
        if (!profile || items.length === 0) return;
        const payload = items.map((i) => ({
          ...i,
          id: i.id ?? randomUUID(),
          profile_id: profile.id,
        }));
        const { error } = await supabase
          .from("projects")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
        await get().refreshFromDB();
      },

      bulkSaveSkills: async (items: Skill[]) => {
        const profile = get().profile;
        if (!profile || items.length === 0) return;
        const payload = items.map((i) => ({
          profile_id: profile.id,
          name: i.name,
          category: i.category,
          level: i.level,
        }));
        const { error } = await supabase
          .from("skills")
          .upsert(payload, { onConflict: "profile_id,name" });
        if (error) throw error;
        await get().refreshFromDB();
      },

      bulkSaveResearch: async (items: Research[]) => {
        const profile = get().profile;
        if (!profile || items.length === 0) return;
        const payload = items.map((i) => ({
          ...i,
          id: i.id ?? randomUUID(),
          profile_id: profile.id,
        }));
        const { error } = await supabase
          .from("research")
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
        await get().refreshFromDB();
      },

      replaceAllDataFromResume: async (parsed: ParsedResume, resumePath: string) => {
        const profile = get().profile;
        if (!profile) throw new Error("No profile loaded");

        const { error } = await supabase.rpc("replace_profile_resume_data", {
          p_profile_id: profile.id,
          p_resume_url: resumePath,
          p_full_name: parsed.full_name || profile.full_name,
          p_headline: parsed.headline || profile.headline,
          p_bio: parsed.bio || profile.bio,
          p_education: parsed.education ?? [],
          p_experiences: parsed.experiences ?? [],
          p_projects: parsed.projects ?? [],
          p_skills: parsed.skills ?? [],
        });

        if (error) {
          console.error("[ProfileStore] replaceAllData RPC failed:", error);
          throw error;
        }

        await get().refreshFromDB();
      },

      mergeDataFromResume: async (parsed: ParsedResume, resumePath: string) => {
        const profile = get().profile;
        if (!profile) throw new Error("No profile loaded");

        try {
          await get().updateProfile({ resume_url: resumePath });
          
          const tasks: Promise<any>[] = [];
          if (parsed.education?.length)   tasks.push(get().bulkSaveEducation(parsed.education));
          if (parsed.experiences?.length) tasks.push(get().bulkSaveExperiences(parsed.experiences));
          if (parsed.projects?.length)    tasks.push(get().bulkSaveProjects(parsed.projects));
          if (parsed.skills?.length)      tasks.push(get().bulkSaveSkills(parsed.skills));

          await Promise.all(tasks);
        } catch (e) {
          console.error("[ProfileStore] mergeData failed:", e);
          throw e;
        }
      },

      syncOnboardingStepFromData: () => {
        const { profile, education, experiences, onboardingStep } = get();
        
        // If already completed, stay completed
        if (onboardingStep === "completed") return;

        // 1. Email check
        if (!profile?.email?.trim()) {
          set({ onboardingStep: "email" });
          return;
        }

        // 2. Photo check
        if (!profile?.avatar_url) {
          set({ onboardingStep: "photo" });
          return;
        }

        // 3. Identity check (Handle & Name)
        if (!profile?.handle?.trim() || !profile?.full_name?.trim()) {
          set({ onboardingStep: "handle" });
          return;
        }

        // 4. DOB check
        if (!profile?.dob) {
          set({ onboardingStep: "dob" });
          return;
        }

        // 5. Resume/Experience check
        // If they have no education AND no experiences AND no resume, they need to upload/import
        if (education.length === 0 && experiences.length === 0 && !profile?.resume_url) {
          set({ onboardingStep: "resume" });
          return;
        }

        // 6. Manual review/entry check
        // If they have a resume but still no data, they might be in the summary/parsing phase
        if (profile?.resume_url && education.length === 0 && experiences.length === 0) {
          // Check if we have parsed data waiting to be reviewed
          if (get().parsedResumeData) {
            set({ onboardingStep: "manual_review" });
          } else {
            set({ onboardingStep: "manual" });
          }
          return;
        }

        // 7. Portfolio Theme/Font check (last steps)
        if (!profile?.portfolio_theme || profile.portfolio_theme === "default") {
          // If they haven't picked a theme yet
          set({ onboardingStep: "theme" });
          return;
        }

        // Default: If they have basic data, move them towards completion
        if (get().isProfileComplete()) {
          set({ onboardingStep: "completed" });
        }
      },

      refreshFromDB: async () => {
        const profile = get().profile;
        if (!profile) return;
        await get().fetchProfile(profile.user_id);
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
        manualReviewStepIndex: 0,
      }),
    }),
    {
      name: "bexo-profile-storage",
      storage: createJSONStorage(() => profilePersistStorage),
      partialize: (state) => ({
        onboardingStep: state.onboardingStep,
        manualReviewStepIndex: state.manualReviewStepIndex,
        // We exclude heavy data arrays and the full profile object 
        // to stay within SecureStore's 2048-byte limit.
        // fetchProfile() is called during app init to restore these.
      }),
    }
  )
);
