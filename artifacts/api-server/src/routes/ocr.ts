import { Router } from "express";
import { uploadToR2 } from "../lib/r2";
import { callGemini } from "../lib/ai";

const router = Router();

const SCAN_PROMPT = `You are an expert at extracting achievement and education details from certificates and documents.
Please analyze the attached document(s) and extract the key details.

Extract the following details and return ONLY a JSON object:
{
  "title": "Clear concise name of the achievement or degree",
  "description": "2-3 sentences explaining what was achieved based on the certificate details",
  "date": "YYYY-MM-DD or null",
  "type": "achievement" | "education"
}

Rules:
- If it's a degree/diploma/transcript, type is "education".
- If it's a certificate of completion/excellence/hackathon/award, type is "achievement".
- Be professional and concise.
- If multiple certificates are provided, summarize the most important one.`;

router.post("/scan-attachment", async (req: any, res: any) => {
  try {
    const { attachments } = req.body; // Expecting { attachments: { base64, mimeType, fileName }[] }
    if (!attachments || !Array.isArray(attachments)) {
      return res.status(400).send("No attachments provided or invalid format");
    }

    const uploadResults: any[] = [];
    const promptParts: any[] = [SCAN_PROMPT];

    console.log(`[scan-attachment] Processing ${attachments.length} attachments with Gemini...`);

    for (const file of attachments) {
      const { base64, mimeType, fileName } = file;
      if (!base64) continue;

      const buffer = Buffer.from(base64, "base64");

      // 1. Upload to Cloudflare R2
      const r2Url = await uploadToR2(buffer, fileName || "attachment", mimeType);
      uploadResults.push({ url: r2Url, type: mimeType.includes("pdf") ? "pdf" : "image" });

      // 2. Add to Gemini prompt parts
      promptParts.push({
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      });
    }

    if (promptParts.length === 1) {
      return res.status(400).send("Could not process any documents");
    }

    // 3. Call Gemini
    const content = await callGemini(promptParts);
    
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(clean);
    
    res.json({
      ...parsed,
      attachments: uploadResults
    });
  } catch (error: any) {
    console.error("[scan-attachment] Error:", error);
    res.status(500).send("An unexpected error occurred during processing.");
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
    res.status(500).send("An unexpected error occurred during upload.");
  }
});

export default router;
