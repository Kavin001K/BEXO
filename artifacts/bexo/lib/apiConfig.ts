import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Strip trailing slashes so `${API_BASE_URL}/api/...` is always valid.
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Base URL for the BEXO API server.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL — always wins when set (EAS / .env production & preview builds).
 * 2. In dev only: Expo debugger host → LAN IP :3000 (local api-server).
 * 3. Web fallback localhost; native emulator fallback.
 */
function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (
    explicit &&
    (explicit.startsWith("https://") || explicit.startsWith("http://"))
  ) {
    let url = normalizeBaseUrl(explicit);
    if (Platform.OS === "android" && url.includes("localhost")) {
      url = url.replace("localhost", "10.0.2.2");
    }
    if (__DEV__) {
      console.log(`[API] Using EXPO_PUBLIC_API_BASE_URL: ${url}`);
    }
    return url;
  }

  const debuggerHost =
    Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost;

  if (
    __DEV__ &&
    debuggerHost &&
    !process.env.EXPO_PUBLIC_FORCE_PROD
  ) {
    const ip = debuggerHost.split(":")[0];
    const url = `http://${ip}:3000`;
    console.log(`[API] Auto-detected local backend: ${url}`);
    return url;
  }

  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  return Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
}

export const API_BASE_URL = getApiBaseUrl();

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}/api${path}`;
  if (__DEV__) {
    console.log(`[API] Fetching: ${url}`, options.method ?? "GET");
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    if (__DEV__) {
      console.log(`[API] Response: ${res.status} from ${url}`);
    }
    return res;
  } catch (error) {
    console.error(`[API] Network Error for ${url}:`, error);
    throw error;
  }
}
