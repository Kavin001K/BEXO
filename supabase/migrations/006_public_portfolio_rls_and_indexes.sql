-- Align RLS with public portfolio reads and tighten profile listing.
-- Safe to run on existing projects: uses IF EXISTS / IF NOT EXISTS.

-- ---------------------------------------------------------------------------
-- Indexes (001 did not include these; improves handle / FK lookups)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_education_profile ON public.education(profile_id);
CREATE INDEX IF NOT EXISTS idx_experiences_profile ON public.experiences(profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_profile ON public.projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_skills_profile ON public.skills(profile_id);

-- ---------------------------------------------------------------------------
-- Profiles: public read only when published (replaces wide-open SELECT)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "Public can read published profiles" ON public.profiles;
CREATE POLICY "Public can read published profiles"
  ON public.profiles
  FOR SELECT
  USING (is_published = true);

-- ---------------------------------------------------------------------------
-- Child tables: allow anonymous read for published portfolios
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "education_public_read" ON public.education;
DROP POLICY IF EXISTS "Public reads education of published profiles" ON public.education;
CREATE POLICY "Public reads education of published profiles"
  ON public.education
  FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE is_published = true)
  );

DROP POLICY IF EXISTS "experiences_public_read" ON public.experiences;
DROP POLICY IF EXISTS "Public reads experiences of published profiles" ON public.experiences;
CREATE POLICY "Public reads experiences of published profiles"
  ON public.experiences
  FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE is_published = true)
  );

DROP POLICY IF EXISTS "projects_public_read" ON public.projects;
DROP POLICY IF EXISTS "Public reads projects of published profiles" ON public.projects;
CREATE POLICY "Public reads projects of published profiles"
  ON public.projects
  FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE is_published = true)
  );

DROP POLICY IF EXISTS "skills_public_read" ON public.skills;
DROP POLICY IF EXISTS "Public reads skills of published profiles" ON public.skills;
CREATE POLICY "Public reads skills of published profiles"
  ON public.skills
  FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE is_published = true)
  );
