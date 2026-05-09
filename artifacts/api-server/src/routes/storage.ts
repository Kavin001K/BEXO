import { Router } from "express";
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

export default router;
