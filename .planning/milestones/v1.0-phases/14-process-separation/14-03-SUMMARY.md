---
phase: 14-process-separation
plan: "03"
subsystem: e2e-testing
tags: [playwright, e2e, process-separation, doc-library, regression]
dependency_graph:
  requires: ["14-01", "14-02"]
  provides: ["regression-spec-separated-mode"]
  affects: ["apps/nextjs-app/e2e/"]
tech_stack:
  added: []
  patterns: ["Playwright standalone spec (no webServer config)", "external server assumption pattern"]
key_files:
  created:
    - apps/nextjs-app/e2e/doc-library-separated.spec.ts
  modified: []
decisions:
  - "Spec connects to externally-started servers (no webServer config) — avoids needing to manage concurrently from within Playwright"
  - "PATCH latency measured with Date.now() delta and page.waitForResponse with 3000ms timeout"
  - "Combined-mode test marked test.skip with comment pointing to existing doc-library.spec.ts"
metrics:
  duration: "8m"
  completed: "2026-06-02"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 14 Plan 03: Playwright Separated Mode Regression Spec Summary

Playwright spec for doc-library separated mode regression, asserting GC stall elimination via < 3 second save latency.

## What Was Built

`apps/nextjs-app/e2e/doc-library-separated.spec.ts` — A standalone Playwright spec that connects to externally-started servers (`pnpm dev:separated`) and verifies AC1/AC2/AC4/AC5 acceptance criteria.

## Tests in the Spec

| Test | AC | Status |
|------|----|--------|
| NestJS health endpoint responds at port 3001 | AC1 | auto (non-skipped) |
| App loads at localhost:3000 without connection errors | AC1, AC5 | auto (non-skipped) |
| Doc-library save completes in < 3 seconds in separated mode | AC2 | auto (non-skipped) |
| Combined mode pnpm start still works | AC4 | `test.skip` — run separately |

## How to Run

**Prerequisites:** Start separated servers first:
```bash
pnpm dev:separated
# Wait ~30 seconds for both NestJS (port 3001) and Next.js (port 3000) to start
```

**Run the spec:**
```bash
cd apps/nextjs-app
npx playwright test e2e/doc-library-separated.spec.ts
# or headed: npx playwright test e2e/doc-library-separated.spec.ts --headed
```

**Run existing combined-mode spec (AC4):**
```bash
cd apps/nextjs-app
npx playwright test e2e/doc-library.spec.ts
```

## Live Test Run Result

**Status: Pending human verification**

The app server was not running at execution time (worktree environment, no services started). The spec was written and committed but could not be executed end-to-end automatically.

To complete AC1-AC5 verification, follow the human-verify checkpoint in the plan:
1. `pnpm dev:separated` — both NestJS (3001) and Next.js (3000) start with coloured prefixes
2. Visit `http://localhost:3000` — app loads
3. Visit `http://localhost:3001/api/health` — returns `{"status":"ok"}`
4. Run `npx playwright test e2e/doc-library-separated.spec.ts` — all non-skipped tests pass
5. Check NestJS RSS after 10 minutes: `ps -o pid,rss,pmem -p $(lsof -ti:3001) | head -3` — RSS below 500000 (500MB)

## Key Design Decisions

- **No webServer config** — spec assumes servers already running externally, avoids managing `concurrently` from Playwright context
- **PATCH < 3000ms** — threshold is the AC2 regression gate; previously 30-60 seconds due to GC stalls
- **`page.waitForResponse` with timeout 3000** — intercepts PATCH `/docs/:id` to confirm proxy routing and end-to-end latency
- **Idempotent cleanup** — doc is deleted after save test so re-runs do not accumulate test data

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 3.1: Write spec | ec272951e | feat(14-03): add Playwright spec for doc-library separated mode |

## Self-Check: PASSED

- [x] `apps/nextjs-app/e2e/doc-library-separated.spec.ts` exists
- [x] Commit `ec272951e` exists
- [x] No STATE.md or ROADMAP.md modifications made
