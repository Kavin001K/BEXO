import {
  formatR2ResumeRef,
  uploadResumeToCloudflare,
} from "@/services/upload";
import { apiFetch } from "@/lib/apiConfig";
import { explainGeminiApiFailure, sanitizeError } from "@/lib/errorUtils";

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

async function parseResumeWithGemini(r2ObjectKey: string): Promise<ParsedResume> {
  console.log("[resumeParser] Calling parse-resume (R2 → Gemini pipeline)...");

  const { data, error } = await supabase.functions.invoke("parse-resume", {
    body: { r2Key: r2ObjectKey },
  });

  if (error) {
    console.error("[resumeParser] Edge Function error:", error);

    let detailedError = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json() as { error?: unknown; message?: string };
        const raw = body.error ?? body.message;
        detailedError =
          typeof raw === "string"
            ? raw
            : raw != null
              ? JSON.stringify(raw)
              : detailedError;
      } catch {
        // Fallback to default message if body isn't JSON
      }
    }

    const explained = explainGeminiApiFailure(detailedError);
    if (explained) {
      throw new Error(explained);
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
 * Upload résumé to **Cloudflare R2** (via Edge Function `upload`), then **`parse-resume`** loads bytes from R2 and sends them to Gemini; structured JSON is mapped client-side for profile import.
 */
export async function uploadAndParseResume(
  localUri: string,
  fileName: string,
  userId: string,
  onProgress?: (stage: "uploading" | "parsing", pct: number) => void
): Promise<{ resumeStoragePath: string; resumeSignedUrl: string; parsed: ParsedResume }> {
  console.log("[resumeParser] Pipeline: Cloudflare R2 upload → parse-resume Edge → Gemini");

  const { key, publicUrl } = await uploadResumeToCloudflare(
    userId,
    localUri,
    fileName,
    (pct) => onProgress?.("uploading", pct)
  );
  onProgress?.("uploading", 100);

  const resumeStoragePath = formatR2ResumeRef(key);
  const resumeSignedUrl = publicUrl;

  onProgress?.("parsing", 30);
  try {
    const parsed = await parseResumeWithGemini(key);
    onProgress?.("parsing", 100);
    console.log(`[resumeParser] Pipeline complete: ${parseSummary(parsed)}`);
    return { resumeStoragePath, resumeSignedUrl, parsed };
  } catch (e: any) {
    const raw = e?.message ?? String(e);
    console.error("[resumeParser] Gemini parsing failed:", raw);
    const explained = explainGeminiApiFailure(raw);
    if (explained) {
      throw new Error(explained);
    }
    // Keep messages already produced above (avoid sanitizeError shortening long help text)
    if (raw.includes("Google revoked") || raw.includes("aistudio.google.com")) {
      throw new Error(raw);
    }
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
