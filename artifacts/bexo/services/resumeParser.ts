import { supabase } from "@/lib/supabase";

export interface ParsedResume {
  full_name?: string;
  headline?: string;
  bio?: string;
  email?: string;
  phone?: string;
  location?: string;
  github_url?: string;
  linkedin_url?: string;
  website?: string;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number;
    end_year?: number | null;
    gpa?: string | null;
  }>;
  experiences: Array<{
    company: string;
    role: string;
    start_date: string;
    end_date?: string | null;
    description: string;
    is_current: boolean;
  }>;
  projects: Array<{
    title: string;
    description: string;
    tech_stack: string[];
    live_url?: string | null;
    github_url?: string | null;
  }>;
  skills: Array<{
    name: string;
    category: string;
    level: "beginner" | "intermediate" | "advanced" | "expert";
  }>;
}

export async function uploadAndParseResume(
  fileUri: string,
  fileName: string,
  userId: string
): Promise<{ resumeUrl: string; parsed: ParsedResume }> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const path = `${userId}/${Date.now()}_${fileName}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, blob, { contentType: "application/pdf", upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from("resumes")
    .getPublicUrl(uploadData.path);

  const { data, error } = await supabase.functions.invoke("parse-resume", {
    body: { resumeUrl: urlData.publicUrl, userId },
  });

  if (error) throw new Error(error.message);

  return { resumeUrl: urlData.publicUrl, parsed: data as ParsedResume };
}

export async function uploadAvatar(
  imageUri: string,
  userId: string
): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const path = `${userId}/avatar_${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
