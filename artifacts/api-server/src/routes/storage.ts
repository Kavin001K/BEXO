import { Router, raw } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "bexo";
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// Public base URL for the R2 bucket (if a custom domain is configured on the bucket, use that instead)
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_URL ?? `${R2_ENDPOINT}/${R2_BUCKET_NAME}`;

/**
 * POST /api/storage/upload-url
 * Body: { key: string, contentType: string }
 * Returns: { url: string (presigned PUT URL), publicUrl: string }
 */
router.post("/upload-url", async (req, res) => {
  try {
    const { key, contentType } = req.body as { key?: string; contentType?: string };
    if (!key) {
      res.status(400).json({ error: "key is required" });
      return;
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType ?? "application/octet-stream",
    });

    const url = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 minute window

    res.json({
      url,
      publicUrl: `${R2_PUBLIC_BASE}/${key}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to generate upload URL" });
  }
});

/**
 * POST /api/storage/upload
 * Headers: x-key, content-type
 * Body: binary data
 * This route is used to proxy uploads and avoid CORS issues on web.
 */
router.post("/upload", raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
  try {
    const key = req.headers["x-key"] as string;
    const contentType = req.headers["content-type"] as string;

    if (!key) {
      res.status(400).json({ error: "x-key header is required" });
      return;
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      Body: req.body as Buffer,
    });

    await r2.send(command);

    res.json({
      success: true,
      publicUrl: `${R2_PUBLIC_BASE}/${key}`,
    });
  } catch (err: any) {
    console.error("[Storage] Proxy upload failed:", err);
    res.status(500).json({ error: err.message ?? "Failed to upload file via proxy" });
  }
});

export default router;
