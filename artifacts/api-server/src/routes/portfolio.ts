import { Router } from "express";
import { logger } from "../lib/logger";
import { uploadPortfolioDataJson } from "../lib/gcsPortfolio";
import { buildPortfolioSnapshot } from "../lib/portfolioSnapshot";
import { computeProfileCompleteness } from "../lib/profileCompleteness";
import { supabaseAdmin, createUserClient } from "../lib/supabase";

const router = Router();

async function loadProfileGraph(profileId: string) {
  const { data: profile, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (pErr || !profile) return null;

  const [edu, exp, proj, sk] = await Promise.all([
    supabaseAdmin.from("education").select("id").eq("profile_id", profileId),
    supabaseAdmin.from("experiences").select("id").eq("profile_id", profileId),
    supabaseAdmin.from("projects").select("id").eq("profile_id", profileId),
    supabaseAdmin.from("skills").select("id").eq("profile_id", profileId),
  ]);

  return {
    profile,
    education: edu.data ?? [],
    experiences: exp.data ?? [],
    projects: proj.data ?? [],
    skills: sk.data ?? [],
  };
}

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

  const userClient = createUserClient(token);

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

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id, handle")
    .eq("id", profileId)
    .single();

  if (profileErr || !profile || profile.user_id !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: "forbidden", message: "Profile does not belong to this user" },
    });
    return;
  }

  if (!profile.handle || profile.handle.trim() === "") {
    res.status(400).json({
      success: false,
      error: { code: "bad_request", message: "Profile handle is not set" },
    });
    return;
  }

  // Check if a build is already in progress (queued or building status) for this profileId (excluding the current buildId)
  const { data: activeBuild, error: activeErr } = await supabaseAdmin
    .from("site_builds")
    .select("id")
    .eq("profile_id", profileId)
    .in("status", ["queued", "building"])
    .neq("id", buildId)
    .limit(1)
    .maybeSingle();

  if (activeErr) {
    logger.error({ err: activeErr }, "Error checking active builds");
  }

  if (activeBuild) {
    res.status(409).json({
      success: false,
      error: { code: "conflict", message: "A build is already in progress for this profile" },
    });
    return;
  }

  const { data: build, error: buildErr } = await supabaseAdmin
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

  const graph = await loadProfileGraph(profileId);
  if (!graph) {
    res.status(404).json({
      success: false,
      error: { code: "not_found", message: "Profile not found" },
    });
    return;
  }

  const completion = computeProfileCompleteness(graph);
  if (!completion.isPassing) {
    const logMsg = `Profile incomplete (${completion.score}/90): ${completion.missingFields.map((m) => m.label).join(", ")}`;
    await supabaseAdmin
      .from("site_builds")
      .update({ status: "failed", build_log: logMsg })
      .eq("id", buildId);

    res.status(403).json({
      success: false,
      error: {
        code: "profile_incomplete",
        message: "Complete at least 90% of your profile before building your website",
        score: completion.score,
        missingFields: completion.missingFields,
      },
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
      const errorDetails = `n8n returned status ${n8nRes.status}: ${text.slice(0, 1000)}`;
      logger.warn(
        { status: n8nRes.status, body: text.slice(0, 500) },
        "n8n webhook returned non-OK",
      );

      await supabaseAdmin
        .from("site_builds")
        .update({ status: "failed", build_log: errorDetails })
        .eq("id", buildId);

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

    await supabaseAdmin
      .from("site_builds")
      .update({ status: "failed", build_log: message })
      .eq("id", buildId);

    res.status(502).json({
      success: false,
      error: { code: "n8n_unreachable", message },
    });
  }
});

/**
 * POST /api/portfolio/sync-data
 * Push fresh profile snapshot to GCS data.json (no AI rebuild).
 */
router.post("/sync-data", async (req, res) => {
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

  const { profileId } = req.body as { profileId?: string };
  if (!profileId) {
    res.status(400).json({
      success: false,
      error: { code: "bad_request", message: "profileId is required" },
    });
    return;
  }

  const userClient = createUserClient(token);
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

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select(
      "*,projects(*),skills(*),experiences(*),education(*)",
    )
    .eq("id", profileId)
    .single();

  if (profileErr || !profile || profile.user_id !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: "forbidden", message: "Profile does not belong to this user" },
    });
    return;
  }

  const snapshot = buildPortfolioSnapshot(profile);
  const jsonBody = JSON.stringify(snapshot, null, 2);

  try {
    const uri = await uploadPortfolioDataJson(profileId, jsonBody);

    await supabaseAdmin
      .from("profiles")
      .update({ is_published: true })
      .eq("id", profileId);

    res.json({
      success: true,
      syncedAt: snapshot.syncedAt,
      version: snapshot.version,
      uri,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, profileId }, "sync-data GCS upload failed");
    res.status(502).json({
      success: false,
      error: { code: "sync_failed", message },
    });
  }
});

export default router;
