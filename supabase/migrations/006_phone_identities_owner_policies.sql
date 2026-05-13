-- Allow authenticated users to read/update their own phone identity row (optional client lookups).
-- Edge Functions / API already use service_role and bypass RLS.

DROP POLICY IF EXISTS "phone_identities_select_own" ON public.phone_identities;
DROP POLICY IF EXISTS "phone_identities_update_own" ON public.phone_identities;

CREATE POLICY "phone_identities_select_own"
  ON public.phone_identities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "phone_identities_update_own"
  ON public.phone_identities FOR UPDATE
  USING (auth.uid() = user_id);
