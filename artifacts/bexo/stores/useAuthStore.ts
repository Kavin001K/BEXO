import { Session, User } from "@supabase/supabase-js";
import { router } from "expo-router";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { createEncryptedJSONStorage } from "@/lib/zustandEncryptedStorage";
import { useProfileStore } from "./useProfileStore";

const authPersistStorage = createEncryptedJSONStorage();

/** Single subscription — avoids duplicate listeners (e.g. React Strict Mode). */
let supabaseAuthSubscription: { unsubscribe: () => void } | null = null;

function ensureSupabaseAuthListener() {
  if (supabaseAuthSubscription || !isSupabaseConfigured) return;
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    useAuthStore.setState({
      session,
      user: session?.user ?? null,
    });

    if (event === "SIGNED_IN" && session?.user) {
      const user = session.user;
      const isGoogleUser = user.app_metadata?.provider === "google";
      if (isGoogleUser) {
        await handleGoogleAccountMergeCheck(user.id, user.email ?? "");
      }
      useProfileStore.getState().fetchProfile(user.id);
    } else if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
      if (event === "SIGNED_OUT") {
        useProfileStore.getState().reset();
      }
    }
  });
  supabaseAuthSubscription = data.subscription;
}

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
  /** In-memory only — user must accept before each OTP send (phone auth). */
  dataConsentAccepted: boolean;
  setDataConsentAccepted: (val: boolean) => void;
}

const RESET_STATE = {
  session: null,
  user: null,
  isLoading: false,
  phoneNumber: "",
  collectedEmail: "",
  collectedPhone: "",
  otpSentAt: null,
  dataConsentAccepted: false,
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
    .maybeSingle();

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
    // 1. Clear profile store first
    useProfileStore.getState().reset();
    
    // 2. Clear auth store state locally
    set(RESET_STATE);

    // 3. Clear session from Supabase
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    
    // 4. Finally redirect
    router.replace("/(auth)");
  },

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }

    // Safety: Ensure we don't hang forever if getSession or fetchProfile hangs
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Auth initialization timeout")), 10000)
    );

    try {
      const initPromise = (async () => {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[BEXO Auth] Initialization error:", error.message);
          if (error.message.includes("Refresh Token") || error.message.includes("not found")) {
            await supabase.auth.signOut();
            set(RESET_STATE);
            return;
          }
        }

        const session = data.session;
        
        if (session?.user) {
          try {
            await useProfileStore.getState().fetchProfile(session.user.id);
          } catch (pErr) {
            console.error("[BEXO Auth] Profile fetch failed during init:", pErr);
          }
          set({ session, user: session.user });
        }
      })();

      await Promise.race([initPromise, timeoutPromise]);
      set({ isLoading: false });
      ensureSupabaseAuthListener();
    } catch (err: any) {
      console.error("[BEXO Auth] Unexpected init failure or timeout:", err);
      set({ isLoading: false });
    }
  },
  hasSeenWalkthrough: false,
  setHasSeenWalkthrough: (val) => set({ hasSeenWalkthrough: val }),

  dataConsentAccepted: false,
  setDataConsentAccepted: (val) => set({ dataConsentAccepted: val }),
}), {
  name: "bexo-auth-storage",
  storage: createJSONStorage(() => authPersistStorage),
  partialize: (state) => ({
    phoneNumber: state.phoneNumber,
    collectedEmail: state.collectedEmail,
    collectedPhone: state.collectedPhone,
    otpSentAt: state.otpSentAt,
    hasSeenWalkthrough: state.hasSeenWalkthrough,
  }),
}));
