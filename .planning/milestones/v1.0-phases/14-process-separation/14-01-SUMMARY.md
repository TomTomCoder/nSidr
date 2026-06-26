---
phase: 14-process-separation
plan: "01"
subsystem: nextjs-app/ssr-axios
tags: [process-separation, axios, env-config, backend-url]
dependency_graph:
  requires: []
  provides: [BACKEND_URL-aware-ssr-axios]
  affects: [apps/nextjs-app/src/backend/api/rest/axios.ts]
tech_stack:
  added: []
  patterns: [env-var-fallback-chain]
key_files:
  created:
    - apps/nextjs-app/.env.development
  modified:
    - apps/nextjs-app/src/backend/api/rest/axios.ts
    - apps/nestjs-backend/.env
decisions:
  - "BACKEND_URL uses nullish coalescing fallback to preserve combined-mode behaviour without any config change"
  - "No NEXT_PUBLIC_ prefix on BACKEND_URL — server-side only, never serialised to client bundle"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-02T21:13Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 14 Plan 01: SSR Axios BACKEND_URL Fix Summary

**One-liner:** BACKEND_URL-aware SSR axios factory with PORT fallback for zero-config combined mode.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1.1 | Fix SSR axios baseURL to use BACKEND_URL env var | 77417e7f1 | apps/nextjs-app/src/backend/api/rest/axios.ts |
| 1.2 | Add BACKEND_URL to .env.development for separated dev mode | 3f9e149ec | apps/nextjs-app/.env.development |
| 1.3 | Document separated-mode env block in nestjs-backend/.env | 2209a49d5 | apps/nestjs-backend/.env |

## What Was Built

Fixed the SSR axios factory to resolve the correct backend port. The previous implementation used `process.env.PORT` (the Next.js port) for all SSR HTTP calls — in separated mode this routes all API calls to the wrong process. The fix introduces a `BACKEND_URL` environment variable with a nullish-coalescing fallback to the PORT-based URL, so combined mode works unchanged.

## Decisions Made

1. **Nullish coalescing fallback**: `BACKEND_URL ?? http://localhost:${PORT}` means combined mode requires zero env change — existing .env files continue to work.
2. **Server-side only**: `BACKEND_URL` has no `NEXT_PUBLIC_` prefix so it is never serialised into the client bundle (T-14-01 accepted).
3. **Append to .env.development**: The existing file had 35 lines of build/dev config; the BACKEND_URL block was appended after the last line rather than creating a new file.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — BACKEND_URL is server-only (no NEXT_PUBLIC_ prefix); no new network endpoints introduced.

## Known Stubs

None.

## Self-Check: PASSED

- [x] apps/nextjs-app/src/backend/api/rest/axios.ts contains `process.env.BACKEND_URL`
- [x] apps/nextjs-app/.env.development contains `BACKEND_URL=http://localhost:3001`
- [x] apps/nestjs-backend/.env contains `BACKEND_SKIP_NEXT_START` comment block
- [x] Commits 77417e7f1, 3f9e149ec, 2209a49d5 exist in git log
