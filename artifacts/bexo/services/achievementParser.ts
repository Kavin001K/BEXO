import { apiFetch } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

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
      const base64 = await FileSystem.readAsStringAsync(f.uri, {
        encoding: "base64",
      });
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
      const base64 = await FileSystem.readAsStringAsync(f.uri, {
        encoding: "base64",
      });
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
