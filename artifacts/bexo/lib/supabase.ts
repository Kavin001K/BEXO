// ⚠️ cryptoPolyfill MUST be the very first import — it sets up
// globalThis.crypto.subtle before @supabase/supabase-js evaluates.
import "./cryptoPolyfill";

import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setupURLPolyfill } from "react-native-url-polyfill";
import { createClient } from "@supabase/supabase-js";

if (Platform.OS !== "web") {
  setupURLPolyfill();
}

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validation helper to catch unresolved EAS variables like "$VAR"
const isValidUrl = (url?: string) => {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("$")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl! : "https://placeholder.supabase.co";
const supabaseAnonKey = (rawKey && !rawKey.startsWith("$")) ? rawKey : "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // Must be true on web so Supabase auto-detects OAuth tokens in the URL
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
});

// Keep the Supabase token refresh in sync with app foreground/background state
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export const isSupabaseConfigured =
  isValidUrl(rawUrl) &&
  supabaseAnonKey !== "placeholder-anon-key";
