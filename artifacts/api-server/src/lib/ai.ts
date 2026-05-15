import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolvePrimaryModel, resolveFallbackModel } from "./ai-models";

/**
 * Resolves the Google API Key from environment variables.
 */
function resolveGoogleApiKey(): string {
  return (
    process.env.GEMINI_API_KEY?.trim() || 
    process.env.GOOGLE_API_KEY?.trim() || 
    process.env.EXPO_PUBLIC_GOOGLE_API_KEY?.trim() ||
    ""
  ).replace(/["']/g, "");
}

/**
 * Universal Gemini caller using only Direct Google SDK.
 * Optimized for Gemini 2.5 Flash Lite and Gemini 3 Flash Preview.
 */
export async function callGemini(
  prompt: string | any[],
  modelNameOverride?: string
): Promise<string> {
  const key = resolveGoogleApiKey();
  if (!key) {
    throw new Error("Missing Google API Key. Please check GOOGLE_API_KEY in .env");
  }

  const primaryModel = resolvePrimaryModel();
  const fallbackModel = resolveFallbackModel();
  const modelToUse = modelNameOverride || primaryModel;

  const genAI = new GoogleGenerativeAI(key);
  
  try {
    console.info(`[AI] Calling Google SDK: ${modelToUse}...`);
    const model = genAI.getGenerativeModel({ model: modelToUse });
    
    // Handle both text and multimodal prompts
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error(`Empty response from ${modelToUse}`);
    }
    
    return text;
  } catch (err: any) {
    console.warn(`[AI] Google SDK failed for ${modelToUse}: ${err.message}`);
    
    // Auto-retry with fallback if primary fails and we haven't tried fallback yet
    if (!modelNameOverride && modelToUse !== fallbackModel) {
      console.warn(`[AI] Retrying with fallback model ${fallbackModel}...`);
      return callGemini(prompt, fallbackModel);
    }
    
    throw err;
  }
}
