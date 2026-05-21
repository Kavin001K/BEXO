# BEXO Phase 8 Portfolio Pipeline Testing Checklist

This checklist defines the QA procedures to verify the BEXO app's integration with the portfolio generation pipeline.

---

## 1. Database & Security (RLS)

- [ ] **Granular RLS Enforcement**
  - Verify that a normal user can only `INSERT` a row into `site_builds` if its `status` is set to `'queued'`.
  - Try to insert a row with `status = 'done'` or `status = 'building'` using client credentials; verify that the database rejects it or fails RLS checks.
  - Try to `UPDATE` an existing build's status using client credentials (e.g. setting it to `'done'` or `'failed'`); verify that the database denies permission.
  - Verify that `SELECT` queries on `site_builds` only return the authenticated user's builds.

---

## 2. API Hardening (api-server)

- [ ] **Handle Verification**
  - Try to trigger a build via `/api/portfolio/trigger-build` for a profile that does not have a `handle` configured.
  - Verify the server returns `400 Bad Request` with an appropriate error message and does not send any request to the n8n webhook.

- [ ] **Duplicate Build Prevention**
  - Trigger a build. While the build is still in `'queued'` or `'building'` status, trigger another build.
  - Verify that the server returns `409 Conflict` and prevents duplicate queueing.

- [ ] **Robust Error Logging & Recovery**
  - Simulate an n8n webhook failure (e.g. invalid endpoint or network timeout).
  - Verify that the backend updates the `site_builds` table to set the status to `'failed'` and writes the error detail to `build_log` before returning the HTTP error to the client.

---

## 3. Client UI Transitions

- [ ] **Onboarding Completion Trigger**
  - Create a new account and progress through the onboarding.
  - When the onboarding steps finish and transition to the `generating.tsx` screen, verify a new `site_builds` row is created.
  - Verify that the screen subscribes to the build in real-time and transitions to the dashboard only when the status changes to `'done'`.

- [ ] **Manual Rebuild Modal**
  - Open the rebuild modal from the Portfolio tab.
  - Choose "Rebuild with current data" or upload a resume.
  - Verify the modal status transitions from `idle -> rebuilding -> done` (or shows the progress bars).
  - Verify the background build transitions correctly.

- [ ] **Portfolio Banner & CTAs**
  - Navigate to the Portfolio tab after a build completes successfully.
  - Verify that a "Your site is live" banner is visible.
  - Test the **Open** button; verify it opens the browser to `https://{handle}.mybexo.com`.
  - Test the **Share** button; verify it triggers the native share sheet.
  - Test the **Copy Link** button; verify it copies the URL to the clipboard and shows a confirmation toast.
  - Verify a loader or building status alert is shown while a build is in progress.
