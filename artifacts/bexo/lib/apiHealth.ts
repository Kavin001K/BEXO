import { apiFetch, API_BASE_URL } from "@/lib/apiConfig";

export interface ApiHealthStatus {
  ok: boolean;
  ai: boolean;
  n8n: boolean;
  r2: boolean;
  error?: string;
}

let cached: ApiHealthStatus | null = null;
let inflight: Promise<ApiHealthStatus> | null = null;

export function getCachedApiHealth(): ApiHealthStatus | null {
  return cached;
}

export function isServerAiAvailable(): boolean {
  if (cached) return cached.ai;
  return true;
}

/**
 * Single-flight health check against production/local API.
 */
export async function checkApiHealth(force = false): Promise<ApiHealthStatus> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await apiFetch("/healthz", { method: "GET" });
      if (!res.ok) {
        const fail: ApiHealthStatus = {
          ok: false,
          ai: false,
          n8n: false,
          r2: false,
          error: `HTTP ${res.status}`,
        };
        cached = fail;
        return fail;
      }
      const text = await res.text();
      let data: {
        status?: string;
        ai?: boolean;
        n8n?: boolean;
        r2?: boolean;
      };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        const fail: ApiHealthStatus = {
          ok: false,
          ai: false,
          n8n: false,
          r2: false,
          error:
            "API host did not return JSON. Check EXPO_PUBLIC_API_BASE_URL points at the Express api-server, not the portfolio site router.",
        };
        cached = fail;
        console.warn(`[API] health parse failed at ${API_BASE_URL}:`, text.slice(0, 120));
        return fail;
      }
      const status: ApiHealthStatus = {
        ok: data.status === "ok",
        ai: !!data.ai,
        n8n: !!data.n8n,
        r2: !!data.r2,
      };
      cached = status;
      if (!__DEV__) {
        console.log(
          `[API] health base=${API_BASE_URL} ai=${status.ai} n8n=${status.n8n} r2=${status.r2}`,
        );
      }
      return status;
    } catch (e) {
      const fail: ApiHealthStatus = {
        ok: false,
        ai: false,
        n8n: false,
        r2: false,
        error: e instanceof Error ? e.message : String(e),
      };
      cached = fail;
      return fail;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
