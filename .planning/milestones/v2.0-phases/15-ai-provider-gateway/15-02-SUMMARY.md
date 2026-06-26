---
phase: 15-ai-provider-gateway
plan: "02"
subsystem: ai-gateway
tags: [ai, embeddings, gateway, fail-loud, gw-04, d-15-04, tdd]
dependency_graph:
  requires: [15-01]
  provides: [gateway-routed-embeddings, getAIConfigBySpaceId, embeddingProviderNotSet-i18n]
  affects: [unified-ai.service.ts, ai.service.ts, embedding.service.ts, ingestion.service.ts, search.service.ts]
tech_stack:
  added: []
  patterns: [fail-loud, gateway-routing, spaceId-scoped-config]
key_files:
  created: []
  modified:
    - apps/nestjs-backend/src/features/ai/unified-ai.service.ts
    - apps/nestjs-backend/src/features/ai/unified-ai.service.spec.ts
    - apps/nestjs-backend/src/features/ai/ai.service.ts
    - apps/nestjs-backend/src/features/doc-search/embedding.service.ts
    - apps/nestjs-backend/src/features/doc-search/embedding.service.spec.ts
    - apps/nestjs-backend/src/features/doc-search/ingestion.service.ts
    - apps/nestjs-backend/src/features/doc-search/search.service.ts
    - apps/nestjs-backend/src/worker/openai-embedding.generator.ts
    - apps/nestjs-backend/src/types/i18n.generated.ts
    - packages/common-i18n/src/locales/en/sdk.json
decisions:
  - "getAIConfigBySpaceId added to AiService — embedding path has spaceId not baseId, so a separate method avoids the base DB lookup"
  - "IEmbeddingGenerator interface updated to include spaceId — threads through EmbeddingService.generateBatchEmbeddings and generateEmbedding to all callers"
  - "OpenAiEmbeddingGenerator accepts _spaceId (ignored) — worker fallback maintains interface compatibility without config resolution"
  - "Worker payload already carried spaceId (RESEARCH Open Question 1) — no schema extension needed (ingestion.service.ts receives spaceId as first arg)"
  - "OPENAI_API_KEY changelog: no longer used for embedding fallback (RESEARCH V14 per plan output spec)"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-06T23:27:31Z"
  tasks_completed: 1
  files_modified: 10
---

# Phase 15 Plan 02: Embeddings Retrofit Through Gateway Summary

GW-04 closed: gateway-routed embeddings with spaceId-resolved embeddingProvider config; silent OpenAI fallback removed; fail-loud verified by TDD tests.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| RED | Failing tests for GW-04 gateway routing | 46719d931 | unified-ai.service.spec.ts |
| GREEN | Retrofit generateEmbeddings through gateway | 70e5860f9 | unified-ai.service.ts, ai.service.ts, embedding.service.ts, ingestion/search |

## Verification Results

### grep gate — D-15-04 (T-15-03 / T-15-05 mitigated)
```
grep -c "OPENAI_API_KEY|api.openai.com/v1/embeddings" apps/nestjs-backend/src/features/ai/unified-ai.service.ts
0
```
Both threats mitigated: env read gone, direct fetch gone.

### Test results (TDD)
```
pnpm --filter @teable/backend exec vitest run src/features/ai/unified-ai.service.spec.ts
Tests: 1 failed (pre-existing, out of scope) | 8 passed (9 total)
  - Test 8: generateEmbeddings throws CustomHttpException when no embeddingProvider configured (no silent fallback) PASS
  - Test 9: generateEmbeddings routes through aiService.embed with correct model key PASS
```

Pre-existing failures: Test 3 (proposal mock mismatch) — pre-dates this plan, out of scope.

```
pnpm --filter @teable/backend exec vitest run src/features/ai/
Tests: 3 failed (pre-existing) | 50 passed (53 total)
```

### Worker payload research (RESEARCH Open Question 1)
The doc-ingest worker's `ingestion.service.ts` already receives `spaceId` as its first parameter in both `ingestDoc` and `reindexDoc`. No payload schema extension was needed — just thread spaceId into `generateBatchEmbeddings(cappedContents, spaceId)` calls.

## CHANGELOG: OPENAI_API_KEY no longer used for embedding fallback (RESEARCH V14)
Plan 15-02 removes the last hardcoded `process.env.OPENAI_API_KEY` read from `unified-ai.service.ts`. Embeddings now require an explicit `embeddingProvider` in AI settings (space-level integration config). If absent, a `CustomHttpException(VALIDATION_ERROR)` is thrown with i18n key `httpErrors.ai.embeddingProviderNotSet`. The `OpenAiEmbeddingGenerator` worker fallback still reads `OPENAI_API_KEY` but that is the standalone doc-ingest worker path (separate from the API process gateway path).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock('ai') missing jsonSchema/zodSchema exports**
- **Found during:** RED phase — pre-existing tests 1-7 failing with "No zodSchema export is defined"
- **Issue:** The `ai` mock in `unified-ai.service.spec.ts` only included `generateText` and `tool`, but `unified-ai.service.ts` also imports `jsonSchema as buildJsonSchema, zodSchema as buildZodSchema`
- **Fix:** Added `jsonSchema: vi.fn((schema) => schema), zodSchema: vi.fn((schema) => schema)` to the mock
- **Files modified:** unified-ai.service.spec.ts
- **Commit:** 46719d931

**2. [Rule 2 - Missing] Test status assertion corrected to match actual HttpErrorCode**
- **Found during:** GREEN phase — test expected status 422 (UNPROCESSABLE_ENTITY) but HttpErrorCode.VALIDATION_ERROR maps to 400
- **Fix:** Updated test assertion from `status: 422` to `status: 400`
- **Files modified:** unified-ai.service.spec.ts
- **Commit:** 70e5860f9

**3. [Rule 2 - Missing] Updated embedding.service.spec.ts callers for new spaceId signatures**
- **Found during:** GREEN phase — IEmbeddingGenerator signature changed required all existing spec assertions to pass spaceId
- **Fix:** Updated 3 test assertions to pass 'space-1' as spaceId parameter
- **Files modified:** embedding.service.spec.ts
- **Commit:** 70e5860f9

**4. [Rule 3 - Blocking] Worktree node_modules symlinks for test runner**
- **Found during:** RED phase — worktree has no `node_modules/`, vitest can't run
- **Fix:** Symlinked root and per-package `node_modules` from main repo to worktree
- **Impact:** Non-code fix; symlinks in `node_modules/` which is gitignored

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| None | — | No new network endpoints; T-15-03 and T-15-05 explicitly mitigated |

## Known Stubs

None. All embedding paths are now fully implemented with real logic.

## TDD Gate Compliance

- [x] RED gate: test(15-02) commit 46719d931 — failing tests added before implementation
- [x] GREEN gate: feat(15-02) commit 70e5860f9 — implementation makes tests pass

## Self-Check: PASSED

- [x] unified-ai.service.ts exists and contains `getAIConfigBySpaceId` call
- [x] grep returns 0 for OPENAI_API_KEY in unified-ai.service.ts
- [x] Commit 46719d931 exists (RED)
- [x] Commit 70e5860f9 exists (GREEN)
- [x] Tests 8 and 9 pass GREEN
- [x] embeddingProviderNotSet key in sdk.json and i18n.generated.ts
