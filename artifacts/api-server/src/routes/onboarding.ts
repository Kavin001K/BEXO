import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    let bullets: string[] = [];
    try {
      bullets = JSON.parse(raw);
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

export default router;
