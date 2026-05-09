import { supabase } from "@/lib/supabase";

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

export async function uploadFile(
  bucket: "avatars" | "resumes" | "projects",
  storagePath: string,
  uri: string,
  contentType: string = "application/octet-stream"
): Promise<{ url: string; storagePath: string }> {
  const blob = await uriToBlob(uri);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, { contentType, upsert: true });

  if (error) throw new Error(error.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return { url: publicUrl, storagePath: data.path };
}
