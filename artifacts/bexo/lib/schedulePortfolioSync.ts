import { apiFetch } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";
import { usePortfolioStore } from "@/stores/usePortfolioStore";

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;

/**
 * Debounced push of profile data to GCS data.json when site is live.
 */
export function schedulePortfolioSync(profileId: string, delayMs = 3000): void {
  if (usePortfolioStore.getState().buildStatus !== "done") return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void runPortfolioSync(profileId);
  }, delayMs);
}

async function runPortfolioSync(profileId: string): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const res = await apiFetch("/portfolio/sync-data", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ profileId }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      console.warn("[Portfolio] sync-data failed:", res.status, payload);
    }
  } catch (e) {
    console.warn("[Portfolio] sync-data error:", e);
  } finally {
    syncInFlight = false;
  }
}
