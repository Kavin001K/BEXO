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
- **Auth**: Supabase Auth — WhatsApp OTP + Google OAuth
- **DB**: Supabase PostgreSQL (schema in `supabase/migrations/001_initial_schema.sql`)
- **Storage**: Cloudflare R2 (for assets) + Supabase Storage (fallback)
- **Realtime**: Supabase Realtime for portfolio build status updates
- **State**: Zustand (`useAuthStore`, `useProfileStore`, `usePortfolioStore`)
- **AI**: Supabase Edge Function `parse-resume` (Gemini 2.0 Flash for Native PDF Vision parsing)
- **Portfolio Generation**: n8n webhook triggered on `triggerBuild`
- **Backend**: Node.js API server for R2 proxying, WhatsApp auth, and Gemini-powered features
- **API**: Express 5, Drizzle ORM, Zod validation

## Where things live

- `artifacts/bexo/` — Expo React Native app
  - `app/(auth)/` — Login (WhatsApp OTP + Google) and OTP verification screens
  - `app/(onboarding)/` — Handle setup, resume upload (Native PDF Vision), photo, card flow, generating screens
  - `app/(main)/` — Dashboard, Portfolio, Post Update tabs (main app)
  - `stores/` — Zustand stores (auth, profile, portfolio)
  - `services/resumeParser.ts` — Resume upload + parse via Supabase Edge Function (Gemini Native)
  - `lib/supabase.ts` — Supabase client (graceful fallback if not configured)
  - `constants/colors.ts` — BEXO brand tokens
- `supabase/migrations/001_initial_schema.sql` — Full DB schema (7 tables + RLS + storage)
- `supabase/functions/parse-resume/index.ts` — Edge Function for Gemini-powered Native PDF parsing
- `artifacts/api-server/` — Express API server (WhatsApp, R2, Bio Generation)
- `artifacts/mockup-sandbox/` — Phase 1 web mockups (canvas prototypes)

## Architecture Decisions

- Supabase used for auth, DB, realtime, and edge functions.
- Gemini 2.0 Flash Native PDF Vision: We send the raw PDF URL directly to Gemini. This preserves layout context (sidebars) that traditional OCR breaks.
- Resume parsing via Edge Function keeps Gemini API key out of the mobile bundle.
- Zustand chosen over React Context for cross-screen state.
- Portfolio generation delegates to n8n webhook; build status synced via Supabase Realtime.

## Product

- **Auth**: WhatsApp OTP + Google OAuth (no email/password)
- **Onboarding**: Claim handle → Upload resume (Gemini-parsed) → Profile photo → Fill cards (headline, bio, skills) → Portfolio generation
- **Dashboard**: Live portfolio banner, profile card, analytics (views/clicks/shares), updates feed
- **Portfolio tab**: Full profile viewer (education, experience, projects, skills), rebuild trigger
- **Post Update**: Post achievements, projects, new roles, or education updates to keep portfolio fresh
- **Portfolio URL**: `handle.mybixo.com` format

## User Preferences

- No emojis in UI (icons only via @expo/vector-icons)
- Dark-only theme: `#0A0A0F` bg, `#7C6AFA` accent (purple), `#FA6A6A` coral, `#6AFAD0` mint
- Portfolio URL format: `handle.mybexo.com` (not `bexo.app/handle`)
- Auth: WhatsApp OTP + Google only (NOT email)

## Env Vars Needed (add to Replit secrets and .env)

```
# Core App (Mobile)
EXPO_PUBLIC_SUPABASE_URL       — Your Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY  — Your Supabase anon/public key
EXPO_PUBLIC_API_BASE_URL       — API Server URL (dev or production)

# Backend (api-server)
GOOGLE_API_KEY                 — For Gemini bio generation and OCR
R2_ACCOUNT_ID                  — Cloudflare R2 Account ID
R2_ACCESS_KEY_ID               — Cloudflare R2 Access Key
R2_SECRET_ACCESS_KEY           — Cloudflare R2 Secret Key
MSG91_AUTH_KEY                 — For WhatsApp OTP
```

Also set in **Supabase Edge Function secrets**:
```
GEMINI_API_KEY                 — For Native PDF Vision resume parsing
```

## Gotchas

- After adding Supabase env vars, restart the Expo dev server for them to take effect
- Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL editor before using the app
- Ensure the `parse-resume` edge function is deployed (`npx supabase functions deploy parse-resume`)
