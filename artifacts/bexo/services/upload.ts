import * as ImageManipulator from "expo-image-manipulator";
import { apiFetch } from "@/lib/apiConfig";
import { decode } from "base64-arraybuffer";

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
 * Upload a file to Cloudflare R2 via the API server.
 */
async function uploadToR2(
  key: string,
  uri: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(10);
  const base64 = await uriToBase64(uri);
  const buffer = decode(base64);
  onProgress?.(50);

  const response = await apiFetch("/storage/upload", {
    method: "POST",
    headers: {
      "x-key": key,
      "content-type": contentType,
    },
    body: buffer,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to upload to Cloudflare R2");
  }

  const data = await response.json();
  onProgress?.(100);
  return data.publicUrl;
}

/**
 * Upload avatar — compress to 400×400 JPEG then upload to Cloudflare R2.
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

  const key = `avatars/${userId}-${Date.now()}.jpg`;
  return uploadToR2(key, compressed.uri, "image/jpeg", (p) => onProgress?.(30 + p * 0.7));
}

/**
 * Upload resume PDF to Cloudflare R2.
 */
export async function uploadResume(
  userId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<{ path: string; base64: string }> {
  onProgress?.(10);
  const base64 = await uriToBase64(localUri);
  const key = `resumes/${userId}-${Date.now()}.pdf`;
  
  const publicUrl = await uploadToR2(key, localUri, "application/pdf", (p) => onProgress?.(10 + p * 0.9));
  
  return { path: publicUrl, base64 };
}

/**
 * Get a "signed" URL (In R2 with public access, we just return the path/url).
 */
export async function getResumeSignedUrl(storagePath: string): Promise<string> {
  // If it's already a full URL, return it. Otherwise, it's a key.
  return storagePath;
}

/**
 * Upload project image — compress to max 1200px width then upload to Cloudflare R2.
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

  const key = `projects/${userId}-${Date.now()}.jpg`;
  return uploadToR2(key, compressed.uri, "image/jpeg", (p) => onProgress?.(35 + p * 0.65));
}

export async function uploadFile(
  bucket: "avatars" | "resumes" | "projects",
  storagePath: string,
  uri: string,
  contentType = "application/octet-stream"
): Promise<{ url: string; storagePath: string }> {
  const key = `${bucket}/${storagePath}`;
  const publicUrl = await uploadToR2(key, uri, contentType);
  return { url: publicUrl, storagePath: key };
}

