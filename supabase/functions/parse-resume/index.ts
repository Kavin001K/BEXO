import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { resumeUrl, userId } = await req.json();

    if (!resumeUrl) {
      return new Response(JSON.stringify({ error: "resumeUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the PDF
    const pdfResp = await fetch(resumeUrl);
    const pdfBytes = await pdfResp.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set in Supabase secrets");

    const prompt = `You are a resume parser. Extract structured data from the provided resume PDF.
Return ONLY valid JSON (no markdown, no code blocks) matching this exact schema:
{
  "full_name": string,
  "headline": string (15-60 chars, e.g. "CS Student · Full-Stack Developer"),
  "bio": string (2-4 sentences about the person),
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "github_url": string | null,
  "linkedin_url": string | null,
  "website": string | null,
  "education": [{ "institution": string, "degree": string, "field": string, "start_year": number, "end_year": number | null, "gpa": string | null }],
  "experiences": [{ "company": string, "role": string, "start_date": string, "end_date": string | null, "description": string, "is_current": boolean }],
  "projects": [{ "title": string, "description": string, "tech_stack": string[], "live_url": string | null, "github_url": string | null }],
  "skills": [{ "name": string, "category": string, "level": "beginner" | "intermediate" | "advanced" | "expert" }]
}`;

    // Try OpenAI gpt-4o with vision
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    });

    if (!openaiResp.ok) {
      const err = await openaiResp.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response
      const match = content.match(/\{[\s\S]+\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
