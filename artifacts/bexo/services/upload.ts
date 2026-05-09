import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { apiFetch } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";

/**
 * File upload via Cloudflare R2 using presigned URLs from the API server.
 */

async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  // Native: read as base64 and convert to Uint8Array
  try {
    // Robust way to get the encoding type constant or fallback to string literal
    const encoding = (EncodingType && EncodingType.Base64) ? EncodingType.Base64 : 'base64';
    
    console.log(`[Upload] Reading file: ${uri} with encoding: ${encoding}`);
    
    const base64 = await readAsStringAsync(uri, {
      encoding: encoding as any,
    });
    
    if (!base64) throw new Error("File is empty or could not be read");

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err: any) {
    console.error("[Upload] readFileBytes failed:", err);
    throw new Error(`Failed to read file: ${err.message}`);
  }
}

async function uploadToR2(
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<string> {
  // Web: Use the API server as a proxy to avoid R2 CORS issues on localhost
  if (Platform.OS === "web") {
    console.log(`[Upload] Web detected: Proxying upload via API server for: ${key}`);
    const resp = await apiFetch("/storage/upload", {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "x-key": key,
      },
      body,
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`[Upload] Proxy upload failed: ${resp.status}`, errorText);
      throw new Error(`Proxy upload failed: ${resp.status}`);
    }

    const { publicUrl, error } = await resp.json();
    if (error) throw new Error(error);
    return publicUrl as string;
  }

  // Native: Direct upload via presigned URL works fine (no CORS)
  console.log(`[Upload] Requesting presigned URL for: ${key}`);
  const resp = await apiFetch("/storage/upload-url", {
    method: "POST",
    body: JSON.stringify({ key, contentType }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error(`[Upload] Failed to get presigned URL: ${resp.status}`, errorText);
    throw new Error(`Failed to get upload URL: ${resp.status}`);
  }

  const { url, publicUrl, error } = await resp.json();
  if (error) throw new Error(error);

  console.log(`[Upload] Uploading to R2: ${url.split("?")[0]}`);
  const uploadResp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });

  if (!uploadResp.ok) {
    console.error(`[Upload] R2 upload failed: ${uploadResp.status}`);
    throw new Error(`R2 upload failed: ${uploadResp.status}`);
  }

  console.log(`[Upload] Successfully uploaded: ${publicUrl}`);
  return publicUrl as string;
}

export async function uploadAvatar(
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(10);

  // Normalize URI for native platforms (ensure it has file:// if it starts with /)
  let processedUri = localUri;
  if (Platform.OS !== "web" && localUri.startsWith("/") && !localUri.startsWith("file://")) {
    processedUri = `file://${localUri}`;
  }

  console.log(`[UploadAvatar] Processing URI: ${processedUri}`);

  // Compress to max 400×400 JPEG at 82% quality
  const compressed = await ImageManipulator.manipulateAsync(
    processedUri,
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
