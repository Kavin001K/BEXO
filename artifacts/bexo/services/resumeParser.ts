import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import { Platform } from "react-native";
import { uploadResume } from "./upload";

export interface ParsedResume {
  full_name?: string;
  headline?: string;
  bio?: string;
  email?: string;
  phone?: string;
  location?: string;
  github_url?: string;
  linkedin_url?: string;
  website?: string;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number;
    end_year?: number | null;
    gpa?: string | null;
  }>;
  experiences: Array<{
    company: string;
    role: string;
    start_date: string;
    end_date?: string | null;
    description: string;
    is_current: boolean;
  }>;
  projects: Array<{
    title: string;
    description: string;
    tech_stack: string[];
    live_url?: string | null;
    github_url?: string | null;
  }>;
  skills: Array<{
    name: string;
    category: string;
    level: "beginner" | "intermediate" | "advanced" | "expert";
  }>;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const EXTRACTION_PROMPT = `You are an expert resume parser. Extract all information from this PDF resume and return ONLY a valid JSON object matching this exact schema. Do NOT include markdown, code fences, or any explanation — only raw JSON.

{
  "full_name": "string",
  "headline": "concise professional headline (max 120 chars, e.g. 'CS Student · Full-Stack Developer · Open to opportunities')",
  "bio": "2-3 sentence professional bio written in first person",
  "email": "string or null",
  "phone": "string or null",
  "location": "City, Country or null",
  "github_url": "full GitHub URL or null",
  "linkedin_url": "full LinkedIn URL or null",
  "website": "personal website URL or null",
  "education": [
    {
      "institution": "University/School name",
      "degree": "e.g. Bachelor of Science",
      "field": "e.g. Computer Science",
      "start_year": 2020,
      "end_year": 2024,
      "gpa": "3.8 or null"
    }
  ],
  "experiences": [
    {
      "company": "Company name",
      "role": "Job title",
      "start_date": "Jan 2023",
      "end_date": "Dec 2023 or null if current",
      "description": "Key responsibilities and achievements",
      "is_current": false
    }
  ],
  "projects": [
    {
      "title": "Project name",
      "description": "What it does and your role",
      "tech_stack": ["React", "Node.js"],
      "live_url": "https://... or null",
      "github_url": "https://github.com/... or null"
    }
  ],
  "skills": [
    {
      "name": "JavaScript",
      "category": "Programming Languages",
      "level": "advanced"
    }
  ]
}

Skill levels must be exactly one of: "beginner", "intermediate", "advanced", "expert".
Extract as much detail as possible. If a field is missing from the resume, use null or an empty array.`;

/**
 * Convert a file URI to a base64-encoded string.
 * Uses expo-file-system for native and fetch for web.
 */
async function fileUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  // Native: Ensure URI is formatted correctly for FileSystem
  let processedUri = uri;
  if (uri.startsWith("/") && !uri.startsWith("file://")) {
    processedUri = `file://${uri}`;
  }

  return await readAsStringAsync(processedUri, {
    encoding: EncodingType.Base64,
  });
}

/**
 * Call Gemini 3.1 Flash Lite to extract structured data from a PDF.
 */
async function callGeminiParsePdf(pdfBase64: string): Promise<ParsedResume> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Google AI API key is not configured. Add EXPO_PUBLIC_GOOGLE_API_KEY to your environment."
    );
  }

  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          { text: EXTRACTION_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown fences if model includes them despite instructions
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  let parsed: ParsedResume;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini returned invalid JSON. Please try again.");
  }

  // Normalise arrays so callers always get arrays, never null
  parsed.education  = parsed.education  ?? [];
  parsed.experiences = parsed.experiences ?? [];
  parsed.projects   = parsed.projects   ?? [];
  parsed.skills     = parsed.skills     ?? [];

  return parsed;
}

/**
 * Upload a resume PDF to Supabase Storage, then parse it with Gemini AI.
 * Returns the public storage URL and the extracted resume data.
 */
export async function uploadAndParseResume(
  fileUri: string,
  fileName: string,
  userId: string
): Promise<{ resumeUrl: string; parsed: ParsedResume }> {
  // Read file as base64 BEFORE uploading (avoids an extra download round-trip)
  const pdfBase64 = await fileUriToBase64(fileUri);

  // Upload to R2 and update profile
  const resumeUrl = await uploadResume(userId, fileUri);

  // Parse with Gemini
  const parsed = await callGeminiParsePdf(pdfBase64);

  return { resumeUrl, parsed };
}


/**
 * Generate a professional bio from profile data using Gemini.
 */
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
