import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolvePrimaryModel, resolveFallbackModel } from "./ai-models";

/**
 * Resolves the Google API Key from environment variables.
 */
function resolveGoogleApiKey(): string {
  return (process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "").replace(/["']/g, "");
}

/**
 * Universal Gemini caller with support for Direct SDK and OpenRouter fallback.
 * Handles both text prompts and multimodal (inlineData) prompts.
 */
export async function callGemini(
  prompt: string | any[],
  modelNameOverride?: string
): Promise<string> {
  const key = resolveGoogleApiKey();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  
  const primaryModel = resolvePrimaryModel();
  const fallbackModel = resolveFallbackModel();
  const modelToUse = modelNameOverride || primaryModel;

  // 1. Try direct Google SDK if key exists
  if (key) {
    const genAI = new GoogleGenerativeAI(key);
    try {
      const model = genAI.getGenerativeModel({ model: modelToUse });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      console.warn(`[AI] Direct Google SDK failed for ${modelToUse}: ${err.message}`);
      // Only proceed to OpenRouter if we have a key and this wasn't an explicit model override failure
      if (!openRouterKey && (modelNameOverride || modelToUse === fallbackModel)) throw err;
    }
  }

  // 2. Try OpenRouter as fallback
  if (openRouterKey) {
    console.info(`[AI] Attempting OpenRouter fallback for ${modelToUse}...`);
    try {
      // OpenRouter expects google/ prefix for Gemini models
      const orModel = modelToUse.includes("/") ? modelToUse : `google/${modelToUse}`;
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mybexo.com",
          "X-Title": "BEXO"
        },
        body: JSON.stringify({
          model: orModel,
          messages: Array.isArray(prompt) 
            ? prompt.map(p => {
                if (typeof p === "string") return { role: "user", content: p };
                if (p.inlineData) {
                    // OpenRouter multimodal format: { role: "user", content: [{ type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } }] }
                    return {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`
                                }
                            }
                        ]
                    };
                }
                return { role: "user", content: JSON.stringify(p) };
              })
            : [{ role: "user", content: prompt }],
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter failed: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.error(`[AI] OpenRouter failed: ${err.message}`);
      if (modelNameOverride || modelToUse === fallbackModel) throw err;
    }
  }

  // 3. Fallback to secondary model if primary failed and we haven't tried fallback yet
  if (!modelNameOverride && modelToUse !== fallbackModel) {
    console.warn(`[AI] Retrying with fallback model ${fallbackModel}...`);
    return callGemini(prompt, fallbackModel);
  }

  throw new Error("AI processing failed: No valid API keys or models available.");
}
