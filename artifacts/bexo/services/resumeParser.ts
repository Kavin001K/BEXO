import { Platform } from "react-native";
import { uploadResume, getResumeSignedUrl } from "@/services/upload";
import { apiFetch } from "@/lib/apiConfig";
import { decode } from "base64-arraybuffer";

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

const DEEPSEEK_API_KEY   = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY ?? "";
const AI_MODEL           = "deepseek-chat";
const DEEPSEEK_URL       = "https://api.deepseek.com/chat/completions";

const EXTRACTION_PROMPT = `You are an expert resume parser. Extract ALL information from this resume.
Return ONLY a raw JSON object — NO markdown, NO code fences, NO explanation.

{
  "full_name": "string",
  "headline": "concise professional headline ≤120 chars",
  "bio": "2-3 sentence first-person bio",
  "email": "string or null",
  "phone": "string or null",
  "location": "City, Country or null",
  "github_url": "full URL or null",
  "linkedin_url": "full URL or null",
  "website": "URL or null",
  "education": [{"institution":"","degree":"","field":"","start_year":2020,"end_year":2024,"gpa":"or null"}],
  "experiences": [{"company":"","role":"","start_date":"Mon YYYY","end_date":"or null","description":"","is_current":false}],
  "projects": [{"title":"","description":"","tech_stack":[],"live_url":"or null","github_url":"or null"}],
  "skills": [{"name":"","category":"Programming Languages|Frameworks|Tools|Cloud|Design|Soft Skills","level":"beginner|intermediate|advanced|expert"}]
}

Rules:
- maximum 5 education entries, 6 experiences, 6 projects, 25 skills
- never invent data not present in the resume
- github_url and linkedin_url: full URL (https://github.com/username)
- If a section has no data in the resume, return an empty array for that section`;

// ─── Parse Quality Validation ───────────────────────────────────────────

/**
 * Checks whether the parsed resume has meaningful content.
 * Returns true if the parse extracted at least a name and one data section.
 */
function isParseMeaningful(parsed: ParsedResume): boolean {
  const hasName = !!parsed.full_name?.trim();
  const hasAnyData =
    (parsed.education?.length ?? 0) > 0 ||
    (parsed.experiences?.length ?? 0) > 0 ||
    (parsed.projects?.length ?? 0) > 0 ||
    (parsed.skills?.length ?? 0) > 0;

  return hasName && hasAnyData;
}

/** Summarizes what was extracted for logging. */
function parseSummary(p: ParsedResume): string {
  return `name="${p.full_name ?? "?"}", edu=${p.education?.length ?? 0}, exp=${p.experiences?.length ?? 0}, proj=${p.projects?.length ?? 0}, skills=${p.skills?.length ?? 0}`;
}

// ─── Text Extraction (Step 1) ───────────────────────────────────────────

