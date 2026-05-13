# BEXO — Premium AI Portfolio Builder

BEXO is a next-generation student portfolio platform. It combines high-end visual design with agentic AI to help students claim their professional identity in seconds.

## ✨ Core Features
- **WhatsApp Login**: Instant, frictionless 4-digit OTP authentication.
- **Native PDF Vision**: Resume parsing via Gemini (`GOOGLE_MODEL`, default `gemini-2.5-flash-lite`).
- **Glassmorphism UI**: Stunning, premium dark-mode interface with fluid animations.
- **Smart Onboarding**: Auto-focusing inputs, predictive date pickers, and automated flow.
- **Custom Branding**: Every user gets a `handle.mybixo.com` subdomain.

## 🛠 Tech Stack
- **Frontend**: React Native (Expo), Zustand, Linear Gradients, Haptics.
- **Backend**: Node.js (Express 5), Supabase (PostgreSQL, Edge Functions, Realtime).
- **AI Engine**: Gemini (`GOOGLE_MODEL` / `gemini-2.5-flash-lite` default) for PDF, bio, and OCR routes.
- **Storage**: Cloudflare R2 + Supabase Storage.
- **Auth**: MSG91 WhatsApp + Supabase Auth.

## 🚀 Getting Started

### 1. Environment Setup
Create a `.env` file in the root with the following keys:
```env
# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Backend
GOOGLE_API_KEY=...
# Optional — defaults to gemini-2.5-flash-lite (must match a model your key can call)
GOOGLE_MODEL=gemini-2.5-flash-lite
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
MSG91_AUTH_KEY=...
```

### 2. Supabase Configuration
1. Apply migrations from [`supabase/migrations/`](supabase/migrations/) in filename order (see [`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md)).
2. Link your project: `npx supabase link --project-ref your-ref`.
3. **Edge Functions** read secrets from **Supabase**, not Expo `.env`: `npx supabase secrets set GOOGLE_API_KEY=...` (or `GEMINI_API_KEY`). Optionally set the model: `npx supabase secrets set GOOGLE_MODEL=gemini-2.5-flash-lite`. If unset, `parse-resume` defaults to `gemini-2.5-flash-lite`.
4. Deploy Edge Function (exact name **`parse-resume`**, not `parse-resumee`): `npx supabase functions deploy parse-resume`.

### 3. Running Locally
- **Backend**: `cd artifacts/api-server && pnpm run dev`
- **Mobile**: `cd artifacts/bexo && npx expo start`

## 📦 Production Checklist
See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for a detailed deployment guide.

## 📄 License
Private Repository. All rights reserved.
