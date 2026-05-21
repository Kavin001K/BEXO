-- Tighten site_builds RLS policies to allow SELECT and INSERT (queued only) for owner profiles,
-- and restrict UPDATE/DELETE to service role only.

DROP POLICY IF EXISTS "site_builds_owner" ON public.site_builds;

CREATE POLICY "site_builds_select" ON public.site_builds
  FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "site_builds_insert" ON public.site_builds
  FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status = 'queued'
  );
