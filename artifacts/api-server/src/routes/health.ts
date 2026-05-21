import { Router, type IRouter } from "express";

const router: IRouter = Router();

function flagConfigured(...values: (string | undefined)[]): boolean {
  return values.some((v) => !!v?.trim());
}

router.get("/healthz", (_req, res) => {
  const ai = flagConfigured(
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
  );
  const n8n = flagConfigured(process.env.N8N_WEBHOOK_URL);
  const r2 = flagConfigured(
    process.env.R2_ACCOUNT_ID,
    process.env.R2_ACCESS_KEY_ID,
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.R2_BUCKET_NAME,
  );

  res.json({
    status: "ok",
    ai,
    n8n,
    r2,
  });
});

export default router;
