import { Alert, Platform } from "react-native";

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
