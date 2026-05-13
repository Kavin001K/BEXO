# BEXO Production Deployment Checklist

Follow this checklist to ensure a stable, secure production deployment of the BEXO platform.

## 1. Supabase Infrastructure
- [ ] **Migrations**: All migrations from `supabase/migrations/` have been run against the production database.
- [ ] **Edge Functions**: `parse-resume` is deployed (`npx supabase functions deploy parse-resume`).
- [ ] **Secrets**: Remote secrets are set:
  - `GEMINI_API_KEY` (Google AI Key for resume parsing)
  - `OPENAI_API_KEY` (Fallback if needed)
- [ ] **Storage Buckets**: Following buckets are created and Public:
  - `avatars`
  - `projects`
  - `resumes` (Private recommended, with signed URLs)

## 2. Backend (api-server)
- [ ] **Environment Variables**:
  - `GOOGLE_API_KEY`: Verified valid for Gemini 1.5/2.0.
  - `R2_CREDENTIALS`: Account ID, Access Key, Secret Key verified.
  - `MSG91_AUTH_KEY`: Verified and topped up for WhatsApp credits.
  - `SUPABASE_SERVICE_ROLE_KEY`: Used for bypass-RLS operations.
- [ ] **SSL**: Backend is running on HTTPS (required for Mobile/Web).

## 3. Mobile App (Expo)
- [ ] **API URL**: `EXPO_PUBLIC_API_BASE_URL` points to your production backend (not localhost).
- [ ] **Supabase URL/Key**: Points to production Supabase project.
- [ ] **Deep Linking**: `expo-router` scheme configured for handle redirections.
- [ ] **Production Build**: Built using `eas build --platform all --profile production`.

## 4. Integration Verification
- [ ] **WhatsApp OTP**: Test a real login flow with a physical phone number.
- [ ] **Resume Vision**: Upload a complex multi-column resume PDF and verify all 4 main sections (Edu, Exp, Proj, Skills) are populated.
- [ ] **R2 Uploads**: Change profile photo and verify the image is visible on the dashboard.
- [ ] **Handle Redirection**: Verify `handle.mybexo.com` correctly triggers the build and resolves (requires n8n/DNS setup).

## 5. Security Audit
- [ ] **RLS Policies**: Verify that users can only edit their own `profiles`, `education`, etc.
- [ ] **API Keys**: Ensure no keys (OpenAI, Gemini, MSG91) are hardcoded or present in the `EXPO_PUBLIC_` namespace unless absolutely necessary.
