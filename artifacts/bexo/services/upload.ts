const EDGE_FN = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/upload`;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function uploadToR2(
  userId: string,
  folder: "avatar" | "resume" | "projects",
  file: string, // base64 data URL or raw base64
  fileName?: string
): Promise<{ url: string; key: string }> {
  const resp = await fetch(EDGE_FN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ userId, folder, file, fileName }),
  });

  const result = await resp.json();
  if (!resp.ok) throw new Error(result.error ?? "Upload failed");
  return result;
}
