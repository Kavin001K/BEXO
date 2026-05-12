import { uploadResume, getResumeSignedUrl } from "@/services/upload";
import { apiFetch } from "@/lib/apiConfig";
import { decode } from "base64-arraybuffer";
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
    const err = await response.text();
    throw new Error(`Text extraction failed: ${err}`);
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

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? `AI parsing failed (${response.status})`);
  }

  const result = await response.json();
  return result.parsed as ParsedResume;
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
    console.error("[resumeParser] Text extraction failed:", e.message);
    throw new Error(sanitizeError(e));
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

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to generate bio");
  }

  const result = await response.json();
  return result.bio ?? "";
}
