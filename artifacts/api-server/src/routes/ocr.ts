import { Router } from "express";
import pdf from "pdf-parse";
import { uploadToR2 } from "../lib/r2";

const router = Router();

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY ?? "";
const AI_MODEL = "deepseek-chat";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const SCAN_PROMPT = `You are an expert at extracting achievement and education details from certificates.
Extracted text from a document:
---
{{EXTRACTED_TEXT}}
---

Extract the following details and return ONLY a JSON object:
{
  "title": "Clear concise name of the achievement or degree",
  "description": "2-3 sentences explaining what was achieved based on the certificate details",
  "date": "YYYY-MM-DD or null",
  "type": "achievement" | "education"
}

Rules:
- If it's a degree/diploma, type is "education".
- If it's a certificate of completion/excellence/hackathon, type is "achievement".
- Be professional and concise.`;

router.post("/scan-attachment", async (req: any, res: any) => {
  try {
    const { attachments } = req.body; // Expecting { attachments: { base64, mimeType, fileName }[] }
    if (!attachments || !Array.isArray(attachments)) {
      return res.status(400).send("No attachments provided or invalid format");
    }

    const results: any[] = [];
    let combinedText = "";

    console.log(`[scan-attachment] Processing ${attachments.length} attachments...`);

    for (const file of attachments) {
      const { base64, mimeType, fileName } = file;
      if (!base64) continue;

      const buffer = Buffer.from(base64, "base64");

      // 1. Upload to Cloudflare R2
      const r2Url = await uploadToR2(buffer, fileName || "attachment", mimeType);
      results.push({ url: r2Url, type: mimeType.includes("pdf") ? "pdf" : "image" });

      // 2. Extract text
      if (mimeType === "application/pdf") {
        try {
          const data = await pdf(buffer);
          combinedText += `\n--- File: ${fileName} ---\n${data.text}\n`;
        } catch (e) {
          console.error(`Failed to parse PDF ${fileName}:`, e);
        }
      } else if (mimeType.startsWith("image/")) {
        try {
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker("eng");
          const { data: { text } } = await worker.recognize(buffer);
          await worker.terminate();
          combinedText += `\n--- File: ${fileName} (OCR) ---\n${text}\n`;
        } catch (e) {
          console.error(`Failed to OCR image ${fileName}:`, e);
        }
      }
    }

    if (!combinedText.trim()) {
      return res.status(400).send("Could not extract any text from the provided documents");
    }

    // 3. Call DeepSeek
    console.log("[scan-attachment] Calling DeepSeek with combined context...");
    const prompt = SCAN_PROMPT.replace("{{EXTRACTED_TEXT}}", combinedText);

    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`AI error: ${err}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content ?? "{}";
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();

    const parsed = JSON.parse(clean);
    
    res.json({
      ...parsed,
      attachments: results
    });
  } catch (error: any) {
    console.error("[scan-attachment] Error:", error);
    res.status(500).send(error.message);
  }
});

router.post("/upload-multi", async (req: any, res: any) => {
  try {
    const { attachments } = req.body;
    if (!attachments || !Array.isArray(attachments)) return res.status(400).send("No content provided");

    const results = [];
    for (const file of attachments) {
      const buffer = Buffer.from(file.base64, "base64");
      const r2Url = await uploadToR2(buffer, file.fileName || "attachment", file.mimeType);
      results.push({ url: r2Url, type: file.mimeType.includes("pdf") ? "pdf" : "image" });
    }

    res.json({ attachments: results });
  } catch (error: any) {
    console.error("[upload-multi] Error:", error);
    res.status(500).send(error.message);
  }
});

export default router;
