# Supabase migrations apply order

Apply SQL files from [`migrations/`](migrations/) in **lexicographic filename order**. Repeat prefixes (`003_*`, `004_*`) exist historically; on a **fresh** database, apply all files from `001` through `006` in sorted order.

Canonical migrations live in **repository root** [`supabase/migrations/`](../migrations/). Do not apply duplicate snippets under `artifacts/bexo/supabase/migrations/` unless you are merging them into the canonical chain.

## Resume parsing (Edge Function)

The `parse-resume` function reads **`GOOGLE_API_KEY`** first, then **`GEMINI_API_KEY`** (trimmed). Prefer **`GOOGLE_API_KEY`** only — if both secrets exist and contain different keys, remove the stale one in **Dashboard → Project Settings → Edge Functions → Secrets**.

Secrets apply to the deployed Edge Function at runtime; redeploy after changing function code: `npx supabase functions deploy parse-resume`.

Optional model overrides (primary defaults to **`gemini-2.5-flash-lite`** in code if unset):

```bash
npx supabase secrets set GOOGLE_MODEL=gemini-2.5-flash-lite
# Optional: tried after primary before built-in fallbacks (e.g. gemini-3-flash-preview)
npx supabase secrets set GOOGLE_MODEL_FALLBACK=gemini-3-flash-preview
```

```bash
npx supabase secrets set GOOGLE_API_KEY=your_key
# or
npx supabase secrets set GEMINI_API_KEY=your_key
```

Deploy with the exact function name: `npx supabase functions deploy parse-resume`

The Node API server in `artifacts/api-server` uses **`GOOGLE_API_KEY`** and optional **`GOOGLE_MODEL`** / **`GEMINI_MODEL`** for bio generation and related routes.

## Link Supabase CLI to the same project as Dashboard / Expo

**BEXO production (canonical):** project ref **`gtjbnvpvqzddkbatyqtr`** → `https://gtjbnvpvqzddkbatyqtr.supabase.co`. Link from repo root:

```bash
npx supabase link --project-ref gtjbnvpvqzddkbatyqtr
```

If `npx supabase secrets set …` does not show up in the Dashboard project you expect, the CLI is linked to a **different** Supabase project than the one you use in the UI.

1. Open **Dashboard** → your project → copy **`PROJECT_REF`** from the URL:  
   `https://supabase.com/dashboard/project/<PROJECT_REF>/…`
2. **Login:** `npx supabase login`
3. **Link this repo to that project:**  
   `npx supabase link --project-ref <PROJECT_REF>`  
   (Requires GitHub/org access to that project; if it fails, use an account that is a member of the project.)
4. **Verify secrets:** `npx supabase secrets list` — names should match **Dashboard → Edge Functions → Secrets**.
5. **Expo app env must match the same project** (`artifacts/bexo/.env`):  
   - `EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co`  
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY=` **anon public** key from **Dashboard → Settings → API** for that same project.  
   If these point at another ref, the app will talk to the wrong database/storage while secrets apply elsewhere — resume parsing and uploads will break.
6. After linking, redeploy functions so code matches this environment:  
   `npx supabase functions deploy parse-resume`

### `parse-resume` model fallbacks

Only **two** models: **`GOOGLE_MODEL`** (default **`gemini-2.5-flash-lite`**) then **`GOOGLE_MODEL_FALLBACK`** (default **`gemini-3-flash-preview`**).

The function **sniffs real file type** (PDF vs JPEG/PNG/WebP) for Gemini `inlineData` / File API. Storage uploads should **not** force `application/pdf` if the bytes are an image — wrong MIME led to Google error **“The document has no pages.”** If inline upload still fails, the function **re-uploads via the Gemini File API** and retries `generateContent` with `fileData`.
