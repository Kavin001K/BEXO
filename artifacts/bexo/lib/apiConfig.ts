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
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server`;
  }

  // Local dev: extract the LAN IP from Expo's debugger host
  if (Platform.OS !== "web") {
    const debuggerHost =
      Constants.expoConfig?.hostUri ?? // SDK 49+
      (Constants as any).manifest?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(":")[0]; // e.g. "192.168.1.37"
      return `http://${ip}:3000`;
    }
  }

  // Fallback for web / simulator
  return "http://localhost:3000";
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
