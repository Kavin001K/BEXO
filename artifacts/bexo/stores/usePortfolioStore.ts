import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type BuildStatus = "idle" | "queued" | "building" | "done" | "failed";

interface SiteBuild {
  id: string;
  profile_id: string;
  status: BuildStatus;
  portfolio_url?: string | null;
  build_log?: string | null;
  created_at: string;
}

interface Update {
  id: string;
  profile_id: string;
  type: "project" | "achievement" | "role" | "education";
  title: string;
  description: string;
  created_at: string;
}

interface PortfolioState {
  buildStatus: BuildStatus;
  currentBuild: SiteBuild | null;
  portfolioUrl: string | null;
  updates: Update[];
  analytics: { views: number; clicks: number; shares: number };
  activePortfolioTab: string;
  setBuildStatus: (status: BuildStatus) => void;
  setPortfolioUrl: (url: string) => void;
  setActivePortfolioTab: (tab: string) => void;
  fetchBuildStatus: (profileId: string) => Promise<void>;
  fetchUpdates: (profileId: string) => Promise<void>;
  addUpdate: (update: Omit<Update, "id" | "created_at">) => Promise<void>;
  triggerBuild: (profileId: string) => Promise<void>;
  subscribeToBuilds: (profileId: string) => () => void;
}

const N8N_WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL ?? "";

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  buildStatus: "idle",
  currentBuild: null,
  portfolioUrl: null,
  updates: [],
  analytics: { views: 0, clicks: 0, shares: 0 },
  activePortfolioTab: "overview",

  setBuildStatus: (status) => set({ buildStatus: status }),
  setPortfolioUrl: (url) => set({ portfolioUrl: url }),
  setActivePortfolioTab: (tab) => set({ activePortfolioTab: tab }),

  fetchBuildStatus: async (profileId) => {
    const { data } = await supabase
      .from("site_builds")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) {
      set({
        currentBuild: data,
        buildStatus: data.status,
        portfolioUrl: data.portfolio_url,
      });
    }
  },

  fetchUpdates: async (profileId) => {
    const { data } = await supabase
      .from("updates")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    if (data) set({ updates: data });
  },

  addUpdate: async (update) => {
    const { data } = await supabase
      .from("updates")
      .insert(update)
      .select()
      .single();
    if (data) set((s) => ({ updates: [data, ...s.updates] }));
  },

  triggerBuild: async (profileId) => {
    set({ buildStatus: "queued" });
    const { data: buildData } = await supabase
      .from("site_builds")
      .insert({ profile_id: profileId, status: "queued" })
      .select()
      .single();
    if (buildData) set({ currentBuild: buildData });
    if (N8N_WEBHOOK_URL) {
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId, buildId: buildData?.id }),
        });
      } catch {
        // webhook failure is non-blocking
      }
    }
  },

  subscribeToBuilds: (profileId) => {
    const channelId = `builds:${profileId}:${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "site_builds",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const row = payload.new as SiteBuild;
          set({
            currentBuild: row,
            buildStatus: row.status,
            portfolioUrl: row.portfolio_url ?? get().portfolioUrl,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
