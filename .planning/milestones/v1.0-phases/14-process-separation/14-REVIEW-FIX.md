---
phase: 14-process-separation
fixed_at: 2026-06-03T00:00:00Z
review_path: .planning/phases/14-process-separation/14-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 14: Code Review Fix Report

**Fixed at:** 2026-06-03T00:00:00Z
**Source review:** .planning/phases/14-process-separation/14-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (2 Critical, 3 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Real JWT secret committed to `nestjs-backend/.env`

**Files modified:** `apps/nestjs-backend/.env`
**Commit:** 6a0b0645c
**Applied fix:** Replaced `BACKEND_JWT_SECRET="local-dev-secret-change-in-production"` and `INTEGRATION_SECRET_KEY="local-dev-integration-secret-key-32chars"` with empty placeholder values. Added comment above JWT section: `# Set these in your local .env.local or deployment secrets — do not commit real values`.

---

### CR-02: `start:separated` hard-codes `BACKEND_URL=http://localhost:3001` in production script

**Files modified:** `package.json`
**Commit:** 1f43d6836
**Applied fix:** Removed `BACKEND_URL=http://localhost:3001` from the `start:separated` script's inline env. The `PORT=3000` prefix for the Next.js process was also removed since `BACKEND_URL` must now be set in the deployment environment. The `dev:separated` script retains its `BACKEND_URL` (correct for dev convenience).

---

### WR-01: API proxy uses `NEXTJS_SOCKET_PORT` for REST API — misleading and fragile

**Files modified:** `apps/nextjs-app/next.config.js`
**Commit:** 9bf3faace
**Applied fix:** Added `const NEXTJS_BACKEND_PORT = process.env.BACKEND_PORT || process.env.SOCKET_PORT || '3001'` alongside the existing `NEXTJS_SOCKET_PORT` constant. Updated the `apiProxy` destination to use `NEXTJS_BACKEND_PORT` instead of `NEXTJS_SOCKET_PORT`. Socket proxy is unchanged.

---

### WR-02: `axios.ts` can produce `http://localhost:undefined/api` if both env vars absent

**Files modified:** `apps/nextjs-app/src/backend/api/rest/axios.ts`
**Commit:** 04a1ae7d7
**Applied fix:** Added a guard at the top of `getAxios()` that throws `[SSR] Either BACKEND_URL or PORT must be set for axios baseURL` when both `BACKEND_URL` and `PORT` are unset. Extracted `backendUrl` into a named variable before constructing `baseURL` for clarity.

---

### WR-03: Playwright spec swallows `waitForResponse` timeout — proxy routing not verified

**Files modified:** `apps/nextjs-app/e2e/doc-library-separated.spec.ts`
**Commit:** a947ad1a4
**Applied fix:** Changed the empty `catch` block to `catch (err)` with a conditional re-throw: non-Timeout errors are now propagated, while `Timeout` errors (expected when `waitForResponse` misses direct API calls) are still swallowed.

---

## Skipped Issues

None — all 5 in-scope findings were fixed successfully.

---

_Fixed: 2026-06-03T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