async function extractTextFromPDF(pdfBase64: string): Promise<string> {
  console.log("[resumeParser] Step 1: Extracting text from PDF via backend...");

  // Convert base64 to Uint8Array for the request
  const bytes = new Uint8Array(decode(pdfBase64));

  const response = await apiFetch("/storage/parse-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
    },
    body: bytes,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Text extraction failed: ${err}`);
  }

  const data = await response.json();
  const text = data.text ?? "";
  console.log(`[resumeParser] Extracted ${text.length} chars of text from PDF.`);
  return text;
}

// ─── AI Parsing (Step 2) ────────────────────────────────────────────────

async function parseWithAI(pdfBase64: string): Promise<ParsedResume> {
  console.log(`[resumeParser] Starting parseWithAI via DeepSeek...`);

  let resumeText = "";
  let lastError = "";

  // Step 1: Extract text from PDF using our backend (pdf-parse)
  try {
    resumeText = await extractTextFromPDF(pdfBase64);
    if (!resumeText || resumeText.length < 50) {
      throw new Error(`Extracted text too short (${resumeText.length} chars)`);
    }
    console.log("[resumeParser] Text extraction successful.");
  } catch (e: any) {
    console.error(`[resumeParser] Extraction failed: ${e.message}`);
    lastError = sanitizeError(e);
    throw new Error(lastError);
  }

  // Step 2: Parse structured JSON from text using DeepSeek
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key missing.");
  }

  try {
    console.log(`[resumeParser] Attempting DeepSeek parse with model ${AI_MODEL}...`);
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert resume parser. You will receive the full text of a resume and must extract all structured data into JSON. Output ONLY valid JSON."
          },
          {
            role: "user",
            content: `Here is the full text of a resume:\n\n---\n${resumeText}\n---\n\n${EXTRACTION_PROMPT}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const parsed = processAIResponse(data);

      if (isParseMeaningful(parsed)) {
        console.log(`[resumeParser] Done: ${JSON.stringify({
          name: parsed.full_name,
          edu: parsed.education?.length,
          exp: parsed.experiences?.length,
          proj: parsed.projects?.length,
          skills: parsed.skills?.length
        })}`);
        return parsed;
      } else {
        throw new Error("DeepSeek returned insufficient data.");
      }
    } else {
      const err = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${err}`);
    }
  } catch (e: any) {
    console.error(`[resumeParser] AI parse failed: ${e.message}`);
    throw e;
  }
}

function processAIResponse(data: any): ParsedResume {
  const text = data.choices?.[0]?.message?.content ?? "{}";
  // More aggressive cleaning for non-standard JSON output
  const clean = text
    .replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, "$1") // Extract just the outer {} object
    .replace(/```json\n?|\n?```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(clean) as ParsedResume;

    // Sanitize: ensure arrays exist and contain valid items
    parsed.education   = (parsed.education   ?? []).filter(e => e?.institution?.trim());
    parsed.experiences = (parsed.experiences ?? []).filter(e => e?.company?.trim() || e?.role?.trim());
    parsed.projects    = (parsed.projects    ?? []).filter(p => p?.title?.trim());
    parsed.skills      = (parsed.skills      ?? []).filter(s => s?.name?.trim());

    // Sanitize skill levels
    const validLevels = ["beginner", "intermediate", "advanced", "expert"];
    parsed.skills = parsed.skills.map(s => ({
      ...s,
      level: (validLevels.includes(s.level) ? s.level : "intermediate") as any,
      category: s.category || "General",
    }));

    // Sanitize experience is_current
    parsed.experiences = parsed.experiences.map(e => ({
      ...e,
      is_current: e.is_current ?? false,
      description: e.description ?? "",
      start_date: e.start_date ?? "",
    }));

    // Sanitize education fields
    parsed.education = parsed.education.map(e => ({
      ...e,
      degree: e.degree ?? "",
      field: e.field ?? "",
      start_year: typeof e.start_year === "number" ? e.start_year : parseInt(String(e.start_year)) || new Date().getFullYear(),
    }));

    // Sanitize project fields
    parsed.projects = parsed.projects.map(p => ({
      ...p,
      description: p.description ?? "",
      tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
    }));

    return parsed;
  } catch (e) {
    console.error("[resumeParser] JSON parse failed. Raw:", clean.substring(0, 200));
    throw new Error("AI returned invalid JSON structure.");
  }
}

/**
 * Upload resume to Supabase Storage, then parse with AI.
 */
export async function uploadAndParseResume(
  localUri: string,
  fileName: string,
  userId: string,
  onProgress?: (stage: "uploading" | "parsing", pct: number) => void
): Promise<{ resumeStoragePath: string; resumeSignedUrl: string; parsed: ParsedResume }> {
  console.log("[resumeParser] Starting processing pipeline...");

  // 1. Upload & Get Base64
  const { path: resumeStoragePath, base64: pdfBase64 } = await uploadResume(
    userId,
    localUri,
    (pct) => onProgress?.("uploading", pct)
  );

  onProgress?.("uploading", 100);

  // 2. Get Signed URL (for storage reference)
  const resumeSignedUrl = await getResumeSignedUrl(resumeStoragePath);

  // 3. AI Parsing
  onProgress?.("parsing", 10);
  console.log("[resumeParser] Parsing with AI via DeepSeek...");
  const parsed = await parseWithAI(pdfBase64);
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
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key missing.");
  }

  const prompt = `Write a professional 2-3 sentence bio in first person for a student portfolio.
Name: ${context.full_name}
Headline: ${context.headline ?? ""}
Skills: ${context.skills?.join(", ") ?? ""}
Education: ${context.education ?? ""}
Recent experience: ${context.experience ?? ""}

Return ONLY the bio text, no quotes, no extra text.`;

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error("Failed to generate bio");
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}
