-- Privacy / terms consent timestamp (GDPR-style audit trail)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.consent_accepted_at IS
  'When the user accepted data processing terms (set from app before OTP).';
