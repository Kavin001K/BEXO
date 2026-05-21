import { logger } from "./logger";

const PUBLIC_BUCKET = process.env.GCS_PUBLIC_BUCKET?.trim() || "bexo-sites-public";

/**
 * Upload portfolio data.json to GCS using Application Default Credentials
 * (GOOGLE_APPLICATION_CREDENTIALS on server) or GCS_SA_KEY_JSON env.
 */
export async function uploadPortfolioDataJson(
  profileId: string,
  jsonBody: string,
): Promise<string> {
  const objectPath = `${profileId}/site/data.json`;

  let Storage: typeof import("@google-cloud/storage").Storage;
  try {
    ({ Storage } = await import("@google-cloud/storage"));
  } catch {
    throw new Error(
      "GCS sync requires @google-cloud/storage. Install dependency or set CODEGEN_SYNC_URL fallback.",
    );
  }

  const keyJson = process.env.GCS_SA_KEY_JSON?.trim();
  const storage = keyJson
    ? new Storage({ credentials: JSON.parse(keyJson) as object })
    : new Storage();

  const bucket = storage.bucket(PUBLIC_BUCKET);
  const file = bucket.file(objectPath);
  await file.save(jsonBody, {
    contentType: "application/json",
    metadata: { cacheControl: "public, max-age=60" },
  });

  const uri = `gs://${PUBLIC_BUCKET}/${objectPath}`;
  logger.info({ uri }, "Uploaded portfolio data.json");
  return uri;
}
