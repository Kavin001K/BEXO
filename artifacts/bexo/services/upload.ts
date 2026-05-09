import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { apiFetch } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";

/**
 * File upload via Cloudflare R2 using presigned URLs from the API server.
 *
 * Folder structure in R2 (bucket: bexo):
 *   avatars/  {userId}/avatar-{timestamp}.jpg
 *   resumes/  {userId}/resume-{timestamp}.pdf
 *   projects/ {userId}/{projectId}-{timestamp}.jpg
 */

async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    return response.arrayBuffer();
  }
  // Native: use expo-file-system v55 class-based API
  return new File(uri).arrayBuffer();
}

async function uploadToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string> {
  // Get presigned upload URL from API server
  const resp = await apiFetch("/storage/upload-url", {
    method: "POST",
    body: JSON.stringify({ key, contentType }),
  });
  const { url, publicUrl, error } = await resp.json();
  if (!resp.ok || error) throw new Error(error ?? "Failed to get upload URL");

  // Upload directly to R2
  const uploadResp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!uploadResp.ok) {
    throw new Error(`R2 upload failed: ${uploadResp.status}`);
  }

  return publicUrl as string;
}

export async function uploadAvatar(
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(10);

  // Compress to max 400×400 JPEG at 82% quality
  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );

  onProgress?.(40);
  const bytes = await readFileBytes(compressed.uri);
  onProgress?.(65);

  const key = `avatars/${userId}/avatar-${Date.now()}.jpg`;
  const publicUrl = await uploadToR2(key, bytes, "image/jpeg");

  // Update profile with the new avatar URL
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (profileData) {
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profileData.id);
  }

  onProgress?.(100);
  return publicUrl;
}

export async function uploadResume(
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(20);
  const bytes = await readFileBytes(localUri);
  onProgress?.(60);

  const key = `resumes/${userId}/resume-${Date.now()}.pdf`;
  const publicUrl = await uploadToR2(key, bytes, "application/pdf");

  // Update profile with resume URL
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (profileData) {
    await supabase
      .from("profiles")
      .update({ resume_url: publicUrl })
      .eq("id", profileData.id);
  }

  onProgress?.(100);
  return publicUrl;
}

export async function uploadProjectImage(
  userId: string,
  projectId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(10);

  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  onProgress?.(40);
  const bytes = await readFileBytes(compressed.uri);
  onProgress?.(70);

  const key = `projects/${userId}/${projectId}-${Date.now()}.jpg`;
  const publicUrl = await uploadToR2(key, bytes, "image/jpeg");

  onProgress?.(100);
  return publicUrl;
}

// Legacy compatibility — keep uploadFile for existing callers (resumeParser.ts)
export async function uploadFile(
  bucket: "avatars" | "resumes" | "projects",
  storagePath: string,
  uri: string,
  contentType: string = "application/octet-stream"
): Promise<{ url: string; storagePath: string }> {
  const bytes = await readFileBytes(uri);
  const key = `${bucket}/${storagePath}`;
  const url = await uploadToR2(key, bytes, contentType);
  return { url, storagePath: key };
}
