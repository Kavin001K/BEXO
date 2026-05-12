import * as ImageManipulator from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri.split(",")[1];
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? result);
      };
      reader.onerror = (e) => reject(new Error(`FileReader error: ${e}`));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("[uriToBase64] fetch failed:", e);
    throw e;
  }
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

  const base64 = await uriToBase64(compressed.uri);
  onProgress?.(55);

  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, decode(base64), {
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
): Promise<{ path: string; base64: string }> {
  onProgress?.(10);
  console.log("[uploadResume] Converting to base64...");
  const base64 = await uriToBase64(localUri);
  onProgress?.(45);

  const path = `${userId}/resume-${Date.now()}.pdf`;

  const { data, error } = await supabase.storage
    .from("resumes")
    .upload(path, decode(base64), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.error("[upload] Resume upload failed:", error);
    throw new Error(`Resume upload failed: ${error.message}`);
  }
  onProgress?.(100);

  return { path: data.path, base64 };
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

  const base64 = await uriToBase64(compressed.uri);
  onProgress?.(65);

  const path = `${userId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from("projects")
    .upload(path, decode(base64), { contentType: "image/jpeg", upsert: true });

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
  const base64 = await uriToBase64(uri);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, decode(base64), { contentType, upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { url: urlData.publicUrl, storagePath: data.path };
}
