---
phase: 14-process-separation
plan: 02
subsystem: infrastructure
tags: [next.js, proxy, concurrently, dev-scripts]
dependency_graph:
  requires: [14-01]
  provides: [/api/* dev proxy, dev:separated script, start:separated script]
  affects: [apps/nextjs-app/next.config.js, package.json]
tech_stack:
  added: [concurrently ^9.1.2]
  patterns: [Next.js rewrites proxy, concurrent process startup]
key_files:
  modified:
    - apps/nextjs-app/next.config.js
    - package.json
decisions:
  - Used existing NEXTJS_SOCKET_PORT variable for apiProxy destination (no new constant needed)
  - Inserted dev:separated before dev:v2 and start:separated at end of scripts block
  - concurrently inserted alphabetically in devDependencies between @types/shell-quote and eslint
metrics:
  duration: ~8 minutes
  completed: 2026-06-02T21:18:00Z
  tasks_completed: 2
  files_modified: 2
---

# Phase 14 Plan 02: Next.js API Proxy and Separated-Mode Scripts Summary

**One-liner:** Next.js rewrites /api/* to NestJS port 3001 in dev, with `dev:separated` and `start:separated` root scripts using concurrently.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 2.1 | Add /api/* rewrite proxy to next.config.js | 4a8cdf78b | apps/nextjs-app/next.config.js |
| 2.2 | Add concurrently and separated-mode scripts | a9374d461 | package.json |

## What Was Built

### Task 2.1: /api/* Proxy Rewrite

Added `apiProxy` rewrite constant in `next.config.js` alongside the existing `socketProxy`. Both are returned in the dev-mode array; production returns `[]` unchanged. The proxy forwards `/api/:path*` to `http://localhost:${NEXTJS_SOCKET_PORT}/api/:path*` (port 3001) server-side, so cookies are forwarded without CORS issues.

### Task 2.2: Concurrently and Root Scripts

- Added `concurrently ^9.1.2` to root `devDependencies` (alphabetically positioned)
- Added `dev:separated`: starts NestJS on port 3001 (`BACKEND_SKIP_NEXT_START=true`) and Next.js on port 3000 (`BACKEND_URL=http://localhost:3001`) in parallel with `--kill-others-on-fail`
- Added `start:separated`: same pattern for production mode
- `pnpm install` completed successfully

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `grep -c "apiProxy" apps/nextjs-app/next.config.js` -> `2` (declaration + return array)
2. `node -e "const p=require('./package.json'); console.log(p.scripts['dev:separated'])"` -> script string printed
3. `node -e "const p=require('./package.json'); console.log(p.devDependencies['concurrently'])"` -> `^9.1.2`

## Known Stubs

None.

## Threat Flags

None. The `/api/*` rewrite is only active when `isProd=false` (T-14-02 mitigated). Cookie forwarding is localhost-to-localhost server-side (T-14-03 accepted). `concurrently` is a well-known package with >20M weekly downloads (T-14-SC verified).

## Self-Check: PASSED

- `apps/nextjs-app/next.config.js` contains 2 occurrences of `apiProxy`: FOUND
- `package.json` has `dev:separated`: FOUND
- `package.json` has `start:separated`: FOUND
- `package.json` devDependencies has `concurrently`: FOUND
- Commit 4a8cdf78b: FOUND
- Commit a9374d461: FOUND
