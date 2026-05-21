/**
 * Profile completeness scoring — must match BEXO app useProfileStore.getCompletionResult.
 */

/** Keep in sync with BEXO/artifacts/bexo/lib/profileCompleteness.ts */
export const COMPLETENESS_PASS_SCORE = 90;

export interface MissingField {
  key: string;
  label: string;
}

export interface CompletenessResult {
  score: number;
  missingFields: MissingField[];
  isPassing: boolean;
}

export interface ProfileGraph {
  profile: {
    full_name?: string | null;
    headline?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    location?: string | null;
    handle?: string | null;
  } | null;
  education: unknown[];
  experiences: unknown[];
  projects: unknown[];
  skills: unknown[];
}

export function computeProfileCompleteness(graph: ProfileGraph): CompletenessResult {
  const { profile, education, experiences, projects, skills } = graph;
  const missing: MissingField[] = [];
  let score = 0;

  if (profile?.full_name?.trim()) score += 15;
  else missing.push({ key: "full_name", label: "Full Name" });

  if (profile?.headline?.trim()) score += 15;
  else missing.push({ key: "headline", label: "Headline" });

  if (profile?.bio?.trim()) score += 10;
  else missing.push({ key: "bio", label: "Bio" });

  if (profile?.avatar_url?.trim()) score += 10;
  else missing.push({ key: "avatar_url", label: "Profile Photo" });

  if (profile?.location?.trim()) score += 5;
  else missing.push({ key: "location", label: "Location" });

  if (profile?.handle?.trim()) score += 10;
  else missing.push({ key: "handle", label: "Username / handle" });

  if (education.length > 0) score += 15;
  else missing.push({ key: "education", label: "Education" });

  if (experiences.length > 0) score += 15;
  else missing.push({ key: "experience", label: "Experience" });

  if (projects.length > 0) score += 10;
  else missing.push({ key: "projects", label: "Projects" });

  if (skills.length >= 3) score += 5;
  else missing.push({ key: "skills", label: "Skills (at least 3)" });

  return {
    score,
    missingFields: missing,
    isPassing: score >= COMPLETENESS_PASS_SCORE,
  };
}
