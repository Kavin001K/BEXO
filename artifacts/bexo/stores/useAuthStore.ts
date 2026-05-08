import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  phoneNumber: string;
  setSession: (session: Session | null) => void;
  setPhoneNumber: (phone: string) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  phoneNumber: "",

  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),

  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ session: null, user: null });
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
