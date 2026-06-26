---
phase: 15-ai-provider-gateway
plan: "01"
subsystem: ai-gateway
tags: [ai, schema, cascade, embeddings, ci-guard]
dependency_graph:
  requires: []
  provides: [resolveApiKey, getEmbeddingModelInstance, embed, per-model-apiKey-schema, embeddingProvider-schema, public-schema-key-strip, grep-guard]
  affects: [ai.service.ts, update.ts, get-public.ts]
tech_stack:
  added: []
  patterns: [2-level-cascade, fail-loud, factory-map-embed, omit-for-public-schema]
key_files:
  created:
    - scripts/check-no-direct-ai-sdk.sh
  modified:
    - apps/nestjs-backend/src/features/ai/ai.service.ts
    - apps/nestjs-backend/src/features/ai/ai.service.spec.ts
    - apps/nestjs-backend/src/types/i18n.generated.ts
    - packages/common-i18n/src/locales/en/sdk.json
    - packages/openapi/src/admin/setting/update.ts
    - packages/openapi/src/admin/setting/get-public.ts
decisions:
  - "embedMany is exported from ai@6.0.169 — no fallback needed (Assumption A1 confirmed)"
  - "cascade: model apiKey → provider apiKey → CustomHttpException naming the model (D-15-03)"
  - "public schema: safeModelConfigSchema.omit({ apiKey }) closes T-15-01 info-disclosure"
  - "grep guard exits 1 on current tree (retrofit worklist: setting-open-api.service.ts)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-06T23:13:31Z"
  tasks_completed: 3
  files_modified: 7
---

# Phase 15 Plan 01: AI Provider Gateway Foundation Summary

Wave 0 groundwork: CI guard, cascade resolver, embedding methods, and additive schema extensions that unblock every downstream plan.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Wave 0 scaffolding — grep guard + cascade stubs | 73c37b6f2 | scripts/check-no-direct-ai-sdk.sh, ai.service.spec.ts |
| 2 | Schema extension — per-model apiKey + embeddingProvider + key strip | cdb583fdb | packages/openapi/src/admin/setting/update.ts, get-public.ts |
| 3 | Gateway resolver + embed methods | 44e79a702 | ai.service.ts, ai.service.spec.ts, i18n files |

## Verification Results

### ai export check (Assumption A1)
`embedMany` IS exported from `ai@6.0.169` — confirmed via:
```
node -e "const ai = require('.../ai'); console.log(Object.keys(ai).includes('embedMany'))"
true
```
No fallback path needed. `embedMany` used directly.

### grep guard (D-15-06)
`bash scripts/check-no-direct-ai-sdk.sh` exits 1 with retrofit worklist:
```
FAIL: Direct AI SDK imports found outside gateway module (retrofit worklist):
  apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts (@ai-sdk/)
  apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts (createGateway)
```
Guard is correct — exits 1 because callers haven't been retrofitted yet (Plans 02-05 work).
**Retrofit worklist for Plans 04/05:** `setting-open-api.service.ts`

### Test results
```
pnpm --filter @teable/backend exec vitest run src/features/ai/ai.service.spec.ts
12/12 tests passing GREEN:
  - cascade: model override wins ✓
  - cascade: provider default used when no override ✓
  - cascade: fail loud names model ✓
  - embed routes through configured provider ✓
  - 8 pre-existing tests still pass ✓
```

### Schema verification
- `grep -c "embeddingProvider" packages/openapi/src/admin/setting/update.ts` → 1
- `grep -c "omit" packages/openapi/src/admin/setting/get-public.ts` → 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added embed-routing test (4th behavior test)**
- **Found during:** Task 3
- **Issue:** Plan called for 3 cascade stubs + "embed routes through configured provider" test but spec initially only had 3
- **Fix:** Added `describe('AiService.embed — GW-04 routing')` with embed-routing test
- **Files modified:** ai.service.spec.ts
- **Commit:** 44e79a702

**2. [Rule 2 - Missing] Added i18n key `httpErrors.ai.apiKeyNotConfigured`**
- **Found during:** Task 3 — resolveApiKey throws with i18nKey that wasn't in generated types
- **Fix:** Added key to `packages/common-i18n/src/locales/en/sdk.json` and `i18n.generated.ts`
- **Files modified:** packages/common-i18n/src/locales/en/sdk.json, apps/nestjs-backend/src/types/i18n.generated.ts
- **Commit:** 44e79a702

**3. [Rule 3 - Blocking] Worktree node_modules symlinks for test runner**
- **Found during:** All tasks — worktree has no `node_modules/`, vitest can't run from there
- **Fix:** Symlinked `lint-staged`, `commitlint`, and all packages' `node_modules` from main repo to worktree to enable hooks and test runner
- **Impact:** Non-code fix; symlinks are in `node_modules/` which is gitignored

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| None | — | No new network endpoints or auth paths introduced |

`resolveApiKey` throws only the model name in the error message, never the key value (T-15-02 mitigated).

## Known Stubs

None. All implemented methods are complete with real logic.

## Self-Check: PASSED

- [x] `scripts/check-no-direct-ai-sdk.sh` exists and is executable
- [x] Commit 73c37b6f2 exists
- [x] Commit cdb583fdb exists
- [x] Commit 44e79a702 exists
- [x] `modelConfigSchema.apiKey` present in update.ts
- [x] `aiConfigSchema.embeddingProvider` present in update.ts
- [x] `safeModelConfigSchema.omit({ apiKey })` present in get-public.ts
- [x] `resolveApiKey`, `getEmbeddingModelInstance`, `embed` present in ai.service.ts
- [x] 12/12 tests GREEN
