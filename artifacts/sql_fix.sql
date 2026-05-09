-- Add missing columns for Rebuild functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rebuild_preferences text;

-- Ensure the schema cache is refreshed (this is automatic in Supabase but good to know)
