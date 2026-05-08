import { supabase } from "@/lib/supabase";
import { uploadToR2 } from "./upload";

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

async function fileToBase64(fileUri: string): Promise<string> {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function uploadAndParseResume(
  fileUri: string,
  fileName: string,
  userId: string
): Promise<{ resumeUrl: string; parsed: ParsedResume }> {
  // Upload to R2
  const file = await fileToBase64(fileUri);
  const { url: resumeUrl } = await uploadToR2(userId, "resume", file, fileName);

  // Parse via edge function
  const { data, error } = await supabase.functions.invoke("parse-resume", {
    body: { resumeUrl, userId },
  });

  if (error) throw new Error(error.message);

  return { resumeUrl, parsed: data as ParsedResume };
}

export async function uploadAvatar(
  imageUri: string,
  userId: string
): Promise<string> {
  const file = await fileToBase64(imageUri);
  const { url } = await uploadToR2(userId, "avatar", file, "avatar.jpg");
  return url;
}

export async function uploadProjectImage(
  imageUri: string,
  userId: string
): Promise<string> {
  const file = await fileToBase64(imageUri);
  const { url } = await uploadToR2(userId, "projects", file, "project.jpg");
  return url;
}
