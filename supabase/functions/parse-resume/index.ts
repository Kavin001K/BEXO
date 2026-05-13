const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Chunked binary string then btoa — avoids huge spreads / apply arg limits. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/** Default when GOOGLE_MODEL / GEMINI_MODEL secrets are unset */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { resumeUrl } = await req.json();

    if (!resumeUrl) {
      return new Response(JSON.stringify({ error: "resumeUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    if (!geminiKey) {
      console.error("[parse-resume] Error: No API key found in Deno.env");
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY or GOOGLE_API_KEY not set in Supabase secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiModel =
      Deno.env.get("GOOGLE_MODEL")?.trim() ||
      Deno.env.get("GEMINI_MODEL")?.trim() ||
      DEFAULT_GEMINI_MODEL;
    console.log(`[parse-resume] Model: ${geminiModel}`);

    // 1. Fetch the PDF
    console.log(`[parse-resume] Fetching PDF from: ${resumeUrl}`);
    const pdfResp = await fetch(resumeUrl);
    if (!pdfResp.ok) {
      console.error(`[parse-resume] PDF fetch failed: ${pdfResp.status} ${pdfResp.statusText}`);
      throw new Error(`Failed to fetch PDF from storage: ${pdfResp.status} ${pdfResp.statusText}`);
    }

    const pdfBytes = await pdfResp.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(pdfBytes);
    console.log(`[parse-resume] PDF fetched and encoded. Size: ${pdfBytes.byteLength} bytes`);

    // 2. Prepare Gemini Prompt
    const prompt = `**Role**: Expert Career Data Extraction Agent
**Objective**: Analyze the provided resume (PDF) and extract professional, educational, and project-based data into a strictly valid JSON format.

**Instructions**:
1. **Multimodal Analysis**: Use visual layout context to identify sidebars (Contact/Skills) versus main body text (Experience/Education).
2. **Date Normalization**: Convert all years to numbers. If only a year is provided for experience, use "Month YYYY".
3. **Boolean Logic**: If an entry has no end date or says "Present/Current", set \`is_current\` or \`still_studying\` to \`true\`.
4. **Content Optimization**: Summarize long paragraphs into punchy, high-impact bullet points for descriptions.
5. **Strict Output**: Output ONLY valid JSON matching the schema below. No markdown fences.

**JSON Schema**:
{
  "full_name": "string",
  "headline": "concise professional headline",
  "bio": "2-3 sentence summary",
  "email": "string",
  "phone": "string",
  "location": "string",
  "github_url": "string",
  "linkedin_url": "string",
  "website": "string",
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "start_year": number,
      "end_year": number (null if current),
      "gpa": "string",
      "description": "string"
    }
  ],
  "experiences": [
    {
      "company": "string",
      "role": "string",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD (null if current)",
      "is_current": boolean,
      "description": "Bullet points summarizing achievements"
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "tech_stack": ["string"],
      "live_url": "string",
      "github_url": "string"
    }
  ],
  "skills": [
    {
      "name": "string",
      "category": "string",
      "level": "beginner" | "intermediate" | "advanced" | "expert"
    }
  ]
}`;

    async function callGemini(useJsonMime: boolean): Promise<Response> {
      const geminiUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
      const generationConfig: Record<string, unknown> = { temperature: 0.1 };
      if (useJsonMime) {
        generationConfig.responseMimeType = "application/json";
      }
      console.log(`[parse-resume] Calling ${geminiModel} API (jsonMode=${useJsonMime})...`);
      return fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64,
                },
              },
            ],
          }],
          generationConfig,
        }),
      });
    }

    let geminiResp = await callGemini(true);
    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.warn(`[parse-resume] Gemini first attempt failed (${geminiResp.status}), retry without JSON mime:`, errText.slice(0, 500));
      geminiResp = await callGemini(false);
    }

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error(`[parse-resume] Gemini API error (${geminiResp.status}):`, errText);
      throw new Error(`AI API returned error ${geminiResp.status}: ${errText}`);
    }

    const geminiData = await geminiResp.json();
    let content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Use regex to extract the first JSON object found in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    // Verify it's valid JSON
    try {
      JSON.parse(content);
    } catch (e) {
      console.error("[parse-resume] Invalid JSON from AI:", content);
      throw new Error("AI returned an unparseable response");
    }

    console.log("[parse-resume] Successfully parsed resume data.");
    return new Response(content, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[parse-resume] Fatal Exception:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
