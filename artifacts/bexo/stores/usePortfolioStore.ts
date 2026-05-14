import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/lib/apiConfig";
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

interface Attachment {
  id: string;
  update_id: string;
  url: string;
  type: "image" | "pdf";
}

interface Update {
  id: string;
  profile_id: string;
  type: "project" | "achievement" | "role" | "education";
  title: string;
  description: string;
  link_url?: string | null;
  created_at: string;
  attachments?: Attachment[];
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
  addUpdate: (update: Omit<Update, "id" | "created_at" | "attachments">, attachments?: Omit<Attachment, "id" | "update_id">[]) => Promise<void>;
  updateUpdate: (id: string, updates: Partial<Omit<Update, "id" | "created_at" | "attachments">>) => Promise<void>;
  deleteUpdate: (id: string) => Promise<void>;
  addAttachment: (updateId: string, attachment: Omit<Attachment, "id" | "update_id">) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  triggerBuild: (profileId: string) => Promise<void>;
  subscribeToBuilds: (profileId: string) => () => void;
  fetchAnalytics: (profileId: string) => Promise<void>;
}

/** Prevents duplicate site_builds rows + parallel n8n calls from double-tap. */
let triggerBuildInFlightFor: string | null = null;

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
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
      .select(`
        *,
        attachments:update_attachments(*)
      `)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    if (data) set({ updates: data });
  },

  addUpdate: async (update, attachments = []) => {
    // 1. Insert Update
    const { data: updateData, error: updateError } = await supabase
      .from("updates")
      .insert(update)
      .select()
      .single();
    
    if (updateError) throw updateError;

    // 2. Insert Attachments if any
    if (attachments.length > 0) {
      const { error: attachError } = await supabase
        .from("update_attachments")
        .insert(
          attachments.map(a => ({
            update_id: updateData.id,
            url: a.url,
            type: a.type
          }))
        );
      if (attachError) console.error("Failed to insert attachments:", attachError);
    }

    // 3. Refresh updates
    await get().fetchUpdates(update.profile_id);
  },

  updateUpdate: async (id, updates) => {
    const { error } = await supabase
      .from("updates")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
    
    // Optimistic update
    set((s) => ({
      updates: s.updates.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    }));
  },

  deleteUpdate: async (id) => {
    const { error } = await supabase
      .from("updates")
      .delete()
      .eq("id", id);
    if (error) throw error;
    
    set((s) => ({
      updates: s.updates.filter((u) => u.id !== id),
    }));
  },

  addAttachment: async (updateId, attachment) => {
    const { data, error } = await supabase
      .from("update_attachments")
      .insert({ ...attachment, update_id: updateId })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      set((s) => ({
        updates: s.updates.map((u) => 
          u.id === updateId ? { ...u, attachments: [...(u.attachments || []), data] } : u
        ),
      }));
    }
  },

  deleteAttachment: async (attachmentId) => {
    const { error } = await supabase
      .from("update_attachments")
      .delete()
      .eq("id", attachmentId);
    if (error) throw error;
    
    set((s) => ({
      updates: s.updates.map((u) => ({
        ...u,
        attachments: u.attachments?.filter((a) => a.id !== attachmentId),
      })),
    }));
  },

  triggerBuild: async (profileId) => {
    if (triggerBuildInFlightFor === profileId) return;
    triggerBuildInFlightFor = profileId;

    const markBuildFailed = async (buildId: string | undefined) => {
      if (!buildId) return;
      await supabase
        .from("site_builds")
        .update({ status: "failed" })
        .eq("id", buildId);
    };

    try {
      set({ buildStatus: "queued" });
      const { data: buildData, error: insertErr } = await supabase
        .from("site_builds")
        .insert({ profile_id: profileId, status: "queued" })
        .select()
        .single();

      if (insertErr || !buildData?.id) {
        console.warn("[Portfolio] site_builds insert failed:", insertErr?.message);
        set({ buildStatus: "idle", currentBuild: null });
        return;
      }

      set({ currentBuild: buildData });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        console.warn("[Portfolio] No session token — skipping n8n trigger-build proxy");
        await markBuildFailed(buildData.id);
        set({ buildStatus: "failed", currentBuild: buildData });
        return;
      }

      try {
        const res = await apiFetch("/portfolio/trigger-build", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ profileId, buildId: buildData.id }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          console.warn("[Portfolio] trigger-build API failed:", res.status, payload);
          await markBuildFailed(buildData.id);
          set({ buildStatus: "failed", currentBuild: buildData });
        }
      } catch (e) {
        console.warn("[Portfolio] trigger-build network error:", e);
        await markBuildFailed(buildData.id);
        set({ buildStatus: "failed", currentBuild: buildData });
      }
    } finally {
      triggerBuildInFlightFor = null;
    }
  },

  /**
   * Loads counts from `site_analytics` (RLS: owner read). Public portfolio pages
   * should insert rows with anon client: event_type view | click | share.
   */
  fetchAnalytics: async (profileId) => {
    const countFor = async (eventType: "view" | "click" | "share") => {
      const { count, error } = await supabase
        .from("site_analytics")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .eq("event_type", eventType);
      if (error) {
        console.warn("[Portfolio] fetchAnalytics:", eventType, error.message);
        return 0;
      }
      return count ?? 0;
    };
    const [views, clicks, shares] = await Promise.all([
      countFor("view"),
      countFor("click"),
      countFor("share"),
    ]);
    set({ analytics: { views, clicks, shares } });
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
}), {
  name: "bexo-portfolio-storage",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    portfolioUrl: state.portfolioUrl,
    updates: state.updates,
    analytics: state.analytics,
  }),
}));
