import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Base URL for the BEXO API server.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL (explicit override, e.g. production)
 * 2. EXPO_PUBLIC_DOMAIN (Replit sets this for proxied dev URLs)
 * 3. Auto-detect: use Expo's debuggerHost IP for native, localhost for web
 */
function getApiBaseUrl(): string {
  // 1. If we are on web, localhost is fine.
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
  }

  // 2. For native (iOS/Android), prioritize auto-detecting the LAN IP.
  // This is the most stable way to ensure devices can talk to the server.
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? 
    (Constants as any).manifest?.debuggerHost;
  
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0]; 
    return `http://${ip}:3000`;
  }

  // 3. Fallback to explicit override if provided (useful for production or specific tunnels)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    const url = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (Platform.OS === "android" && url.includes("localhost")) {
      return url.replace("localhost", "10.0.2.2");
    }
    return url;
  }

  // 4. Ultimate fallback
  return Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
}

export const API_BASE_URL = getApiBaseUrl();

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}/api${path}`;
  console.log(`[API] Fetching: ${url}`, options.method ?? "GET");

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    console.log(`[API] Response: ${res.status} from ${url}`);
    return res;
  } catch (error) {
    console.error(`[API] Network Error for ${url}:`, error);
    throw error;
  }
}
