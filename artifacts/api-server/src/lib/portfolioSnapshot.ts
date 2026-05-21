/**
 * PortfolioSnapshot v1 — mirrors bexo-codegen snapshot_builder.py
 */

export interface PortfolioSnapshot {
  version: 1;
  syncedAt: string;
  handle: string;
  profile: {
    full_name?: string | null;
    headline?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    location?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
    resume_url?: string | null;
  };
  projects: unknown[];
  skills: unknown[];
  experiences: unknown[];
  education: unknown[];
  theme: {
    portfolio_theme?: string | null;
    portfolio_font?: string | null;
    identity_card_palette?: string | null;
    identity_card_template?: string | null;
  };
}

export function buildPortfolioSnapshot(graph: {
  handle?: string | null;
  full_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  resume_url?: string | null;
  portfolio_theme?: string | null;
  portfolio_font?: string | null;
  identity_card_palette?: string | null;
  identity_card_template?: string | null;
  projects?: unknown[];
  skills?: unknown[];
  experiences?: unknown[];
  education?: unknown[];
}): PortfolioSnapshot {
  return {
    version: 1,
    syncedAt: new Date().toISOString(),
    handle: (graph.handle ?? "").trim().toLowerCase(),
    profile: {
      full_name: graph.full_name,
      headline: graph.headline,
      bio: graph.bio,
      avatar_url: graph.avatar_url,
      location: graph.location,
      email: graph.email,
      phone: graph.phone,
      website: graph.website,
      linkedin_url: graph.linkedin_url,
      github_url: graph.github_url,
      resume_url: graph.resume_url,
    },
    projects: graph.projects ?? [],
    skills: graph.skills ?? [],
    experiences: graph.experiences ?? [],
    education: graph.education ?? [],
    theme: {
      portfolio_theme: graph.portfolio_theme,
      portfolio_font: graph.portfolio_font,
      identity_card_palette: graph.identity_card_palette,
      identity_card_template: graph.identity_card_template,
    },
  };
}
