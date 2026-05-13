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
  // If we have an explicit override that isn't localhost, use it
  if (
    process.env.EXPO_PUBLIC_API_BASE_URL &&
    !process.env.EXPO_PUBLIC_API_BASE_URL.includes("localhost")
  ) {
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

/**
 * Parse JSON from an API response. Fails with a clear message when the server
 * returns HTML (404/502 pages, wrong host, proxy errors) instead of JSON —
 * avoids `JSON Parse error: Unexpected character: <` from `response.json()`.
 */
export async function readApiJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}). Empty response.`);
    }
    return {} as T;
  }
  if (trimmed.startsWith("<")) {
    throw new Error(
      `Cannot reach the BEXO API (got HTML, status ${res.status}). ` +
        `Set EXPO_PUBLIC_API_BASE_URL to your deployed API, or run the api-server on your LAN when using a physical device.`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      `Invalid response from API (status ${res.status}). Check EXPO_PUBLIC_API_BASE_URL — currently ${API_BASE_URL}.`,
    );
  }
}

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
