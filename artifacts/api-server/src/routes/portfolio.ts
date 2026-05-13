import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";

const router = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://gtjbnvpvqzddkbatyqtr.supabase.co";

/**
 * POST /api/portfolio/trigger-build
 * Authenticated proxy to n8n — webhook URL and secret stay server-side only.
 */
router.post("/trigger-build", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: "unauthorized", message: "Missing or invalid Authorization header" },
    });
    return;
  }

  const { profileId, buildId } = req.body as {
    profileId?: string;
    buildId?: string;
  };

  if (!profileId || !buildId) {
    res.status(400).json({
      success: false,
      error: { code: "bad_request", message: "profileId and buildId are required" },
    });
    return;
  }

  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    res.status(500).json({
      success: false,
      error: { code: "config", message: "Server is missing Supabase anon key" },
    });
    return;
  }

  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    res.status(401).json({
      success: false,
      error: { code: "unauthorized", message: "Invalid or expired session" },
    });
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({
      success: false,
      error: { code: "config", message: "Server is missing service role key" },
    });
    return;
  }

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, user_id")
    .eq("id", profileId)
    .single();

  if (profileErr || !profile || profile.user_id !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: "forbidden", message: "Profile does not belong to this user" },
    });
    return;
  }

  const { data: build, error: buildErr } = await admin
    .from("site_builds")
    .select("id, profile_id")
    .eq("id", buildId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (buildErr || !build) {
    res.status(404).json({
      success: false,
      error: { code: "not_found", message: "Build record not found for this profile" },
    });
    return;
  }

  const n8nUrl = process.env.N8N_WEBHOOK_URL?.trim();
  if (!n8nUrl) {
    logger.info({ profileId, buildId }, "N8N_WEBHOOK_URL not set — skipping webhook");
    res.json({
      success: true,
      skipped: true,
      message: "Portfolio build queued; n8n webhook not configured on server",
    });
    return;
  }

  const secret = process.env.N8N_WEBHOOK_SECRET?.trim() ?? "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-BEXO-Secret"] = secret;

  try {
    const n8nRes = await fetch(n8nUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        profileId,
        buildId,
        triggered_by: "app",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!n8nRes.ok) {
      const text = await n8nRes.text();
      logger.warn(
        { status: n8nRes.status, body: text.slice(0, 500) },
        "n8n webhook returned non-OK",
      );
      res.status(502).json({
        success: false,
        error: {
          code: "n8n_error",
          message: "Downstream portfolio builder returned an error",
          details: text.slice(0, 200),
        },
      });
      return;
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "n8n webhook request failed");
    res.status(502).json({
      success: false,
      error: { code: "n8n_unreachable", message },
    });
  }
});

export default router;
