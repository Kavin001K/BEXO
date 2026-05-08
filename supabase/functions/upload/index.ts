import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME") ?? "bexo";

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const MIME_MAP: Record<string, string> = {
  "data:image/jpeg": "image/jpeg",
  "data:image/jpg": "image/jpeg",
  "data:image/png": "image/png",
  "data:image/webp": "image/webp",
  "data:image/gif": "image/gif",
  "data:application/pdf": "application/pdf",
};

function detectContentType(dataUrl: string): string {
  for (const [prefix, mime] of Object.entries(MIME_MAP)) {
    if (dataUrl.startsWith(prefix)) return mime;
  }
  return "application/octet-stream";
}

function base64ToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(",");
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function generateKey(userId: string, folder: string, fileName: string): string {
  const ts = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${folder}/${ts}_${safeName}`;
}

// AWS Signature V4 helpers
async function hmac(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = key instanceof ArrayBuffer ? new Uint8Array(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: Uint8Array | string): Promise<string> {
  const input = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function signRequest(
  method: string,
  bucket: string,
  key: string,
  contentType: string,
  payload: Uint8Array
): Promise<Headers> {
  const region = "auto";
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const host = `${bucket}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${key}`;
  const canonicalQuerystring = "";
  const payloadHash = await sha256(payload);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(new TextEncoder().encode("AWS4" + R2_SECRET_ACCESS_KEY), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = Array.from(new Uint8Array(await hmac(kSigning, stringToSign)))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Host", host);
  headers.set("x-amz-content-sha256", payloadHash);
  headers.set("x-amz-date", amzDate);
  headers.set("Authorization", authorization);
  return headers;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, folder, file, fileName } = await req.json();

    if (!userId || !folder || !file) {
      return new Response(JSON.stringify({ error: "userId, folder, and file required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = detectContentType(file as string);
    const key = generateKey(userId as string, folder as string, fileName ?? "file");
    const fileBytes = base64ToUint8Array(file as string);

    // Sign and upload to R2
    const signedHeaders = await signRequest("PUT", R2_BUCKET_NAME, key, contentType, fileBytes);
    const r2Url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
    const resp = await fetch(r2Url, {
      method: "PUT",
      headers: signedHeaders,
      body: fileBytes,
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`R2 upload failed (${resp.status}): ${err}`);
    }

    const publicUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return new Response(JSON.stringify({ url: publicUrl, key }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
