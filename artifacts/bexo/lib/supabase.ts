import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setupURLPolyfill } from "react-native-url-polyfill";
import { createClient, processLock } from "@supabase/supabase-js";

if (Platform.OS !== "web") {
  setupURLPolyfill();
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    lock: processLock,
  },
});

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
  !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.EXPO_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co";
