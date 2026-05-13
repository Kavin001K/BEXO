import { Session, User } from "@supabase/supabase-js";
import { router } from "expo-router";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useProfileStore } from "./useProfileStore";

const OTP_EXPIRY_MS = 10 * 60 * 1000;

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  phoneNumber: string;
  collectedEmail: string;
  collectedPhone: string;
  otpSentAt: number | null;
  setSession: (session: Session | null) => void;
  setPhoneNumber: (phone: string) => void;
  setCollectedEmail: (email: string) => void;
  setCollectedPhone: (phone: string) => void;
  setOtpSentAt: (ts: number | null) => void;
  isOtpExpired: () => boolean;
  getOtpRemainingSeconds: () => number;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  hasSeenWalkthrough: boolean;
  setHasSeenWalkthrough: (val: boolean) => void;
}

const RESET_STATE = {
  session: null,
  user: null,
  isLoading: false,
  phoneNumber: "",
  collectedEmail: "",
  collectedPhone: "",
  otpSentAt: null,
};

async function handleGoogleAccountMergeCheck(
  googleUserId: string,
  googleEmail: string
): Promise<void> {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id, id")
    .eq("email", googleEmail)
    .eq("email_verified", true)
    .neq("user_id", googleUserId)
    .single();

  if (existingProfile) {
    console.log(
      "[BEXO Auth] Existing phone account found for this Google email.",
      "Manual merge available in Settings → Linked Accounts."
    );
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  phoneNumber: "",
  collectedEmail: "",
  collectedPhone: "",
  otpSentAt: null,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),

  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  setCollectedEmail: (email) => set({ collectedEmail: email }),
  setCollectedPhone: (phone) => set({ collectedPhone: phone }),
  setOtpSentAt: (ts) => set({ otpSentAt: ts }),

  isOtpExpired: () => {
    const sentAt = get().otpSentAt;
    if (!sentAt) return false;
    return Date.now() - sentAt > OTP_EXPIRY_MS;
  },

  getOtpRemainingSeconds: () => {
    const sentAt = get().otpSentAt;
    if (!sentAt) return 0;
    const remaining = OTP_EXPIRY_MS - (Date.now() - sentAt);
    return Math.max(0, Math.floor(remaining / 1000));
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    useProfileStore.getState().reset();
    set(RESET_STATE);
    router.replace("/(auth)");
  },

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("[BEXO Auth] Initialization error:", error.message);
        // If the refresh token is invalid/not found, sign out to clear local state
        if (error.message.includes("Refresh Token") || error.message.includes("not found")) {
          await supabase.auth.signOut();
          set(RESET_STATE);
          return;
        }
      }

      const session = data.session;
      set({ session, user: session?.user ?? null, isLoading: false });

      if (session?.user) {
        useProfileStore.getState().fetchProfile(session.user.id);
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ session, user: session?.user ?? null });

        if (event === "SIGNED_IN" && session?.user) {
          const user = session.user;
          const isGoogleUser = user.app_metadata?.provider === "google";
          if (isGoogleUser) {
            await handleGoogleAccountMergeCheck(user.id, user.email ?? "");
          }
          useProfileStore.getState().fetchProfile(user.id);
        } else if (event === "SIGNED_OUT") {
          useProfileStore.getState().reset();
        } else if (event === "USER_UPDATED" && session?.user) {
          useProfileStore.getState().fetchProfile(session.user.id);
        }
      });
    } catch (err: any) {
      console.error("[BEXO Auth] Unexpected init failure:", err);
      set({ isLoading: false });
    }
  },
  hasSeenWalkthrough: false,
  setHasSeenWalkthrough: (val) => set({ hasSeenWalkthrough: val }),
}), {
  name: "bexo-auth-storage",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    phoneNumber: state.phoneNumber,
    collectedEmail: state.collectedEmail,
    collectedPhone: state.collectedPhone,
    otpSentAt: state.otpSentAt,
    hasSeenWalkthrough: state.hasSeenWalkthrough,
  }),
}));
