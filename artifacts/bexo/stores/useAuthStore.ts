import { Session, User } from "@supabase/supabase-js";
import { router } from "expo-router";
import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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

export const useAuthStore = create<AuthState>((set, get) => ({
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
    set(RESET_STATE);
    router.replace("/(auth)");
  },

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isLoading: false,
      });
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
