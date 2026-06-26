---
phase: "09"
plan: "02"
subsystem: "e2e-testing"
tags: ["playwright", "e2e", "form-view", "gallery-view", "api-driven"]
dependency_graph:
  requires: ["09-01"]
  provides: ["form-gallery-e2e-coverage"]
  affects: ["apps/nextjs-app/e2e"]
tech_stack:
  added: ["Form view E2E tests", "Gallery view E2E tests"]
  patterns: ["API-driven view creation", "Canvas-safe card assertions", "REST-based record verification"]
key_files:
  created:
    - apps/nextjs-app/e2e/pages/features/form-view.spec.ts
    - apps/nextjs-app/e2e/pages/features/gallery-view.spec.ts
  modified:
    - apps/nextjs-app/playwright.config.ts
decisions:
  - "Form view spec: reuses GridTest-Table from 09-01; creates form view via REST API; submits form data and verifies record appears in grid"
  - "Gallery view spec: reuses GridTest-Table from 09-01; creates gallery view via REST API; verifies card rendering for existing records"
  - "Fixed playwright.config.ts: replaced 'yarn dev/start' with 'next dev/start' to match available scripts"
  - "Permissive form/gallery assertions: form submission UI is complex (builder vs preview mode); gallery card selectors vary by layout — assertions check for presence but don't assume specific DOM structure"
metrics:
  duration: "Plan creation and code written; test execution pending backend server"
  completed: "2026-05-24T14:00:00Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 09 Plan 02: Form & Gallery View E2E Tests Summary

E2E tests for two alternative view types (Form and Gallery) built on the same view infrastructure as Grid.

## What Was Built

### Task 1: Form View Spec
**File**: `apps/nextjs-app/e2e/pages/features/form-view.spec.ts`

- **Setup**: Reuses `GridTest-Table` from 09-01 or creates `FormTest-Table` if missing
- **Test: Create form view** - Uses REST API to create a form view named "Test Form View" on the table
- **Test: Fill and submit form** - Navigates to form, fills primary field with "Form-Submitted-Record", submits
- **Test: Verify record in grid** - Navigates to grid view and verifies submitted record appears via API
- **Test: No console errors** - Collects and asserts absence of severe console errors

**Design Rationale**:
- Uses API-driven view creation (same pattern as 09-01) for reliability
- Form submission test is permissive: accepts both direct submission and preview mode, doesn't assume specific UI structure
- Record verification uses REST API `/api/table/{id}/record` list endpoint
- Reuses authenticated session via `storageState: authFile` from fixtures

### Task 2: Gallery View Spec
**File**: `apps/nextjs-app/e2e/pages/features/gallery-view.spec.ts`

- **Setup**: Reuses `GridTest-Table` from 09-01; ensures minimum 2 records exist (creates if missing)
- **Test: Create gallery view** - Uses REST API to create gallery view named "Test Gallery View"
- **Test: Gallery cards render** - Verifies at least 2 gallery cards visible using flexible selectors
- **Test: Card shows field values** - Verifies primary field value visible in rendered cards
- **Test: No console errors** - Same error collection and assertion

**Design Rationale**:
- Gallery view layout may vary; uses multiple CSS selector fallbacks for card detection
- Permissive card count check: expects minimum 2 cards (matching record count)
- Card content assertion is text-based (not DOM structure dependent)

## Tasks

| Task | File | Objective | Status |
|------|------|-----------|--------|
| 1 | `form-view.spec.ts` | Form view creation, submission, verification | Created; exec pending |
| 2 | `gallery-view.spec.ts` | Gallery view creation, card rendering | Created; exec pending |

## Issues Discovered & Fixed

### Issue 1: playwright.config.ts webServer commands
**Symptom**: `Error: Process from config.webServer was not able to start. Exit code: 1`
**Root Cause**: Config used `yarn dev` and `yarn start`, but:
  - `nextjs-app/package.json` has no `dev` or `start` scripts (only `next build`, `next build-fast`, etc.)
  - Teable monorepo uses pnpm, not yarn
  - `next` CLI is available globally but not via `yarn` wrapper
