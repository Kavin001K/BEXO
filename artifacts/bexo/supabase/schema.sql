-- ============================================================
-- BEXO — Complete Database Schema
-- Run this entire file in Supabase SQL Editor (Project → SQL Editor → New query)
--
-- Incremental changes for existing projects also live in:
--   ../../../supabase/migrations/  (e.g. 006_public_portfolio_rls_and_indexes.sql)
-- Prefer applying migrations in order for production; use this file for greenfield
-- or documentation of the full desired state.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles: one per authenticated user
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  handle        TEXT        UNIQUE, -- Nullable initially for OAuth signups
  full_name     TEXT        NOT NULL DEFAULT '',
  headline      TEXT        NOT NULL DEFAULT '',
  bio           TEXT        NOT NULL DEFAULT '',
  avatar_url    TEXT,
  location      TEXT,
  website       TEXT,
  linkedin_url  TEXT,
  github_url    TEXT,
  resume_url    TEXT,
  email         TEXT,
  phone         TEXT,
  is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
  portfolio_theme     TEXT        NOT NULL DEFAULT 'default',
  dob                 DATE,
  portfolio_font      TEXT        NOT NULL DEFAULT 'modern',
  website_preference  TEXT,
  phone_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  email_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  consent_accepted_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for skills upsert (profile_id + name)
-- This supports ON CONFLICT in bulk skill saves
CREATE UNIQUE INDEX IF NOT EXISTS skills_profile_id_name_key
  ON public.skills(profile_id, name);

-- Automatic profile creation on signup (resilient — won't crash on duplicates)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Education history
CREATE TABLE IF NOT EXISTS public.education (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  institution  TEXT        NOT NULL,
  degree       TEXT        NOT NULL,
  field        TEXT        NOT NULL,
  start_year   INT         NOT NULL,
  end_year     INT,
  gpa          TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work experience
CREATE TABLE IF NOT EXISTS public.experiences (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company      TEXT        NOT NULL,
  role         TEXT        NOT NULL,
  start_date   TEXT        NOT NULL,
  end_date     TEXT,
  description  TEXT        NOT NULL DEFAULT '',
  is_current   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  tech_stack   TEXT[]      NOT NULL DEFAULT '{}',
  live_url     TEXT,
  github_url   TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Skills
CREATE TABLE IF NOT EXISTS public.skills (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name         TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT '',
  level        TEXT        NOT NULL DEFAULT 'intermediate'
               CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timeline updates (achievements, posts)
CREATE TABLE IF NOT EXISTS public.updates (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type         TEXT        NOT NULL
               CHECK (type IN ('project', 'achievement', 'role', 'education')),
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Portfolio build pipeline
CREATE TABLE IF NOT EXISTS public.site_builds (
  id             UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'building', 'done', 'failed')),
  portfolio_url  TEXT,
  build_log      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Portfolio view analytics
CREATE TABLE IF NOT EXISTS public.site_analytics (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type   TEXT        NOT NULL
               CHECK (event_type IN ('view', 'click', 'share')),
  referrer     TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id    ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_handle     ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_education_profile   ON public.education(profile_id);
CREATE INDEX IF NOT EXISTS idx_experiences_profile ON public.experiences(profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_profile    ON public.projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_profile      ON public.skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_updates_profile     ON public.updates(profile_id);
CREATE INDEX IF NOT EXISTS idx_builds_profile      ON public.site_builds(profile_id);
CREATE INDEX IF NOT EXISTS idx_builds_status       ON public.site_builds(status);
CREATE INDEX IF NOT EXISTS idx_analytics_profile   ON public.site_analytics(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event     ON public.site_analytics(event_type);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER site_builds_updated_at
  BEFORE UPDATE ON public.site_builds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_builds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Owners manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read published profiles"
  ON public.profiles FOR SELECT
  USING (is_published = TRUE);

-- Education
CREATE POLICY "Owners manage own education"
  ON public.education FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public reads education of published profiles"
  ON public.education FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE is_published = TRUE));

-- Experiences
CREATE POLICY "Owners manage own experiences"
  ON public.experiences FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public reads experiences of published profiles"
  ON public.experiences FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE is_published = TRUE));

-- Projects
CREATE POLICY "Owners manage own projects"
  ON public.projects FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public reads projects of published profiles"
  ON public.projects FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE is_published = TRUE));

-- Skills
CREATE POLICY "Owners manage own skills"
  ON public.skills FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public reads skills of published profiles"
  ON public.skills FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE is_published = TRUE));

-- Updates
CREATE POLICY "Owners manage own updates"
  ON public.updates FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public reads updates of published profiles"
  ON public.updates FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE is_published = TRUE));

-- Site builds (private)
CREATE POLICY "Owners manage own builds"
  ON public.site_builds FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Site analytics (owners read; anyone can write for tracking)
CREATE POLICY "Owners read own analytics"
  ON public.site_analytics FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert analytics"
  ON public.site_analytics FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- REALTIME (for live build status updates)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'site_builds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_builds;
  END IF;
END $$;
-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Create storage buckets (run these if buckets don't exist yet)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',  'avatars',  true,  5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('resumes',  'resumes',  false, 10485760,
   ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('projects', 'projects', true,  20971520,
   ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Avatar policies (public read, owner write)
DROP POLICY IF EXISTS "Avatar public read"   ON storage.objects;
DROP POLICY IF EXISTS "Avatar owner upload"  ON storage.objects;
DROP POLICY IF EXISTS "Avatar owner update"  ON storage.objects;
DROP POLICY IF EXISTS "Avatar owner delete"  ON storage.objects;

CREATE POLICY "Avatar public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar owner upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Avatar owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Avatar owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Resume policies (owner only — private)
DROP POLICY IF EXISTS "Resume owner read"   ON storage.objects;
DROP POLICY IF EXISTS "Resume owner upload" ON storage.objects;
DROP POLICY IF EXISTS "Resume owner delete" ON storage.objects;

CREATE POLICY "Resume owner read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Resume owner upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Resume owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Project image policies (public read, owner write)
DROP POLICY IF EXISTS "Projects public read"   ON storage.objects;
DROP POLICY IF EXISTS "Projects owner upload"  ON storage.objects;
DROP POLICY IF EXISTS "Projects owner delete"  ON storage.objects;

CREATE POLICY "Projects public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'projects');
CREATE POLICY "Projects owner upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'projects' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Projects owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'projects' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- OTP VERIFICATION TABLE (replaces in-memory store)
-- ============================================================

-- The otp_codes table is created by supabase/migrations/003_otp_codes.sql
-- If it doesn't exist, run this:
-- CREATE TABLE IF NOT EXISTS public.otp_codes (
--   id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
--   phone       TEXT        NOT NULL,
--   code_hash   TEXT        NOT NULL,
--   expires_at  TIMESTAMPTZ NOT NULL,
--   verified    BOOLEAN     DEFAULT FALSE,
--   attempts    INT         DEFAULT 0,
--   created_at  TIMESTAMPTZ DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON public.otp_codes(phone);
-- CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON public.otp_codes(expires_at);

-- ============================================================
-- NOTE: Web OAuth redirect
-- Add your Replit dev URL to Supabase → Authentication → URL Configuration → Redirect URLs:
--   https://*.sisko.replit.dev/**
-- This allows Google OAuth to redirect back to your dev environment.
-- For production, https://mybrexo.com is already configured as Site URL.
-- ============================================================
