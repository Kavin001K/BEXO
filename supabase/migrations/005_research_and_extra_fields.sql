-- Migration 005: Research table and profile fields
-- This adds the research table and missing fields to profiles

-- Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS portfolio_font text,
ADD COLUMN IF NOT EXISTS website_preference text,
ADD COLUMN IF NOT EXISTS rebuild_preferences text,
ADD COLUMN IF NOT EXISTS address text;

-- Add description to education
ALTER TABLE public.education
ADD COLUMN IF NOT EXISTS description text;

-- Create research table
CREATE TABLE IF NOT EXISTS public.research (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON delete CASCADE,
  title       text NOT NULL,
  subtitle    text,
  description text NOT NULL DEFAULT '',
  image_url   text,
  file_url    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "research_owner" ON public.research
  FOR ALL USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Storage bucket for research
INSERT INTO storage.buckets (id, name, public)
  VALUES ('research', 'research', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies for research
CREATE POLICY "research_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'research');
CREATE POLICY "research_owner_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'research' AND auth.uid()::text = (storage.foldername(name))[1]);
