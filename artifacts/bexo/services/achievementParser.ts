import { apiFetch } from "@/lib/apiConfig";

async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri.split(",")[1];
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
}

export interface ScannedAchievement {
  title: string;
  description: string;
  date?: string | null;
  type: "achievement" | "education";
  attachments?: { url: string; type: "image" | "pdf" }[];
}

export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * Upload multiple attachments to Cloudflare R2 via API.
 */
export async function uploadAttachments(
  files: LocalFile[]
): Promise<{ url: string; type: "image" | "pdf" }[]> {
  console.log(`[achievementParser] Uploading ${files.length} attachments to R2...`);
  
  const attachments = await Promise.all(
    files.map(async (f) => {
      const base64 = await uriToBase64(f.uri);
      return { base64, mimeType: f.mimeType, fileName: f.name };
    })
  );

  const response = await apiFetch("/storage/upload-multi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attachments }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Failed to upload attachments");
  }

  const result = await response.json();
  return result.attachments;
}

/**
 * Scan multiple PDF/Image attachments with AI.
 */
export async function scanAttachments(
  files: LocalFile[]
): Promise<ScannedAchievement> {
  console.log(`[achievementParser] Scanning ${files.length} attachments with AI...`);
  
  const attachments = await Promise.all(
    files.map(async (f) => {
      const base64 = await uriToBase64(f.uri);
      return { base64, mimeType: f.mimeType, fileName: f.name };
    })
  );

  const response = await apiFetch("/storage/scan-attachment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attachments }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Failed to scan attachments");
  }

  return response.json();
}
