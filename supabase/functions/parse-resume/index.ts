import { fetchR2ObjectBytes } from "./r2_fetch.ts";

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

/** Must match how bytes were stored — wrong MIME (e.g. JPEG tagged as PDF) causes Google error "The document has no pages." */
function detectResumeMime(bytes: Uint8Array): string {
  if (bytes.length < 12) return "application/octet-stream";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return "application/octet-stream";
}

/** Primary when GOOGLE_MODEL / GEMINI_MODEL secrets are unset */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
/** Second attempt when GOOGLE_MODEL_FALLBACK secret is unset */
const DEFAULT_FALLBACK_MODEL = "gemini-3-flash-preview";

/** Prefer GOOGLE_API_KEY so a new key set via CLI wins over a stale GEMINI_API_KEY */
function resolveGeminiApiKey(): string | undefined {
  const raw =
    Deno.env.get("GOOGLE_API_KEY")?.trim() ||
    Deno.env.get("GEMINI_API_KEY")?.trim();
  return raw || undefined;
}

function isDocProcessingFailure(text: string): boolean {
  const low = text.toLowerCase();
  return (
    low.includes("no pages") ||
    low.includes("document has no pages") ||
    (low.includes("invalid_argument") && low.includes("document")) ||
    low.includes("unable to process this document") ||
    (low.includes("could not process") && low.includes("pdf"))
  );
}

