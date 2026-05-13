# BEXO — Student Portfolio App

A mobile-first student portfolio app that lets students build stunning, AI-powered portfolio sites in minutes — with a live URL at `handle.mybixo.com`.

## Run & Operate

- `pnpm --filter @workspace/bexo run dev` — run the Expo mobile app (via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Mobile**: Expo SDK 54, Expo Router v3 (file-based routing), React Native
- **Auth**: Supabase Auth — Phone/OTP + Google OAuth
- **DB**: Supabase PostgreSQL (schema in `supabase/migrations/001_initial_schema.sql`)
- **Storage**: Supabase Storage (avatars, projects, resumes buckets)
- **Realtime**: Supabase Realtime for portfolio build status updates
- **State**: Zustand (`useAuthStore`, `useProfileStore`, `usePortfolioStore`)
- **AI**: Supabase Edge Function `parse-resume` (OpenAI GPT-4o for resume parsing)
- **Portfolio Generation**: n8n webhook triggered via **api-server** `POST /api/portfolio/trigger-build` (JWT + `N8N_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` server-side only — do not put the webhook URL in `EXPO_PUBLIC_*`)
- API: Express 5, Drizzle ORM, Zod validation

## Where things live

- `artifacts/bexo/` — Expo React Native app
  - `app/(auth)/` — Login (phone+OTP+Google) and OTP verification screens
  - `app/(onboarding)/` — Handle setup, resume upload, photo, card flow, generating screens
  - `app/(main)/` — Dashboard, Portfolio, Post Update tabs (main app)
  - `stores/` — Zustand stores (auth, profile, portfolio)
  - `services/resumeParser.ts` — Resume upload + parse via Supabase Edge Function
  - `lib/supabase.ts` — Supabase client (graceful fallback if not configured)
  - `constants/colors.ts` — BEXO brand tokens
- `supabase/migrations/001_initial_schema.sql` — Full DB schema (7 tables + RLS + storage)
- `supabase/functions/parse-resume/index.ts` — Edge Function for AI resume parsing
- `artifacts/api-server/` — Express API server
- `artifacts/mockup-sandbox/` — Phase 1 web mockups (canvas prototypes)

## Architecture Decisions

- Supabase used for everything: auth, DB, storage, realtime, and edge functions — no separate backend needed for core app functionality
- Resume parsing via Edge Function keeps OpenAI API key out of the mobile bundle
- Zustand chosen over React Context for cross-screen state (profile, auth, portfolio build status)
- `isSupabaseConfigured` guard in `lib/supabase.ts` — app renders with placeholder credentials until user sets real Supabase env vars
- Portfolio generation delegates to n8n webhook; build status synced via Supabase Realtime subscription

## Product

- **Auth**: Phone OTP + Google OAuth (no email/password)
- **Onboarding**: Claim handle → Upload resume (AI-parsed) → Profile photo → Fill cards (headline, bio, skills) → Portfolio generation
- **Dashboard**: Live portfolio banner, profile card, analytics (views/clicks/shares), updates feed
- **Portfolio tab**: Full profile viewer (education, experience, projects, skills), rebuild trigger
- **Post Update**: Post achievements, projects, new roles, or education updates to keep portfolio fresh
- **Portfolio URL**: `handle.mybixo.com` format

## User Preferences

- No emojis in UI (icons only via @expo/vector-icons)
- Dark-only theme: `#0A0A0F` bg, `#7C6AFA` accent (purple), `#FA6A6A` coral, `#6AFAD0` mint
- Portfolio URL format: `handle.mybixo.com` (not `bexo.app/handle`)
- Auth: phone OTP + Google only (NOT email)

## Env Vars Needed (add to Replit secrets)

```
EXPO_PUBLIC_SUPABASE_URL       — Your Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY  — Your Supabase anon/public key
EXPO_PUBLIC_API_BASE_URL       — HTTPS URL of the BEXO API server (Expo app calls this)

# API server only (Replit / hosting secrets for artifacts/api-server — never EXPO_PUBLIC)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
N8N_WEBHOOK_URL                — n8n webhook URL for portfolio generation (optional)
N8N_WEBHOOK_SECRET             — Shared secret sent as X-BEXO-Secret to n8n (recommended)
```

Also set in **Supabase Edge Function secrets**:
```
OPENAI_API_KEY  — For resume parsing
```

## Gotchas

- Do NOT run `npx expo start` directly — use the workflow (`restart_workflow`)
- After adding Supabase env vars, restart the Expo workflow for them to take effect
- Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL editor before using the app, then apply later migrations in order (e.g. `006_public_portfolio_rls_and_indexes.sql`, `007_consent_accepted_at.sql`).
- Legacy `(tabs)` route group was removed; entry routing is handled by `app/index.tsx` and `app/(auth)`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/skills/expo/SKILL.md` for Expo-specific patterns and pitfalls
