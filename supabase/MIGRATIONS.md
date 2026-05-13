# Supabase migrations apply order

Apply SQL files from [`migrations/`](migrations/) in **lexicographic filename order**. Repeat prefixes (`003_*`, `004_*`) exist historically; on a **fresh** database, apply all files from `001` through `006` in sorted order.

Canonical migrations live in **repository root** [`supabase/migrations/`](../migrations/). Do not apply duplicate snippets under `artifacts/bexo/supabase/migrations/` unless you are merging them into the canonical chain.

## Resume parsing (Edge Function)

The `parse-resume` function reads **`GEMINI_API_KEY`** or **`GOOGLE_API_KEY`** from **Supabase secrets** (`supabase secrets set ...`), not from the Expo app `.env`.

Optional model override (defaults to **`gemini-2.5-flash-lite`** in code if unset):

```bash
npx supabase secrets set GOOGLE_MODEL=gemini-2.5-flash-lite
```

```bash
npx supabase secrets set GOOGLE_API_KEY=your_key
# or
npx supabase secrets set GEMINI_API_KEY=your_key
```

Deploy with the exact function name: `npx supabase functions deploy parse-resume`

The Node API server in `artifacts/api-server` uses **`GOOGLE_API_KEY`** and optional **`GOOGLE_MODEL`** / **`GEMINI_MODEL`** for bio generation and related routes.
