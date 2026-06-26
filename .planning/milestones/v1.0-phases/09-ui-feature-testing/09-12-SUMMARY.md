---
phase: 09-ui-feature-testing
plan: 12
subsystem: e2e-testing
tags: [playwright, port-fix, env-var, gap-closure]
dependency_graph:
  requires: []
  provides: [PLAYWRIGHT_PORT_FIX]
  affects: [e2e-test-runner]
tech_stack:
  added: []
  patterns: [env-var-driven-config]
key_files:
  modified:
    - apps/nextjs-app/playwright.config.ts
decisions:
  - "Default port changed from 3001 to 3000 to match actual Next.js dev server"
  - "PLAYWRIGHT_PORT and PLAYWRIGHT_BASE_URL env vars added for override without config edits"
metrics:
  duration: "3m"
  completed: "2026-05-26"
  tasks_completed: 1
  tasks_total: 1
requirements: [UI-TESTING-01]
---

# Phase 09 Plan 12: Playwright Port Fix Summary

**One-liner:** Replaced hardcoded port 3001 with env-var-driven default 3000 in Playwright config, unblocking all E2E test connections to the Next.js dev server.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix Playwright port — default 3000, env-var override | da42e3f | apps/nextjs-app/playwright.config.ts |

## What Was Built

Two targeted edits to `apps/nextjs-app/playwright.config.ts`:

1. `const webServerPort = parseInt(process.env.PLAYWRIGHT_PORT ?? '3000', 10);`
2. `baseURL: process.env.PLAYWRIGHT_BASE_URL ?? \`http://localhost:${webServerPort}\``

Zero hardcoded `3001` references remain. All `webServerConfigs` command interpolations already used `${webServerPort}` so they pick up the corrected default automatically.

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- `grep -c "3001" apps/nextjs-app/playwright.config.ts` → `0`
- `PLAYWRIGHT_PORT` line present at line 15
- `PLAYWRIGHT_BASE_URL` line present at line 106
- webServerPort defaults to 3000; overridable via `PLAYWRIGHT_PORT`
- baseURL defaults to `http://localhost:3000`; overridable via `PLAYWRIGHT_BASE_URL`

## Threat Flags

None. `parseInt` with radix 10 sanitizes `PLAYWRIGHT_PORT`; a misconfigured value causes visible test failures only.

## Self-Check: PASSED

- `apps/nextjs-app/playwright.config.ts` modified and committed at `da42e3f`
- Zero `3001` references confirmed
- Both env-var override lines confirmed present
