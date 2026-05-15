import express from "express";
import multer from "multer";
import { uploadToR2, objectExists, renameObject } from "../lib/r2.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { callGemini } from "../lib/ai.js";
import sharp from "sharp";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/storage/upload
 * Handles all file uploads with organized folder structure.
 * Automatically rotates old avatars and resumes into a 'bin' folder.
 * Converts images to JPG for consistency.
 */
/**
 * POST /api/storage/upload
 * Handles all file uploads with organized folder structure.
 * Supports both multipart/form-data (req.file) and raw binary body (req.body).
 */
router.post("/upload", upload.single("file"), express.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
  try {
    let finalBuffer: Buffer | undefined;
    let finalContentType: string | undefined;
    let originalName: string = "unknown";

    // 1. Extract file data from either Multer or raw body
    if (req.file) {
      finalBuffer = req.file.buffer;
      finalContentType = req.file.mimetype;
      originalName = req.file.originalname;
    } else if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      finalBuffer = req.body;
      finalContentType = (req.headers["content-type"] as string) || "application/octet-stream";
      originalName = (req.headers["x-key"] as string)?.split("/").pop() || "upload";
    }

    if (!finalBuffer) {
      console.warn("[Storage] No file data found in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const syncType = req.headers["x-sync-type"] as string; // 'avatar' | 'resume'
    const profileId = req.headers["x-profile-id"] as string;
    const authHeader = req.headers["authorization"];
    const profileUrlColumn: "avatar_url" | "resume_url" | undefined =
      syncType === "avatar" ? "avatar_url" : syncType === "resume" ? "resume_url" : undefined;

    let customKey: string | undefined;

    // 2. Fetch user handle if profileId is provided
    let handle = "common";
    if (profileId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("handle")
        .eq("id", profileId)
        .single();
      
      if (profile?.handle) {
        handle = profile.handle.toLowerCase();
      }
    }

    // 3. Handle specialized sync logic (Avatar/Resume)
    if (syncType === "avatar" && profileId) {
      // Server-side normalization of avatar to high-quality JPG
      try {
        finalBuffer = await sharp(finalBuffer)
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        finalContentType = "image/jpeg";
      } catch (err) {
        console.error("[Storage] Sharp avatar processing failed:", err);
        // Fallback to original buffer if sharp fails
      }
      
      const stableKey = `${handle}/avatar.jpg`;
      const binKey = `${handle}/bin/avatar-${Date.now()}.jpg`;

      if (await objectExists(stableKey)) {
        await renameObject(stableKey, binKey);
      }
      
      customKey = stableKey;
    } else if (syncType === "resume" && profileId) {
      const stableKey = `${handle}/resume.pdf`;
      const binKey = `${handle}/bin/resume-${Date.now()}.pdf`;

      if (await objectExists(stableKey)) {
        await renameObject(stableKey, binKey);
      }
      
      customKey = stableKey;
    } else {
      // Default organized storage for attachments or projects
      const timestamp = Date.now();
      customKey = (req.headers["x-key"] as string) || `${handle}/attachments/${timestamp}-${originalName}`;
    }

    // 4. Upload to R2
    const publicUrl = await uploadToR2(
      finalBuffer,
      originalName,
      finalContentType || "application/octet-stream",
      customKey
    );

    // 5. Sync to Supabase if profileId and auth are present
    if (profileId && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("id", profileId)
          .single();

        if (profile && profile.user_id === user.id && profileUrlColumn) {
          await supabaseAdmin
            .from("profiles")
            .update({ [profileUrlColumn]: publicUrl })
            .eq("id", profileId);

          console.log(`[Storage] Synced ${syncType} for ${handle} to Supabase`);
        }
      }
    }

    // Return versioned URL to client for immediate UI feedback
    return res.status(200).json({ 
      publicUrl: `${publicUrl}?v=${Date.now()}`,
      cleanUrl: publicUrl,
      key: customKey 
    });
  } catch (error: any) {
    console.error("[Storage Error]:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/storage/parse-pdf
 * Extracts text from binary PDF data using Gemini.
 */
router.post("/parse-pdf", express.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
  try {
    if (!req.body || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Request body must be binary PDF data" });
      return;
    }

    const text = await callGemini([
      {
        inlineData: {
          data: req.body.toString("base64"),
          mimeType: "application/pdf"
        }
      },
      "Extract all text from this PDF document as accurately as possible."
    ]);
    
    res.json({
      success: true,
      text: text,
    });
  } catch (err: any) {
    console.error("[Storage] Gemini PDF parsing failed:", err);
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
 * Converts resume text to structured JSON using AI.
 */
router.post("/parse-resume", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || text.trim().length < 50) {
      res.status(400).json({ error: "Resume text is required and must be at least 50 characters." });
      return;
    }

    const raw = await callGemini(`Here is the full text of a resume:\n\n---\n${text}\n---\n\n${EXTRACTION_PROMPT}`);
    
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
 * Generates a professional bio based on profile context.
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

    const prompt = `Write a professional 2-3 sentence bio in first person for a student portfolio.
Name: ${full_name}
Headline: ${headline ?? ""}
Skills: ${skills?.join(", ") ?? ""}
Education: ${education ?? ""}
Recent experience: ${experience ?? ""}

Return ONLY the bio text, no quotes, no extra text.`;

    const bio = await callGemini(prompt);
    
    res.json({ success: true, bio });
  } catch (err: any) {
    console.error("[Storage] Bio generation failed:", err);
    res.status(500).json({ error: err.message ?? "Failed to generate bio." });
  }
});

export default router;
