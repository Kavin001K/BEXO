import { z } from "zod";

/** Matches Supabase `profiles_handle_check` (3–30 chars, lowercase alnum + hyphen). */
export const handleSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, "Use 3–30 lowercase letters, numbers, or hyphens (no leading/trailing hyphen).");

function optionalUrlField() {
  return z
    .string()
    .max(2048)
    .optional()
    .nullable()
    .superRefine((val, ctx) => {
      if (val == null || val.trim() === "") return;
      try {
        const u = new URL(val.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL must use http or https" });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid URL" });
      }
    })
    .transform((v) => (!v || v.trim() === "" ? null : v.trim()));
}

/** Partial patch for profile link fields + handle (client-side guard before Supabase). */
export const profileFieldPatchSchema = z
  .object({
    handle: handleSchema.optional(),
    linkedin_url: optionalUrlField(),
    github_url: optionalUrlField(),
    website: optionalUrlField(),
  })
  .strict();

export type ProfileFieldPatch = z.infer<typeof profileFieldPatchSchema>;

export function validateProfileFieldPatch(input: Record<string, unknown>): {
  success: true;
  data: ProfileFieldPatch;
} | {
  success: false;
  message: string;
} {
  const parsed = profileFieldPatchSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join(" ");
    return { success: false, message: msg || "Invalid profile fields" };
  }
  return { success: true, data: parsed.data };
}