async function geminiUploadResumable(
  apiKey: string,
  bytes: Uint8Array,
  mimeType: string,
  displayName: string,
): Promise<{ fileUri: string }> {
  const numBytes = bytes.byteLength;
  const startUrl =
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`;
  const startResp = await fetch(startUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(numBytes),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { displayName } }),
  });

  const uploadUrl =
    startResp.headers.get("x-goog-upload-url") ??
    startResp.headers.get("X-Goog-Upload-Url");
  if (!uploadUrl?.trim()) {
    const t = await startResp.text();
    throw new Error(`Gemini file upload start failed: ${startResp.status} ${t.slice(0, 400)}`);
  }

  const uploadResp = await fetch(uploadUrl.trim(), {
    method: "POST",
    headers: {
      "Content-Length": String(numBytes),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });

  const uploadJson = await uploadResp.json().catch(() => ({}));
  const file = uploadJson.file as { name?: string; uri?: string; state?: string } | undefined;
  if (!file?.uri || !file?.name) {
    throw new Error(`Gemini file upload finalize failed: ${uploadResp.status} ${JSON.stringify(uploadJson).slice(0, 600)}`);
  }

  if (file.state === "ACTIVE") {
    return { fileUri: file.uri };
  }

  const pollUrl = `${file.uri}${file.uri.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;
  for (let i = 0; i < 120; i++) {
    const info = await fetch(pollUrl);
    const meta = await info.json().catch(() => ({}));
    const state = meta.state ?? meta.file?.state;
    if (state === "ACTIVE") {
      return { fileUri: file.uri };
    }
    if (state === "FAILED") {
      throw new Error(`Gemini file processing FAILED: ${JSON.stringify(meta).slice(0, 500)}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Gemini uploaded file did not become ACTIVE in time");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as { resumeUrl?: string; r2Key?: string };
    const resumeUrl = typeof body.resumeUrl === "string" ? body.resumeUrl.trim() : "";
    const r2Key = typeof body.r2Key === "string" ? body.r2Key.trim() : "";

    if (!resumeUrl && !r2Key) {
      return new Response(JSON.stringify({ error: "Provide resumeUrl or r2Key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = resolveGeminiApiKey();
    if (!geminiKey) {
      console.error("[parse-resume] Error: No API key found in Deno.env");
      return new Response(JSON.stringify({ error: "GOOGLE_API_KEY or GEMINI_API_KEY not set in Supabase secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const primaryModel =
      Deno.env.get("GOOGLE_MODEL")?.trim() ||
      Deno.env.get("GEMINI_MODEL")?.trim() ||
      DEFAULT_GEMINI_MODEL;
    const fallbackResolved =
      Deno.env.get("GOOGLE_MODEL_FALLBACK")?.trim() ||
      Deno.env.get("GEMINI_MODEL_FALLBACK")?.trim() ||
      DEFAULT_FALLBACK_MODEL;

    console.log(`[parse-resume] Primary=${primaryModel} fallback=${fallbackResolved}`);

    let rawBytes: Uint8Array;
    if (r2Key) {
      console.log(`[parse-resume] Loading resume from Cloudflare R2 key: ${r2Key}`);
      rawBytes = await fetchR2ObjectBytes(r2Key);
    } else {
      console.log(`[parse-resume] Fetching document from URL`);
      const pdfResp = await fetch(resumeUrl);
      if (!pdfResp.ok) {
        console.error(`[parse-resume] Fetch failed: ${pdfResp.status} ${pdfResp.statusText}`);
        throw new Error(`Failed to fetch resume from URL: ${pdfResp.status} ${pdfResp.statusText}`);
      }
      rawBytes = new Uint8Array(await pdfResp.arrayBuffer());
    }
    if (rawBytes.byteLength < 16) {
      throw new Error("Resume file is empty or too small to parse.");
    }

    let mimeForGemini = detectResumeMime(rawBytes);
    if (mimeForGemini === "application/octet-stream") {
      mimeForGemini = "application/pdf";
      console.warn("[parse-resume] Unknown magic bytes — sending as application/pdf");
    }

    const pdfBase64 = arrayBufferToBase64(rawBytes.buffer as ArrayBuffer);
    console.log(
      `[parse-resume] Bytes=${rawBytes.byteLength} mime=${mimeForGemini}`,
    );

    const prompt = `You are an expert recruiter and data extraction system. The attached file is a résumé/CV.

It may be a born-digital PDF, a scan, a photo export, multi-column, dense tables, icons, or low resolution. Infer missing fields when reasonable.

**Rules**
1. Read ALL visible text including headers, footers, sidebars, skill pills, and tables (flatten tables into bullets).
2. For scans or photographed pages: OCR mentally — extract every role, date, school, and skill you can see.
3. Multi-column layouts: preserve chronological sense (usually left column / main column first).
4. Dates: normalize years to numbers; use "YYYY-MM-DD" when you can; else "Month YYYY"; ongoing roles use null end_date and is_current true.
5. Use empty string "" for unknown single fields; use [] for empty arrays — never omit required JSON keys.
6. Output **only** one JSON object — no markdown, no commentary, no code fences.

**JSON shape (fill every top-level key)**:
{
  "full_name": "string",
  "headline": "string",
  "bio": "string",
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
      "start_year": 0,
      "end_year": null,
      "gpa": "string",
      "description": "string"
    }
  ],
  "experiences": [
    {
      "company": "string",
      "role": "string",
      "start_date": "string",
      "end_date": null,
      "is_current": false,
      "description": "string"
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

    type Part =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
      | { fileData: { mimeType: string; fileUri: string } };

    async function callGemini(modelId: string, parts: Part[], useJsonMime: boolean): Promise<Response> {
      const geminiUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`;
      const generationConfig: Record<string, unknown> = { temperature: 0.1 };
      if (useJsonMime) {
        generationConfig.responseMimeType = "application/json";
      }
      console.log(`[parse-resume] ${modelId} jsonMode=${useJsonMime} parts=${parts.map((p) => "inlineData" in p ? "inline" : "fileData" in p ? "file" : "text").join("+")}`);
      return fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig,
        }),
      });
    }

    const modelCandidates = [primaryModel, fallbackResolved].filter(
      (m, i, arr) => m && arr.indexOf(m) === i,
    );

    let geminiResp: Response | null = null;
    let lastErrText = "";

    outer: for (const modelId of modelCandidates) {
      const tryPair = async (
        parts: Part[],
      ): Promise<{ ok: true; response: Response } | { ok: false; text: string; status: number }> => {
        let attempt = await callGemini(modelId, parts, false);
        if (!attempt.ok) {
          let errText = await attempt.text();
          const retryJsonMime = await callGemini(modelId, parts, true);
          if (!retryJsonMime.ok) {
            errText = await retryJsonMime.text();
            return { ok: false, text: errText, status: retryJsonMime.status };
          }
          return { ok: true, response: retryJsonMime };
        }
        return { ok: true, response: attempt };
      };

      const inlineParts: Part[] = [
        { text: prompt },
        { inlineData: { mimeType: mimeForGemini, data: pdfBase64 } },
      ];

      let result = await tryPair(inlineParts);
      if (!result.ok) {
        lastErrText = result.text;
        const low = lastErrText.toLowerCase();
        const isWrongModel =
          low.includes("not found") ||
          low.includes("not supported") ||
          low.includes("does not exist") ||
          low.includes("invalid model");
        const isBadKey =
          low.includes("api key not valid") ||
          low.includes("please pass a valid api key") ||
          low.includes("invalid api key") ||
          low.includes("api_key_invalid") ||
          low.includes("reported as leaked") ||
          (low.includes("permission_denied") &&
            (low.includes("api") || low.includes("key") || low.includes("consumer")));

        if (isBadKey) {
          throw new Error(`AI API returned error ${result.status}: ${lastErrText}`);
        }

        const tryFile =
          isDocProcessingFailure(lastErrText) &&
          (mimeForGemini === "application/pdf" || mimeForGemini.startsWith("image/"));

        if (tryFile) {
          console.warn("[parse-resume] Inline document rejected — retrying via Gemini File API…");
          try {
            const up = await geminiUploadResumable(
              geminiKey,
              rawBytes,
              mimeForGemini,
              `resume-${Date.now()}.${mimeForGemini === "application/pdf" ? "pdf" : "img"}`,
            );
            const fileParts: Part[] = [
              { text: prompt },
              { fileData: { mimeType: mimeForGemini, fileUri: up.fileUri } },
            ];
            result = await tryPair(fileParts);
          } catch (e) {
            console.error("[parse-resume] File API path failed:", e);
          }
        }

        if (!result.ok && isWrongModel && modelCandidates.indexOf(modelId) < modelCandidates.length - 1) {
          console.warn(`[parse-resume] Model ${modelId} not available, trying fallback model…`);
          continue outer;
        }
        if (!result.ok && modelCandidates.indexOf(modelId) < modelCandidates.length - 1) {
          console.warn(`[parse-resume] Model ${modelId} error, trying fallback model…`);
          continue outer;
        }
        if (!result.ok) {
          throw new Error(`AI API returned error ${result.status}: ${result.text}`);
        }
      }

      geminiResp = result.ok ? result.response : null;
      if (geminiResp) break;
    }

    if (!geminiResp || !geminiResp.ok) {
      console.error(`[parse-resume] Gemini API error:`, lastErrText.slice(0, 800));
      throw new Error(`AI API returned error: ${lastErrText || "unknown"}`);
    }

    const geminiData = await geminiResp.json();
    let content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    try {
      JSON.parse(content);
    } catch {
      console.error("[parse-resume] Invalid JSON from AI:", content.slice(0, 500));
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
