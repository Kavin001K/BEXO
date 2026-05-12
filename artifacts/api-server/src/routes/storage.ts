import { Router, raw } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import OpenAI from "openai";

const router = Router();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "bexo";
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// Public base URL for the R2 bucket (if a custom domain is configured on the bucket, use that instead)
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_URL ?? `${R2_ENDPOINT}/${R2_BUCKET_NAME}`;

/**
 * POST /api/storage/upload-url
 * Body: { key: string, contentType: string }
 * Returns: { url: string (presigned PUT URL), publicUrl: string }
 */
router.post("/upload-url", async (req, res) => {
  try {
    const { key, contentType } = req.body as { key?: string; contentType?: string };
    if (!key) {
      res.status(400).json({ error: "key is required" });
      return;
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType ?? "application/octet-stream",
    });

    const url = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 minute window

    res.json({
      url,
      publicUrl: `${R2_PUBLIC_BASE}/${key}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to generate upload URL" });
  }
});

/**
 * POST /api/storage/upload
 * Headers: x-key, content-type
 * Body: binary data
 * This route is used to proxy uploads and avoid CORS issues on web.
 */
router.post("/upload", raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
  try {
    const key = req.headers["x-key"] as string;
    const contentType = req.headers["content-type"] as string;

    if (!key) {
      res.status(400).json({ error: "x-key header is required" });
      return;
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      Body: req.body as Buffer,
    });

    await r2.send(command);

    res.json({
      success: true,
      publicUrl: `${R2_PUBLIC_BASE}/${key}`,
    });
  } catch (err: any) {
    console.error("[Storage] Proxy upload failed:", err);
    res.status(500).json({ error: err.message ?? "Failed to upload file via proxy" });
  }
});

/**
 * POST /api/storage/parse-pdf
 * Body: binary PDF data
 * Returns: { text: string }
 */
router.post("/parse-pdf", raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
  try {
    if (!req.body || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Request body must be binary PDF data" });
      return;
    }

    // Dynamic import to avoid crash if pdf-parse is not installed yet
    let pdfParse;
    try {
      pdfParse = (await import("pdf-parse")).default;
    } catch (e) {
      console.error("pdf-parse not installed:", e);
      res.status(500).json({ error: "pdf-parse library not installed. Please run `pnpm install` in api-server." });
      return;
    }

    const data = await pdfParse(req.body);
    
    res.json({
      success: true,
      text: data.text,
      numPages: data.numpages
    });
  } catch (err: any) {
    console.error("[Storage] PDF parsing failed:", err);
    res.status(500).json({ error: err.message ?? "Failed to parse PDF" });
  }
});

const EXTRACTION_PROMPT = `You are an expert resume parser. Extract ALL information from this resume text.
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

/**
 * POST /api/storage/parse-resume
 * Body: { text: string }
 * Returns: ParsedResume JSON
 */
router.post("/parse-resume", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || text.trim().length < 50) {
      res.status(400).json({ error: "Resume text is required and must be at least 50 characters." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "AI service not configured on the server." });
      return;
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert resume parser. You will receive the full text of a resume and must extract all structured data into JSON. Output ONLY valid JSON.",
        },
        {
          role: "user",
          content: `Here is the full text of a resume:\n\n---\n${text}\n---\n\n${EXTRACTION_PROMPT}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const clean = raw
      .replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, "$1")
      .replace(/```json\n?|\n?```/g, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      res.status(500).json({ error: "AI returned invalid JSON structure." });
      return;
    }

    // Sanitize arrays
    parsed.education   = (parsed.education   ?? []).filter((e: any) => e?.institution?.trim());
    parsed.experiences = (parsed.experiences ?? []).filter((e: any) => e?.company?.trim() || e?.role?.trim());
    parsed.projects    = (parsed.projects    ?? []).filter((p: any) => p?.title?.trim());
    parsed.skills      = (parsed.skills      ?? []).filter((s: any) => s?.name?.trim());

    const validLevels = ["beginner", "intermediate", "advanced", "expert"];
    parsed.skills = parsed.skills.map((s: any) => ({
      ...s,
      level: validLevels.includes(s.level) ? s.level : "intermediate",
      category: s.category || "General",
    }));
    parsed.experiences = parsed.experiences.map((e: any) => ({
      ...e,
      is_current: e.is_current ?? false,
      description: e.description ?? "",
      start_date: e.start_date ?? "",
    }));
    parsed.education = parsed.education.map((e: any) => ({
      ...e,
      degree: e.degree ?? "",
      field: e.field ?? "",
      start_year: typeof e.start_year === "number" ? e.start_year : (parseInt(String(e.start_year)) || new Date().getFullYear()),
    }));
    parsed.projects = parsed.projects.map((p: any) => ({
      ...p,
      description: p.description ?? "",
      tech_stack: Array.isArray(p.tech_stack) ? p.tech_stack : [],
    }));

    const hasName = !!parsed.full_name?.trim();
    const hasData = parsed.education.length > 0 || parsed.experiences.length > 0 || parsed.projects.length > 0 || parsed.skills.length > 0;
    if (!hasName || !hasData) {
      res.status(422).json({ error: "Could not extract meaningful data from this resume. Please try a different file." });
      return;
    }

    res.json({ success: true, parsed });
  } catch (err: any) {
    console.error("[Storage] Resume AI parse failed:", err);
    res.status(500).json({ error: err.message ?? "Failed to parse resume with AI." });
  }
});

/**
 * POST /api/storage/generate-bio
 * Body: { full_name, headline?, skills?, education?, experience? }
 * Returns: { bio: string }
 */
router.post("/generate-bio", async (req, res) => {
  try {
    const { full_name, headline, skills, education, experience } = req.body as {
      full_name?: string;
      headline?: string;
      skills?: string[];
      education?: string;
      experience?: string;
    };

    if (!full_name?.trim()) {
      res.status(400).json({ error: "full_name is required." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "AI service not configured on the server." });
      return;
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `Write a professional 2-3 sentence bio in first person for a student portfolio.
Name: ${full_name}
Headline: ${headline ?? ""}
Skills: ${skills?.join(", ") ?? ""}
Education: ${education ?? ""}
Recent experience: ${experience ?? ""}

Return ONLY the bio text, no quotes, no extra text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const bio = (completion.choices[0]?.message?.content ?? "").trim();
    res.json({ success: true, bio });
  } catch (err: any) {
    console.error("[Storage] Bio generation failed:", err);
    res.status(500).json({ error: err.message ?? "Failed to generate bio." });
  }
});

export default router;
