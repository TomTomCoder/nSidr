---
status: partial
phase: 14-process-separation
source: [14-VERIFICATION.md]
started: 2026-06-03T00:00:00Z
updated: 2026-06-03T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Separated stack boots without errors
expected: `pnpm dev:separated` starts both Next.js on :3000 and NestJS on :3001 without errors
result: [pending]

### 2. Browser loads app in separated mode
expected: `http://localhost:3000` loads the Teable UI correctly
result: [pending]

### 3. NestJS health endpoint responds
expected: `http://localhost:3001/api/health` returns `{"status":"ok"}`
result: [pending]

### 4. Playwright separated-mode spec passes
expected: `cd apps/nextjs-app && npx playwright test e2e/doc-library-separated.spec.ts` — all 3 tests green, save < 3s
result: [pending]

### 5. NestJS RSS stays below 500MB
expected: After 10 minutes of use, `ps -o pid,rss,pmem -p $(lsof -ti:3001)` — RSS column < 500000
result: [pending]

### 6. Combined mode regression check
expected: `npx playwright test e2e/doc-library.spec.ts` passes in normal combined mode
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