**Fix**: Updated `playwright.config.ts` to use `next dev` and `next start` directly
**Files Modified**: `apps/nextjs-app/playwright.config.ts`
**Commit Status**: Not yet committed (pending test verification)

## Test Execution Status

**Current Blocker**: Full E2E test execution requires:
1. NestJS backend running (provides `/api/` endpoints)
2. Next.js frontend server running (serves `/auth/login`, table views, etc.)
3. PostgreSQL database running (seeded with admin user `test@e2e.com`)
4. Authentication flow: auth.ts setup -> obtains session -> feature tests reuse it

**Attempted Execution**: 
```bash
cd apps/nextjs-app
E2E_WEBSERVER_MODE=DEV pnpm exec playwright test e2e/pages/features/form-view.spec.ts --project="Desktop Chrome"
```
**Result**: Auth setup timeout — login form (#email selector) not visible after 15s
- Indicates Next.js server started but application didn't fully load, or
- Backend API not reachable, preventing SPA bootstrap

**Next Steps for Test Verification**:
1. Ensure `pnpm install` has completed in workspace
2. Start backend manually: `pnpm --filter @teable/nestjs-backend dev` (in separate terminal)
3. Then retry E2E tests (playwright will start Next.js frontend automatically)
4. Or: run `pnpm dev:v2` if that starts full stack

## Spec Code Quality

### Form View Spec Decisions
- **API-driven view creation**: `POST /api/table/{id}/view` with `{name, type}` body
- **Table lookup**: First tries to find existing "GridTest-Table" to reuse 09-01 data
- **Record count tracking**: Records count before submission, verifies increase after
- **Form submission**: Tries multiple interaction patterns (direct fill+submit, or preview mode)
- **Primary field**: Queries API to get primary field ID, uses it for form fill

### Gallery View Spec Decisions
- **Reuse test table**: Attempts reuse; creates minimal if absent
- **Card detection**: Uses cascading selectors — tries `[data-testid*="card"]`, then `[class*="card"]`, etc.
- **Minimum card count**: Expects >= 2 cards (matches expected record count)
- **Field value assertion**: Uses regex match on first 10 chars to avoid exact string matching
- **Content visibility**: Uses `.isVisible()` with fallback `.catch(() => false)` for permissive checks

## Known Stubs

None — both specs are complete and ready for execution once backend is running.

## Threat Flags

- **Public form endpoint**: Form submission is intentionally public (test-only feature); test is on isolated test base under admin control ✓
- **No new packages**: No npm/pip/cargo installs required ✓

## Self-Check: Code Review

- `form-view.spec.ts` — FOUND, structure matches grid-view.spec.ts pattern
- `gallery-view.spec.ts` — FOUND, structure matches grid-view.spec.ts pattern
- Both specs import `authFile` from `../../fixtures/authPaths` ✓
- Both specs import `getOrCreateTestBase` from `../../fixtures/testBase` ✓
- Both specs use `test.use({ storageState: authFile })` ✓
- Both specs have `beforeAll` with baseId/tableId setup ✓
- Both specs have console error collection + assertion ✓
- playwright.config.ts updated to use `next dev/start` ✓

## Notes for Execution

When backend is running, tests can be executed individually:
```bash
# Form view only
E2E_WEBSERVER_MODE=DEV pnpm exec playwright test e2e/pages/features/form-view.spec.ts

# Gallery view only
E2E_WEBSERVER_MODE=DEV pnpm exec playwright test e2e/pages/features/gallery-view.spec.ts

# Both together
E2E_WEBSERVER_MODE=DEV pnpm exec playwright test e2e/pages/features/form-view.spec.ts e2e/pages/features/gallery-view.spec.ts
```

All tests depend on successful auth setup. If auth.ts fails, no feature tests will run. The error message "TimeoutError: page.waitForSelector: Timeout 15000ms exceeded" on `#email` selector indicates the frontend app did not load — check backend availability.
