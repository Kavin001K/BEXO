/**
 * Single source of truth for Gemini model IDs used by the API server.
 * Override via env: GOOGLE_MODEL, GOOGLE_MODEL_FALLBACK
 */
export const GEMINI_DEFAULT_PRIMARY = "gemini-2.0-flash";
export const GEMINI_DEFAULT_FALLBACK = "gemini-1.5-pro";

export function resolvePrimaryModel(): string {
  return (process.env.GOOGLE_MODEL?.trim() || GEMINI_DEFAULT_PRIMARY).replace(/["']/g, "");
}

export function resolveFallbackModel(): string {
  return (process.env.GOOGLE_MODEL_FALLBACK?.trim() || GEMINI_DEFAULT_FALLBACK).replace(/["']/g, "");
}
