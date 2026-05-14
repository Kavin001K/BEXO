-- Atomic replace of resume-derived sections + profile fields (single transaction).
-- Replaces client-side delete-then-insert which could wipe data if inserts failed.

CREATE OR REPLACE FUNCTION public.replace_profile_resume_data(
  p_profile_id uuid,
  p_resume_url text,
  p_full_name text,
  p_headline text,
  p_bio text,
  p_education jsonb DEFAULT '[]'::jsonb,
  p_experiences jsonb DEFAULT '[]'::jsonb,
  p_projects jsonb DEFAULT '[]'::jsonb,
  p_skills jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_profile_id AND p.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.profiles
  SET
    resume_url = p_resume_url,
    full_name = NULLIF(trim(p_full_name), ''),
    headline = NULLIF(trim(p_headline), ''),
    bio = NULLIF(trim(p_bio), '')
  WHERE id = p_profile_id;

  DELETE FROM public.education WHERE profile_id = p_profile_id;
  DELETE FROM public.experiences WHERE profile_id = p_profile_id;
  DELETE FROM public.projects WHERE profile_id = p_profile_id;
  DELETE FROM public.skills WHERE profile_id = p_profile_id;

  INSERT INTO public.education (
    profile_id, institution, degree, field, start_year, end_year, gpa
  )
  SELECT
    p_profile_id,
    NULLIF(trim(elem->>'institution'), ''),
    COALESCE(NULLIF(trim(elem->>'degree'), ''), ''),
    COALESCE(NULLIF(trim(elem->>'field'), ''), ''),
    CASE
      WHEN (elem->>'start_year') ~ '^-?[0-9]+$' THEN (elem->>'start_year')::int
      ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int
    END,
    CASE
      WHEN (elem->>'end_year') ~ '^-?[0-9]+$' THEN (elem->>'end_year')::int
      ELSE NULL
    END,
    NULLIF(trim(elem->>'gpa'), '')
  FROM jsonb_array_elements(p_education) AS elem
  WHERE NULLIF(trim(elem->>'institution'), '') IS NOT NULL;

  INSERT INTO public.experiences (
    profile_id, company, role, start_date, end_date, description, is_current
  )
  SELECT
    p_profile_id,
    NULLIF(trim(elem->>'company'), ''),
    NULLIF(trim(elem->>'role'), ''),
    COALESCE(NULLIF(trim(elem->>'start_date'), ''), ''),
    NULLIF(trim(elem->>'end_date'), ''),
    COALESCE(NULLIF(trim(elem->>'description'), ''), ''),
    COALESCE((elem->>'is_current')::boolean, false)
  FROM jsonb_array_elements(p_experiences) AS elem
  WHERE NULLIF(trim(elem->>'company'), '') IS NOT NULL;

  INSERT INTO public.projects (
    profile_id, title, description, tech_stack, live_url, github_url, image_url
  )
  SELECT
    p_profile_id,
    NULLIF(trim(elem->>'title'), ''),
    COALESCE(NULLIF(trim(elem->>'description'), ''), ''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(elem->'tech_stack', '[]'::jsonb)))::text[],
      '{}'::text[]
    ),
    NULLIF(trim(elem->>'live_url'), ''),
    NULLIF(trim(elem->>'github_url'), ''),
    NULLIF(trim(elem->>'image_url'), '')
  FROM jsonb_array_elements(p_projects) AS elem
  WHERE NULLIF(trim(elem->>'title'), '') IS NOT NULL;

  INSERT INTO public.skills (
    profile_id, name, category, level
  )
  SELECT
    p_profile_id,
    NULLIF(trim(elem->>'name'), ''),
    COALESCE(NULLIF(trim(elem->>'category'), ''), ''),
    CASE lower(COALESCE(NULLIF(trim(elem->>'level'), ''), 'intermediate'))
      WHEN 'beginner' THEN 'beginner'
      WHEN 'intermediate' THEN 'intermediate'
      WHEN 'advanced' THEN 'advanced'
      WHEN 'expert' THEN 'expert'
      ELSE 'intermediate'
    END
  FROM jsonb_array_elements(p_skills) AS elem
  WHERE NULLIF(trim(elem->>'name'), '') IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_profile_resume_data(
  uuid, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.replace_profile_resume_data(
  uuid, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) TO authenticated;
