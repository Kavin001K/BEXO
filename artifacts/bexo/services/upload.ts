import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Failed to fetch file from URI: ${res.statusText}`);
  return await res.blob();
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
  onProgress?.(45);

  const path = `${userId}/resume-${Date.now()}.pdf`;

  console.log("[uploadResume] Uploading to Supabase Storage...");
  const { data, error } = await supabase.storage
    .from("resumes")
    .upload(path, blob, {
      contentType: "application/pdf",
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
