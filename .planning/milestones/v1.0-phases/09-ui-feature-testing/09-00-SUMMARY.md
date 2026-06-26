---
phase: 09-ui-feature-testing
plan: "00"
subsystem: e2e-testing
tags: [playwright, fixtures, auth, e2e]
dependency_graph:
  requires: []
  provides: [playwright-port-fix, auth-fixture, test-base-fixture]
  affects: [09-01, 09-02, 09-03, 09-04, 09-05]
tech_stack:
  added: []
  patterns: [storageState-reuse, idempotent-fixture]
key_files:
  created:
    - apps/nextjs-app/e2e/fixtures/auth.ts
    - apps/nextjs-app/e2e/fixtures/testBase.ts
  modified:
    - apps/nextjs-app/playwright.config.ts
    - apps/nextjs-app/.gitignore
decisions:
  - "webServerPort set to 3001 (NestJS-embedded Next.js port) instead of legacy 3000"
  - "auth.ts uses chromium.launch directly (setup script pattern) not test.use(storageState)"
  - ".auth.json added to .gitignore to prevent session token exposure (T-09-00-01)"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-05-24T06:40:53Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
---

# Phase 9 Plan 0: Playwright Port Fix + Auth Fixtures Summary

## One-liner

Fixed webServerPort/baseURL mismatch to 3001 and created admin storageState + idempotent E2E-Test-Base fixtures that all Wave 1-2 specs depend on.

## What Was Built

### Task 1: Fix Playwright baseURL and webServerPort (commit 4c8ea0e)
- Changed `webServerPort` const from 3000 to 3001 in `playwright.config.ts`
- Added `baseURL: 'http://localhost:3001'` to the top-level `use` block
- No other config changes — reporter, timeout, and project definitions untouched

### Task 2: Admin auth storageState fixture (commit 9f27d7f)
- Created `e2e/fixtures/auth.ts` as a Playwright setup script
- Logs in as `tommy.lambert@converteo.com` using `E2E_ADMIN_PASSWORD` env var (fallback: `admin123`)
- Saves authenticated session to `e2e/fixtures/.auth.json` via `context.storageState()`
- Exports `authFile` path constant for import by downstream fixtures
- Added `/e2e/fixtures/.auth.json` to `.gitignore` (threat T-09-00-01 mitigated)

### Task 3: E2E-Test-Base fixture (commit 7ccdf67)
- Created `e2e/fixtures/testBase.ts` with `TEST_BASE_NAME = 'E2E-Test-Base'` constant
- `getOrCreateTestBase(page)` checks for existing base before creating — idempotent on re-runs
- Extended `test` fixture with `storageState: authFile` and `testBasePage` fixture
- Re-exports `test` and `expect` from `@playwright/test` so Wave 1+ specs use a single import
- Includes standalone `base.describe('Setup: create E2E-Test-Base', ...)` test block

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint errors in testBase.ts**
- **Found during:** Task 3 commit
- **Issue:** Three ESLint errors — `@typescript-eslint/consistent-type-imports` for `Page`, and two `prettier/prettier` formatting errors
- **Fix:** Ran `eslint --fix` to auto-correct all three errors
- **Files modified:** `apps/nextjs-app/e2e/fixtures/testBase.ts`
- **Commit:** included in 7ccdf67

## Known Stubs

None — all exported functions contain real implementation logic. The `getOrCreateTestBase` helper uses live Playwright selectors targeting the actual app UI.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. The `.auth.json` file (session tokens) is now gitignored per T-09-00-01.

## Self-Check

- [x] `apps/nextjs-app/playwright.config.ts` contains `localhost:3001` — FOUND
- [x] `apps/nextjs-app/e2e/fixtures/auth.ts` exists — FOUND
- [x] `apps/nextjs-app/e2e/fixtures/testBase.ts` exists — FOUND
- [x] `apps/nextjs-app/.gitignore` contains `.auth.json` entry — FOUND
- [x] commit 4c8ea0e exists — FOUND
- [x] commit 9f27d7f exists — FOUND
- [x] commit 7ccdf67 exists — FOUND

## Self-Check: PASSED
