-- Digital identity card settings (separate from website portfolio_theme / portfolio_font slugs)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_card_palette TEXT NOT NULL DEFAULT 'midnight',
  ADD COLUMN IF NOT EXISTS identity_card_template TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS identity_card_font TEXT;

COMMENT ON COLUMN public.profiles.identity_card_palette IS 'Card color palette slug (e.g. midnight, ocean).';
COMMENT ON COLUMN public.profiles.identity_card_template IS 'Card layout slug: standard, compact, bold.';
COMMENT ON COLUMN public.profiles.identity_card_font IS 'Expo Google Font postscript name for card typography (e.g. DMSans_700Bold).';

UPDATE public.profiles
SET identity_card_palette = CASE lower(trim(portfolio_theme))
  WHEN '#063852' THEN 'midnight'
  WHEN '#0a0a0a' THEN 'obsidian'
  WHEN '#2d0a4e' THEN 'royal'
  WHEN '#0a3d2d' THEN 'forest'
  WHEN '#3d0a0a' THEN 'crimson'
  WHEN '#005c7a' THEN 'ocean'
  ELSE identity_card_palette
END
WHERE portfolio_theme ~ '^#[0-9A-Fa-f]{6}$';
