import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { uploadResume, getResumeSignedUrl } from "@/services/upload";

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

const GEMINI_API_KEY  = process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? "";
const GEMINI_MODEL    = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EXTRACTION_PROMPT = `You are an expert resume parser. Extract ALL information from this PDF resume.
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
- github_url and linkedin_url: full URL (https://github.com/username)`;

async function parseWithGemini(pdfBase64: string): Promise<ParsedResume> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_API_KEY is not set. Add your Gemini API key to .env"
    );
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: EXTRACTION_PROMPT },
          { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const clean = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const parsed = JSON.parse(clean) as ParsedResume;
    parsed.education   = parsed.education   ?? [];
    parsed.experiences = parsed.experiences ?? [];
    parsed.projects    = parsed.projects    ?? [];
    parsed.skills      = parsed.skills      ?? [];
    return parsed;
  } catch {
    throw new Error("AI returned invalid JSON. Try again.");
  }
}

/**
 * Upload resume to Supabase Storage, then parse with Gemini AI.
 * Upload happens first, immediately — no separate "save" step.
 */
export async function uploadAndParseResume(
  localUri: string,
  fileName: string,
  userId: string,
  onProgress?: (stage: "uploading" | "parsing", pct: number) => void
): Promise<{ resumeStoragePath: string; resumeSignedUrl: string; parsed: ParsedResume }> {
  console.log("[resumeParser] Uploading resume...");
  const resumeStoragePath = await uploadResume(
    userId,
    localUri,
    (pct) => onProgress?.("uploading", pct)
  );

  const resumeSignedUrl = await getResumeSignedUrl(resumeStoragePath);

  let pdfBase64: string;
  try {
    if (Platform.OS !== "web") {
      pdfBase64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: "base64" as any,
      });
    } else {
      const res  = await fetch(localUri);
      const blob = await res.blob();
      pdfBase64  = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    const res  = await fetch(resumeSignedUrl);
    const blob = await res.blob();
    pdfBase64  = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  onProgress?.("parsing", 0);
  console.log("[resumeParser] Parsing with Gemini...");
  const parsed = await parseWithGemini(pdfBase64);
  onProgress?.("parsing", 100);

  console.log("[resumeParser] Done:", {
    name: parsed.full_name,
    edu:    parsed.education?.length,
    exp:    parsed.experiences?.length,
    proj:   parsed.projects?.length,
    skills: parsed.skills?.length,
  });

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
  if (!GEMINI_API_KEY) throw new Error("Google AI API key not configured.");

  const prompt = `Write a professional 2-3 sentence bio in first person for a student portfolio.
Name: ${context.full_name}
Headline: ${context.headline ?? ""}
Skills: ${context.skills?.join(", ") ?? ""}
Education: ${context.education ?? ""}
Recent experience: ${context.experience ?? ""}

Return ONLY the bio text, no quotes, no extra text.`;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
    }),
  });

  if (!res.ok) throw new Error("Failed to generate bio");
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}
