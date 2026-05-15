import type { Profile } from "@/stores/useProfileStore";

export type CardPaletteId =
  | "midnight"
  | "obsidian"
  | "royal"
  | "forest"
  | "crimson"
  | "ocean";

export type CardTemplateId = "standard" | "compact" | "bold";

export interface CardPalette {
  id: CardPaletteId;
  label: string;
  color: string;
  border: string;
  accent: string;
}

export const CARD_PALETTES: CardPalette[] = [
  { id: "midnight", label: "Midnight", color: "#063852", border: "#105A7A", accent: "#3abef9" },
  { id: "obsidian", label: "Obsidian", color: "#0A0A0A", border: "#222222", accent: "#00C2FF" },
  { id: "royal", label: "Royal", color: "#2D0A4E", border: "#4B1280", accent: "#B794F6" },
  { id: "forest", label: "Forest", color: "#0A3D2D", border: "#16614B", accent: "#34D399" },
  { id: "crimson", label: "Crimson", color: "#3D0A0A", border: "#611616", accent: "#F87171" },
  { id: "ocean", label: "Ocean", color: "#005C7A", border: "#008CB8", accent: "#38BDF8" },
];

const LEGACY_HEX_TO_PALETTE: Record<string, CardPaletteId> = {
  "#063852": "midnight",
  "#0A0A0A": "obsidian",
  "#2D0A4E": "royal",
  "#0A3D2D": "forest",
  "#3D0A0A": "crimson",
  "#005C7A": "ocean",
};

export const CARD_TEMPLATES: {
  id: CardTemplateId;
  label: string;
  description: string;
}[] = [
  { id: "standard", label: "Standard", description: "Balanced layout" },
  { id: "compact", label: "Compact", description: "Tighter spacing" },
  { id: "bold", label: "Bold", description: "Large name & stats" },
];

export const CARD_TYPEFACES: { id: string; fontFamily: string; label: string }[] = [
  { id: "DMSans_700Bold", fontFamily: "DMSans_700Bold", label: "Modern" },
  { id: "Montserrat_800ExtraBold", fontFamily: "Montserrat_800ExtraBold", label: "Bold" },
  { id: "PlayfairDisplay_900Black", fontFamily: "PlayfairDisplay_900Black", label: "Classic" },
  { id: "Poppins_800ExtraBold", fontFamily: "Poppins_800ExtraBold", label: "Friendly" },
  { id: "SpaceGrotesk_700Bold", fontFamily: "SpaceGrotesk_700Bold", label: "Tech" },
  { id: "Syne_800ExtraBold", fontFamily: "Syne_800ExtraBold", label: "Artistic" },
  { id: "JetBrainsMono_700Bold", fontFamily: "JetBrainsMono_700Bold", label: "Code" },
];

export const DEFAULT_CARD_TYPEFACE = CARD_TYPEFACES[0].fontFamily;

export function getPaletteById(id: string | null | undefined): CardPalette {
  const found = CARD_PALETTES.find((p) => p.id === id);
  if (found) return found;
  return CARD_PALETTES[0];
}

function paletteFromLegacyPortfolioTheme(theme: string | null | undefined): CardPaletteId | null {
  if (!theme) return null;
  const t = theme.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) {
    return LEGACY_HEX_TO_PALETTE[t.toLowerCase()] ?? null;
  }
  return null;
}

export function getIdentityCardProps(profile: Profile | null): {
  themeColor: string;
  borderColor: string;
  accent: string;
  fontFamily: string;
  templateId: CardTemplateId;
  paletteId: CardPaletteId;
} {
  const storedPalette = profile?.identity_card_palette?.trim();
  let paletteId: CardPaletteId = getPaletteById(storedPalette).id;

  if (!storedPalette || !CARD_PALETTES.some((p) => p.id === storedPalette)) {
    const fromHex = paletteFromLegacyPortfolioTheme(profile?.portfolio_theme ?? undefined);
    if (fromHex) paletteId = fromHex;
  }

  const pal = getPaletteById(paletteId);

  const rawTemplate = profile?.identity_card_template?.trim() as CardTemplateId | undefined;
  const templateId: CardTemplateId =
    rawTemplate === "compact" || rawTemplate === "bold" || rawTemplate === "standard"
      ? rawTemplate
      : "standard";

  const rawFont = profile?.identity_card_font?.trim();
  const known = CARD_TYPEFACES.find((f) => f.fontFamily === rawFont || f.id === rawFont);
  const fontFamily = known?.fontFamily ?? DEFAULT_CARD_TYPEFACE;

  return {
    themeColor: pal.color,
    borderColor: pal.border,
    accent: pal.accent,
    fontFamily,
    templateId,
    paletteId: pal.id,
  };
}
