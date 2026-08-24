import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

/**
 * Base URL for the BEXO API server.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL (explicit override, e.g. production)
 * 2. EXPO_PUBLIC_DOMAIN (Replit sets this for proxied dev URLs)
 * 3. Auto-detect: use Expo's debuggerHost IP for native, localhost for web
 */
function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL && !process.env.EXPO_PUBLIC_API_BASE_URL.includes("localhost")) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server`;
  }
  if (Platform.OS !== "web") {
    const debuggerHost = Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost;
    if (debuggerHost) return `http://${debuggerHost.split(":")[0]}:3000`;
  }
  return "http://localhost:3000";
}

export const API_BASE_URL = getApiBaseUrl();

export async function readApiJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) throw new Error(`Request failed (${res.status}). Empty response.`);
    return {} as T;
  }
  if (trimmed.startsWith("<")) {
    throw new Error(`Cannot reach the BEXO API (got HTML, status ${res.status}). Set EXPO_PUBLIC_API_BASE_URL to your deployed API, or run the api-server on your LAN when using a physical device.`);
  }
  try { return JSON.parse(trimmed) as T; }
  catch { throw new Error(`Invalid response from API (status ${res.status}). Check EXPO_PUBLIC_API_BASE_URL — currently ${API_BASE_URL}.`); }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}/api${path}`;
  console.log(`[API] Fetching: ${url}`, options.method ?? "GET");

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(options.headers ?? {});
    headers.set("Content-Type", "application/json");
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    const res = await fetch(url, { ...options, headers });
    console.log(`[API] Response: ${res.status} from ${url}`);
    return res;
  } catch (error) {
    console.error(`[API] Network Error for ${url}:`, error);
    throw error;
  }
}
