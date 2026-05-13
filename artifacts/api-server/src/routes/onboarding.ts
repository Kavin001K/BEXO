import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * POST /api/onboarding/generate-bullets
 * Body: { role: string, company?: string }
 * Returns: { bullets: string[] }
 *
 * Generates 5 high-impact achievement bullet points for a given job role.
 */
router.post("/generate-bullets", async (req, res) => {
  try {
    const { role, company } = req.body as { role?: string; company?: string };
    if (!role?.trim()) {
      res.status(400).json({ error: "role is required" });
      return;
    }

    const prompt = `You are a professional resume writer. Generate exactly 5 concise, impactful achievement bullet points for someone who worked as a "${role}"${company ? ` at ${company}` : ""}. 

Rules:
- Each bullet starts with a strong action verb (Led, Built, Designed, Reduced, Increased, Shipped, etc.)
- Include quantifiable outcomes where possible (%, $, users, time saved)
- Keep each bullet under 20 words
- Be specific and realistic for the role
- No filler, no fluff

Return ONLY a JSON array of 5 strings, no markdown, no extra text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text().trim();
    
    let bullets: string[] = [];
    try {
      // Handle potential markdown code blocks in Gemini response
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      bullets = JSON.parse(clean);
      if (!Array.isArray(bullets)) bullets = [];
    } catch {
      const lines = raw.split("\n").filter((l) => l.trim().startsWith('"') || l.trim().startsWith("-") || l.trim().match(/^\d\./));
      bullets = lines.map((l) => l.replace(/^[-\d."\s]+/, "").replace(/"[,]?$/, "").trim()).filter(Boolean).slice(0, 5);
    }

    res.json({ bullets: bullets.slice(0, 5) });
  } catch (err: any) {
    console.error("[onboarding/generate-bullets]", err?.message);
    res.status(500).json({ error: "Failed to generate bullets", bullets: [] });
  }
});

/**
 * POST /api/onboarding/suggest-about
 * Body: { full_name, headline_hint?, bio_hint?, skills?: string[], target?: "headline" | "bio" | "both" }
 */
router.post("/suggest-about", async (req, res) => {
  try {
    const {
      full_name,
      headline_hint,
      bio_hint,
      skills,
      target = "both",
    } = req.body as {
      full_name?: string;
      headline_hint?: string;
      headline?: string;
      bio_hint?: string;
      skills?: string[];
      target?: "headline" | "bio" | "both";
    };

    if (!full_name?.trim()) {
      res.status(400).json({ error: "full_name is required" });
      return;
    }

    const prompt = `You help students write portfolio copy. Return ONLY valid JSON, no markdown.
Name: ${full_name.trim()}
Current headline idea: ${headline_hint ?? ""}
Current bio idea: ${bio_hint ?? ""}
Skills (comma-separated): ${(skills ?? []).join(", ")}

Rules:
- headline: max 90 characters, punchy, no quotes in the string
- bio: 2-3 sentences, first person, warm and professional, max 400 characters

Return shape: {"headline":"...","bio":"..."}
If target is "headline" you may still return both fields; the client will only use what it asked for.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text().trim().replace(/```json\n?|\n?```/g, "");
    let headline = "";
    let bio = "";
    try {
      const parsed = JSON.parse(raw) as { headline?: string; bio?: string };
      headline = (parsed.headline ?? "").trim().slice(0, 120);
      bio = (parsed.bio ?? "").trim().slice(0, 500);
    } catch {
      res.status(422).json({ error: "Could not parse AI response" });
      return;
    }

    if (target === "headline") res.json({ headline, bio: "" });
    else if (target === "bio") res.json({ headline: "", bio });
    else res.json({ headline, bio });
  } catch (err: any) {
    console.error("[onboarding/suggest-about]", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to suggest copy" });
  }
});

export default router;
