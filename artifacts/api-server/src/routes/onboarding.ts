import { Router } from "express";
import { callGemini } from "../lib/ai";

const router = Router();

/**
 * POST /api/onboarding/generate-bullets
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
- Return ONLY a JSON array of 5 strings.`;

    const text = await callGemini(prompt);
    
    let bullets: string[] = [];
    try {
      const clean = text.trim().replace(/```json\n?|\n?```/g, "");
      bullets = JSON.parse(clean);
    } catch {
      const lines = text.split("\n").filter((l) => l.trim().startsWith('"') || l.trim().startsWith("-") || l.trim().match(/^\d\./));
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
 */
router.post("/suggest-about", async (req, res) => {
  try {
    const { full_name, headline_hint, bio_hint, skills, target = "both" } = req.body as {
      full_name?: string;
      headline_hint?: string;
      bio_hint?: string;
      skills?: string[];
      target?: "headline" | "bio" | "both";
    };

    if (!full_name?.trim()) {
      res.status(400).json({ error: "full_name is required" });
      return;
    }

    const prompt = `You are a world-class portfolio copywriter.
Name: ${full_name.trim()}
Current headline hint: ${headline_hint ?? "not provided"}
Current bio hint: ${bio_hint ?? "not provided"}
Skills: ${(skills ?? []).join(", ")}

Task: Refine the portfolio copy.
Rules:
- HEADLINE: Max 25 characters. Must be extremely concise. Focus on the core value proposition (e.g. "Fullstack Developer"). It MUST fit on 1 short line.
- BIO: 2-3 sentences max. Professional, first-person.
- CONTEXT: If a hint is provided (like "Developer"), strictly follow that career path for suggestions.

Return shape (JSON): {"headline":"...","bio":"..."}`;

    const text = await callGemini(prompt);
    const clean = text.trim().replace(/```json\n?|\n?```/g, "");
    
    try {
      const parsed = JSON.parse(clean);
      const headline = (parsed.headline ?? "").trim().slice(0, 25); // Strict limit
      const bio = (parsed.bio ?? "").trim().slice(0, 500);

      if (target === "headline") res.json({ headline, bio: "" });
      else if (target === "bio") res.json({ headline: "", bio });
      else res.json({ headline, bio });
    } catch {
      res.status(422).json({ error: "Could not parse AI response" });
    }
  } catch (err: any) {
    console.error("[onboarding/suggest-about]", err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to suggest copy" });
  }
});

/**
 * POST /api/onboarding/suggest-skills
 */
router.post("/suggest-skills", async (req, res) => {
  try {
    const { headline, bio, existing_skills, experiences } = req.body;
    
    const prompt = `Based on this profile, suggest 8-10 relevant technical and soft skills for a portfolio.
Headline: ${headline}
Bio: ${bio}
Experience: ${JSON.stringify(experiences)}
Current Skills: ${JSON.stringify(existing_skills)}

Return ONLY a JSON array of strings.`;

    const text = await callGemini(prompt);
    const clean = text.trim().replace(/```json\n?|\n?```/g, "");
    const suggested = JSON.parse(clean);
    
    res.json({ skills: Array.isArray(suggested) ? suggested : [] });
  } catch (err: any) {
    console.error("[onboarding/suggest-skills]", err?.message);
    res.status(500).json({ error: "Failed to suggest skills" });
  }
});

/**
 * POST /api/onboarding/suggest-description
 */
router.post("/suggest-description", async (req, res) => {
  try {
    const { type, title, tech_stack } = req.body;
    
    const prompt = `Write a 2-sentence professional description for a ${type} titled "${title}".
${tech_stack?.length ? `Technologies used: ${tech_stack.join(", ")}` : ""}
Keep it impactful and outcome-oriented. 
Return ONLY the description text, no JSON, no quotes.`;

    const text = await callGemini(prompt);
    const description = text.trim().replace(/^"|"$/g, "");
    
    res.json({ description });
  } catch (err: any) {
    console.error("[onboarding/suggest-description]", err?.message);
    res.status(500).json({ error: "Failed to suggest description" });
  }
});

export default router;
