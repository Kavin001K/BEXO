# Production deploy checklist (APK + AI + builds)

Mobile APK builds call **`https://backend.mybexo.com`** via `EXPO_PUBLIC_API_BASE_URL`. AI (Gemini), uploads (R2), and portfolio builds (n8n) run on the **api-server**, not inside the app.

## 1. api-server environment (`backend.mybexo.com`)

Set these on your host (Railway, VPS, Docker, etc.):

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Resume parse, bio, onboarding AI |
| `GOOGLE_MODEL` | e.g. `gemini-2.5-flash-lite` (primary — PDF/resume/onboarding) |
| `GOOGLE_MODEL_FALLBACK` | e.g. `gemini-3.5-flash` (secondary when primary fails) |
| `SUPABASE_URL` | Database |
| `SUPABASE_SERVICE_ROLE_KEY` | Server writes |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | File uploads |
| `N8N_WEBHOOK_URL` | e.g. `https://n8n.mybexo.com/webhook/bexo-portfolio-generate` |
| `N8N_WEBHOOK_SECRET` | Must match n8n `X-BEXO-Secret` header |
| `MSG91_AUTH_KEY`, `MSG91_WHATSAPP_NUMBER`, `MSG91_TEMPLATE_NAME`, `MSG91_NAMESPACE` | WhatsApp OTP |
| `OTP_SECRET` | OTP hashing |

**Do not** put `GEMINI_API_KEY` in the mobile app `.env` — it will not fix APK AI. Only the server needs it.

## 2. DNS / routing

`EXPO_PUBLIC_API_BASE_URL` must reach the **Express api-server** (`GET /api/healthz` returns JSON like `{"status":"ok","ai":true,...}`).

If curl returns `Portfolio not found for handle: backend`, the **Cloudflare portfolio worker** is treating `backend.mybexo.com` as a user handle. Add `backend` to `SKIP_HOSTS` in `bexo-codegen/infra/cloudflare/worker/portfolio-proxy.js` and redeploy the worker, then point `backend` DNS to your Render api-server service.

If curl returns HTML for other hosts, the hostname may still point at the portfolio router instead of the API. Fix DNS or use the correct API host in `eas.json` and EAS secrets.

## 3. Smoke tests (run after deploy)

```bash
# Health (expect ai: true, n8n: true, r2: true)
curl -s https://backend.mybexo.com/api/healthz | jq .

# Resume AI (expect 200 + parsed JSON)
curl -s -X POST https://backend.mybexo.com/api/storage/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"text":"Jane Okonkwo. Software engineer at Acme Corp. BS Computer Science, MIT 2020."}' | jq .
```

If `ai: false`, redeploy api-server with a valid Google AI Studio key.

## 4. EAS mobile build

In `BEXO/artifacts/bexo`:

```bash
# Prefer EAS secrets for sensitive values (not committed in eas.json)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY"
eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value "https://backend.mybexo.com"

eas build --profile preview --platform android
```

`eas.json` should keep **URLs only**. Do not commit Google API keys to git.

## 5. Test production API from Expo Go (optional)

In `artifacts/bexo/.env`:

```
EXPO_PUBLIC_API_BASE_URL=https://backend.mybexo.com
EXPO_PUBLIC_FORCE_PROD=1
```

Restart Metro. The app will hit production instead of LAN `:3000`.

## 6. APK QA matrix

| Test | Expected |
|------|----------|
| Paste `+91 98765 43210` with +91 selected | National `9876543210` |
| Paste `919876543210` (12 digits) | `9876543210` |
| Paste `9123456789` (10 digits) | Unchanged |
| Paste OTP `1234` on verify | 4 boxes filled, auto-submit |
| Resume upload in onboarding | Parses or shows friendly AI-down message |
| Profile 90%+ | Build triggers; check n8n logs |

## 7. SQL

No schema changes required for this checklist. If builds fail with auth errors, verify Supabase RLS and `site_builds` rows for the profile.
