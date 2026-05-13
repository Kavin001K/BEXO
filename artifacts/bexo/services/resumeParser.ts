import { uploadResume, getResumeSignedUrl } from "@/services/upload";
import { apiFetch } from "@/lib/apiConfig";
import { decode } from "base64-arraybuffer";
import { sanitizeError } from "@/lib/errorUtils";

/** User-safe copy — never includes Google stack traces or JSON blobs. */
const MSG_RESUME_AI_DOWN =
  "Resume AI isn’t available right now (often an expired or missing Google API key on the server). You can enter your profile manually instead.";

/**
 * Maps vendor / HTTP errors to a single readable line. Defaults to a safe message so
 * expired keys and 403/400 Gemini responses never surface raw JSON in the UI.
 */
export function friendlyResumeAiError(raw: string): string {
  const s = raw.toLowerCase();
  if (
    s.includes("api_key_invalid") ||
    s.includes("api key expired") ||
    s.includes("renew the api key") ||
    s.includes("unregistered callers") ||
    s.includes("googlegenerativeai") ||
    s.includes("generativelanguage.googleapis.com") ||
    (s.includes("403") && (s.includes("forbidden") || s.includes("permission"))) ||
    (s.includes("400") && (s.includes("api") || s.includes("key")))
  ) {
    return MSG_RESUME_AI_DOWN;
  }
  if (s.includes("quota") || s.includes("resource exhausted") || s.includes("rate limit")) {
    return "Resume AI is busy right now. Try again in a few minutes or continue with manual entry.";
  }
  if (s.includes("not configured") || s.includes("503") || s.includes("service unavailable")) {
    return MSG_RESUME_AI_DOWN;
  }
  if (s.includes("network request failed") || s.includes("failed to fetch")) {
    return "Couldn’t reach the server. Check your connection, or continue with manual entry.";
  }
  if (s.includes("extracted text too short")) {
    return "We couldn’t read enough text from this PDF. Try another file or enter your profile manually.";
  }
  if (s.includes("resume upload failed") || s.includes("upload failed")) {
    return "Couldn’t upload your file. Check your connection and try again.";
  }
  // Long / JSON-ish messages — never show raw vendor payloads
  if (raw.length > 180 || raw.includes("{") || raw.includes("http://") || raw.includes("https://")) {
    return "Resume processing failed. Try again or enter your profile manually.";
  }
  if (raw.trim().length > 0 && raw.length < 160 && !raw.includes("GoogleGenerativeAI")) {
    return raw.trim();
  }
  return "Resume processing failed. Try again or enter your profile manually.";
}

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
  education:     Array<{ institution: string; degree: string; field: string; start_year: number; end_year?: number | null; gpa?: string | null }>;
  experiences:   Array<{ company: string; role: string; start_date: string; end_date?: string | null; description: string; is_current: boolean }>;
  projects:      Array<{ title: string; description: string; tech_stack: string[]; live_url?: string | null; github_url?: string | null }>;
  skills:        Array<{ name: string; category: string; level: "beginner" | "intermediate" | "advanced" | "expert" }>;
}

/** Summarizes what was extracted for logging. */
function parseSummary(p: ParsedResume): string {
  return `name="${p.full_name ?? "?"}", edu=${p.education?.length ?? 0}, exp=${p.experiences?.length ?? 0}, proj=${p.projects?.length ?? 0}, skills=${p.skills?.length ?? 0}`;
}

// ─── Step 1: Extract text from PDF via backend ─────────────────────────────

async function extractTextFromPDF(pdfBase64: string): Promise<string> {
  console.log("[resumeParser] Step 1: Extracting text from PDF via backend...");

  const bytes = new Uint8Array(decode(pdfBase64));

  const response = await apiFetch("/storage/parse-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: bytes,
  });

  if (!response.ok) {
    const body = await response.text();
    let hint = body;
    try {
      const j = JSON.parse(body) as { error?: string };
      if (typeof j.error === "string") hint = j.error;
    } catch {
      /* use raw body */
    }
    throw new Error(friendlyResumeAiError(`${response.status} ${hint}`));
  }

  const data = await response.json();
  const text = data.text ?? "";
  console.log(`[resumeParser] Extracted ${text.length} chars from PDF.`);
  return text;
}

// ─── Step 2: Parse with AI via backend ─────────────────────────────────────

async function parseResumeWithBackend(resumeText: string): Promise<ParsedResume> {
  console.log("[resumeParser] Step 2: Sending text to backend AI parser...");

  const response = await apiFetch("/storage/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: resumeText }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw =
      typeof payload.error === "string"
        ? payload.error
        : JSON.stringify(payload ?? {});
    throw new Error(friendlyResumeAiError(raw));
  }

  return payload.parsed as ParsedResume;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Upload resume to Supabase Storage, extract text, then parse with AI (via backend).
 */
export async function uploadAndParseResume(
  localUri: string,
  fileName: string,
  userId: string,
  onProgress?: (stage: "uploading" | "parsing", pct: number) => void
): Promise<{ resumeStoragePath: string; resumeSignedUrl: string; parsed: ParsedResume }> {
  console.log("[resumeParser] Starting processing pipeline...");

  // 1. Upload PDF to Supabase Storage & get base64
  const { path: resumeStoragePath, base64: pdfBase64 } = await uploadResume(
    userId,
    localUri,
    (pct) => onProgress?.("uploading", pct)
  );
  onProgress?.("uploading", 100);

  // 2. Get signed URL for storage reference
  const resumeSignedUrl = await getResumeSignedUrl(resumeStoragePath);

  // 3. Extract text from PDF bytes via backend
  onProgress?.("parsing", 10);
  let resumeText: string;
  try {
    resumeText = await extractTextFromPDF(pdfBase64);
    if (!resumeText || resumeText.length < 50) {
      throw new Error(`Extracted text too short (${resumeText.length} chars)`);
    }
  } catch (e: any) {
    console.error("[resumeParser] Text extraction failed:", e?.message ?? e);
    throw new Error(friendlyResumeAiError(sanitizeError(e)));
  }
  onProgress?.("parsing", 40);

  // 4. AI parse via backend (OpenAI, secured server-side)
  const parsed = await parseResumeWithBackend(resumeText);
  onProgress?.("parsing", 100);

  console.log(`[resumeParser] Pipeline complete: ${parseSummary(parsed)}`);
  return { resumeStoragePath, resumeSignedUrl, parsed };
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

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw =
      typeof payload.error === "string"
        ? payload.error
        : JSON.stringify(payload ?? {});
    throw new Error(friendlyResumeAiError(raw));
  }

  return payload.bio ?? "";
}
