-- ============================================================
-- Migration 004: New profile fields for onboarding flow
-- Run in Supabase SQL Editor
-- ============================================================

-- Add date of birth column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob DATE;

-- Add portfolio font preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_font TEXT NOT NULL DEFAULT 'modern';

-- Add website vibe preference (comma-separated selected values)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website_preference TEXT;

-- Add phone/email verified flags (if not already present)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Add unique constraint on (profile_id, name) for skills upsert
-- (Required for ON CONFLICT in bulkSaveSkills)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'skills_profile_id_name_key'
      AND conrelid = 'public.skills'::regclass
  ) THEN
    ALTER TABLE public.skills
      ADD CONSTRAINT skills_profile_id_name_key UNIQUE (profile_id, name);
  END IF;
END $$;
