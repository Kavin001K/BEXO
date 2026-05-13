import { Alert, Platform } from "react-native";

/**
 * If Google blocked the key (leaked, invalid, billing), return a short actionable message.
 * Call this before sanitizeError for Gemini / Edge Function failures.
 */
export function explainGeminiApiFailure(message: string): string | undefined {
  const m = message.toLowerCase();
  if (
    m.includes("reported as leaked") ||
    m.includes("api key was reported") ||
    (m.includes("permission_denied") && m.includes("api key"))
  ) {
    return "Google revoked this Gemini API key because it was exposed publicly (never paste keys in chat, screenshots, or Git). Create a new key at https://aistudio.google.com/apikey , then update Supabase: npx supabase secrets set GOOGLE_API_KEY=<new_key> — no app reinstall needed.";
  }
  if (
    m.includes("api_key_invalid") ||
    m.includes("invalid api key") ||
    m.includes("api key not valid") ||
    m.includes("please pass a valid api key")
  ) {
    return "Gemini rejected this API key. Create a new key at aistudio.google.com/apikey , run npx supabase secrets set GOOGLE_API_KEY=… , and in Supabase Dashboard remove any duplicate GEMINI_API_KEY secret if present. Ensure parse-resume Edge Function is redeployed.";
  }
  return undefined;
}

/**
 * Sanitize technical error messages into user-friendly ones for production.
 */
export function sanitizeError(error: any): string {
  const message = error?.message || error?.error || (typeof error === "string" ? error : JSON.stringify(error));
  
  // If we are in dev mode, keep the technical message for debugging
  if (__DEV__) {
    return message;
  }

  // Common technical patterns to hide
  const technicalPatterns = [
    "java.lang",
    "NoClassDefFoundError",
    "ExponentFileSystem",
    "Network request failed",
    "JSON Parse error",
    "PGRST", // Supabase PostgREST
    "PostgREST",
    "Supabase",
    "Object object",
    "null is not an object",
    "undefined is not a function",
    "TypeError",
    "ReferenceError",
    "RangeError",
    "Internal Server Error",
    "Bad Gateway",
    "Service Unavailable",
    "Gateway Timeout",
    "400", "401", "403", "404", "500", "502", "503", "504",
    "fetch",
    "Permission",
    "E_PERMISSION",
    "E_UNABLE_TO_OPEN",
    "file system",
    "invalid json",
  ];

  if (technicalPatterns.some(p => message.includes(p))) {
    if (message.includes("Network") || message.includes("fetch")) {
      return "Connection error. Please check your internet and try again.";
    }
    return "Something went wrong. Please try again later.";
  }

  // If it's a short, readable message, it's likely a business logic error (e.g. "Invalid OTP")
  if (message.length < 60 && !message.includes("/") && !message.includes("\\")) {
    return message;
  }

  return "An unexpected error occurred.";
}

/**
 * Display a sanitized error alert to the user.
 */
export function showErrorAlert(error: any, title = "Error") {
  const message = sanitizeError(error);
  
  if (Platform.OS === "web") {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}
