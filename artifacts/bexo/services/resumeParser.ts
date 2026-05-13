import { uploadResume, getResumeSignedUrl } from "@/services/upload";
import { apiFetch } from "@/lib/apiConfig";
import { sanitizeError } from "@/lib/errorUtils";

export interface ParsedResume {
  full_name?:    string;
  headline?:     string;
  bio?:          string;
  email?:        string;
  phone?:        string;
  location?:     string;
  github_url?:   string;
  linkedin_url?: string;
  website?:      string;
  education:     Array<{ institution: string; degree: string; field: string; start_year: number; end_year?: number | null; gpa?: string | null; description?: string | null }>;
  experiences:   Array<{ company: string; role: string; start_date: string; end_date?: string | null; description: string; is_current: boolean }>;
  projects:      Array<{ title: string; description: string; tech_stack: string[]; live_url?: string | null; github_url?: string | null }>;
  skills:        Array<{ name: string; category: string; level: "beginner" | "intermediate" | "advanced" | "expert" }>;
  /** Optional — populated when AI schema includes research entries */
  research?:     Array<{
    title: string;
    subtitle?: string | null;
    description: string;
    image_url?: string | null;
    file_url?: string | null;
  }>;
}

/** Summarizes what was extracted for logging. */
function parseSummary(p: ParsedResume): string {
  return `name="${p.full_name ?? "?"}", edu=${p.education?.length ?? 0}, exp=${p.experiences?.length ?? 0}, proj=${p.projects?.length ?? 0}, skills=${p.skills?.length ?? 0}`;
}

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

async function parseResumeWithGemini(resumeSignedUrl: string): Promise<ParsedResume> {
  console.log("[resumeParser] Calling Gemini-powered Edge Function...");

  const { data, error } = await supabase.functions.invoke("parse-resume", {
    body: { resumeUrl: resumeSignedUrl },
  });

  if (error) {
    console.error("[resumeParser] Edge Function error:", error);

    let detailedError = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        detailedError = body.error || body.message || detailedError;
      } catch {
        // Fallback to default message if body isn't JSON
      }
    }

    throw new Error(`Resume parsing failed: ${detailedError}`);
  }

  return normalizeParsedResume(data);
}

function normalizeParsedResume(raw: unknown): ParsedResume {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    full_name:    typeof o.full_name === "string" ? o.full_name : undefined,
    headline:     typeof o.headline === "string" ? o.headline : undefined,
    bio:          typeof o.bio === "string" ? o.bio : undefined,
    email:        typeof o.email === "string" ? o.email : undefined,
    phone:        typeof o.phone === "string" ? o.phone : undefined,
    location:     typeof o.location === "string" ? o.location : undefined,
    github_url:   typeof o.github_url === "string" ? o.github_url : undefined,
    linkedin_url: typeof o.linkedin_url === "string" ? o.linkedin_url : undefined,
    website:      typeof o.website === "string" ? o.website : undefined,
    education:    Array.isArray(o.education) ? (o.education as ParsedResume["education"]) : [],
    experiences:  Array.isArray(o.experiences) ? (o.experiences as ParsedResume["experiences"]) : [],
    projects:     Array.isArray(o.projects) ? (o.projects as ParsedResume["projects"]) : [],
    skills:       Array.isArray(o.skills) ? (o.skills as ParsedResume["skills"]) : [],
    research:     Array.isArray(o.research) ? (o.research as NonNullable<ParsedResume["research"]>) : undefined,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Upload resume to Supabase Storage, then parse with Gemini Native PDF Vision (via Edge Function).
 */
export async function uploadAndParseResume(
  localUri: string,
  fileName: string,
  userId: string,
  onProgress?: (stage: "uploading" | "parsing", pct: number) => void
): Promise<{ resumeStoragePath: string; resumeSignedUrl: string; parsed: ParsedResume }> {
  console.log("[resumeParser] Starting processing pipeline (Native PDF Vision)...");

  // 1. Upload PDF to Supabase Storage
  const { path: resumeStoragePath } = await uploadResume(
    userId,
    localUri,
    (pct) => onProgress?.("uploading", pct)
  );
  onProgress?.("uploading", 100);

  // 2. Get signed URL for the AI to fetch
  const resumeSignedUrl = await getResumeSignedUrl(resumeStoragePath);

  // 3. Parse with Gemini Native PDF Vision
  onProgress?.("parsing", 30);
  try {
    const parsed = await parseResumeWithGemini(resumeSignedUrl);
    onProgress?.("parsing", 100);
    console.log(`[resumeParser] Pipeline complete: ${parseSummary(parsed)}`);
    return { resumeStoragePath, resumeSignedUrl, parsed };
  } catch (e: any) {
    console.error("[resumeParser] Gemini parsing failed:", e.message);
    throw new Error(sanitizeError(e));
  }
}

export { uploadAvatar } from "@/services/upload";

export async function generateBioWithAI(context: {
  full_name: string;
  headline?: string;
  skills?: string[];
  education?: string;
  experience?: string;
}): Promise<string> {
  const response = await apiFetch("/storage/generate-bio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to generate bio");
  }

  const result = await response.json();
  return result.bio ?? "";
}
