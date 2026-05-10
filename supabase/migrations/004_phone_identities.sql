-- BEXO Migration 004: phone_identities table + missing profiles columns
-- Run this in Supabase SQL Editor: Project > SQL Editor > New Query > Paste

CREATE TABLE IF NOT EXISTS public.phone_identities (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_identities_phone   ON public.phone_identities(phone);
CREATE INDEX IF NOT EXISTS idx_phone_identities_user_id ON public.phone_identities(user_id);

ALTER TABLE public.phone_identities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rebuild_preferences TEXT;
