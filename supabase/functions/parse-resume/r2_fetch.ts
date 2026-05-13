/** Load resume bytes from Cloudflare R2 with SigV4 (path-style, matching api-server `S3Client` + `forcePathStyle: true`). */

async function hmac(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = key instanceof ArrayBuffer ? new Uint8Array(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    k,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const input = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA256 of empty body (same as AWS SigV4 empty payload hash). */
const EMPTY_PAYLOAD_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/**
 * Path-style R2 URL (must match api-server `S3Client` + `forcePathStyle: true`):
 *   https://{accountId}.r2.cloudflarestorage.com/{bucket}/{key}
 * Signing must use the same host + canonical path as the actual GET, or SigV4 returns 403 SignatureDoesNotMatch.
 */
function pathStyleBucketPath(
  accountId: string,
  bucket: string,
  objectKey: string,
): { host: string; canonicalUri: string; url: string } {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const cleanKey = objectKey.replace(/^\/+/, "");
  const encodedKey = cleanKey.split("/").filter((s) => s.length > 0).map(encodeURIComponent).join("/");
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const url = `https://${host}${canonicalUri}`;
  return { host, canonicalUri, url };
}

async function signR2GetHeaders(
  accountId: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
  objectKey: string,
): Promise<{ headers: Headers; url: string }> {
  const region = "auto";
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const { host, canonicalUri, url } = pathStyleBucketPath(accountId, bucket, objectKey);
  const canonicalQuerystring = "";

  const canonicalHeaders =
    `host:${host}\nx-amz-content-sha256:${EMPTY_PAYLOAD_HASH}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    EMPTY_PAYLOAD_HASH,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(new TextEncoder().encode("AWS4" + secretAccessKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = Array.from(new Uint8Array(await hmac(kSigning, stringToSign)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = new Headers();
  headers.set("Host", host);
  headers.set("x-amz-content-sha256", EMPTY_PAYLOAD_HASH);
  headers.set("x-amz-date", amzDate);
  headers.set("Authorization", authorization);
  return { headers, url };
}

export async function fetchR2ObjectBytes(objectKey: string): Promise<Uint8Array> {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")?.trim();
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")?.trim();
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")?.trim();
  const bucket = Deno.env.get("R2_BUCKET_NAME")?.trim() ?? "bexo";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials missing on parse-resume. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (same as upload function).",
    );
  }

  const { headers, url } = await signR2GetHeaders(accountId, bucket, accessKeyId, secretAccessKey, objectKey);

  const resp = await fetch(url, { method: "GET", headers });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`R2 GET failed (${resp.status}): ${t.slice(0, 400)}`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}
