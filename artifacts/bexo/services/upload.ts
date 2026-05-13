import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import { detectResumeMime } from "@/lib/mediaMime";
import { supabase } from "@/lib/supabase";

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Failed to fetch file from URI: ${res.statusText}`);
  return await res.blob();
}

async function uriToDataUrl(uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(blob);
  });
}

/** Stored in profiles.resume_url for Cloudflare-backed résumés */
export function formatR2ResumeRef(key: string): string {
  return `r2:${key}`;
}

export function parseR2ResumeRef(ref: string): string | null {
  if (!ref.startsWith("r2:")) return null;
  return ref.slice(3);
}

/**
 * Upload résumé to Cloudflare R2 via Supabase Edge Function `upload`, then AI reads it using `r2Key`.
 */
export async function uploadResumeToCloudflare(
  userId: string,
  localUri: string,
  fileName: string,
  onProgress?: (pct: number) => void
): Promise<{ key: string; publicUrl: string }> {
  onProgress?.(10);
  const dataUrl = await uriToDataUrl(localUri);
  onProgress?.(40);

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "resume";

  const { data, error } = await supabase.functions.invoke("upload", {
    body: {
      userId,
      folder: "resumes",
      file: dataUrl,
      fileName: safeName,
    },
  });

  onProgress?.(85);

  if (error) {
    console.error("[uploadResumeToCloudflare] Edge upload failed:", error);
    throw new Error(error.message ?? "Cloudflare upload failed");
  }

  const payload = data as { url?: string; key?: string };
  if (!payload?.key || !payload?.url) {
    throw new Error("Cloudflare upload returned an invalid response");
  }

  onProgress?.(100);
  return { key: payload.key, publicUrl: payload.url };
}

/**
 * Upload avatar — compress to 400×400 JPEG then upload to Supabase Storage.
 * Returns public CDN URL.
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(5);

  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  onProgress?.(30);

  const blob = await uriToBlob(compressed.uri);
  onProgress?.(60);

  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("[upload] Avatar upload failed:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }
  onProgress?.(90);

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
  onProgress?.(100);
  return urlData.publicUrl;
}

/**
 * Upload resume PDF — stored privately.
 * Returns the storage PATH (not a public URL — resumes are private).
 * Use getResumeSignedUrl() to get a temporary readable URL.
 */
export async function uploadResume(
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<{ path: string }> {
  onProgress?.(10);
  console.log("[uploadResume] Fetching blob...");
  const blob = await uriToBlob(localUri);
  const ab = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  const sniffed = detectResumeMime(bytes);
  const contentType =
    sniffed !== "application/octet-stream"
      ? sniffed
      : blob.type && blob.type.length > 0
        ? blob.type
        : "application/pdf";

  onProgress?.(45);

  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : contentType.includes("gif")
            ? "gif"
            : contentType.includes("jpeg") || contentType.includes("jpg")
              ? "jpg"
              : "bin";

  const path = `${userId}/resume-${Date.now()}.${ext}`;

  console.log("[uploadResume] Uploading to Supabase Storage...", contentType);
  const { data, error } = await supabase.storage
    .from("resumes")
    .upload(path, blob, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("[upload] Resume upload failed:", error);
    throw new Error(`Resume upload failed: ${error.message}`);
  }
  onProgress?.(100);

  return { path: data.path };
}

/**
 * Get a signed URL for the resume (valid 1 hour).
 */
export async function getResumeSignedUrl(storagePath: string): Promise<string> {
  if (storagePath.startsWith("r2:")) {
    throw new Error("This resume is stored on Cloudflare R2 (use public URL or server-side R2 signing).");
  }
  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(storagePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Upload project image — compress to max 1200px width.
 * Returns public CDN URL.
 */
export async function uploadProjectImage(
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(5);

  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
  );
  onProgress?.(35);

  const blob = await uriToBlob(compressed.uri);
  onProgress?.(65);

  const path = `${userId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from("projects")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(`Project image upload failed: ${error.message}`);
  onProgress?.(100);

  const { data: urlData } = supabase.storage.from("projects").getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function uploadFile(
  bucket: "avatars" | "resumes" | "projects",
  storagePath: string,
  uri: string,
  contentType = "application/octet-stream"
): Promise<{ url: string; storagePath: string }> {
  const blob = await uriToBlob(uri);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { url: urlData.publicUrl, storagePath: data.path };
}
