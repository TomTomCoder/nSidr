---
phase: 15-ai-provider-gateway
plan: "04"
subsystem: ai-gateway
tags: [ai, gateway, setting, retrofit, createGateway-removal]
dependency_graph:
  requires: ["15-01"]
  provides: [setting-open-api-gateway-routed]
  affects:
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts
    - apps/nestjs-backend/src/features/ai/ai.service.ts
tech_stack:
  added: []
  patterns: [gateway-injection, ad-hoc-provider-array, getModelInstance-routing, getAdHocGatewayModelInstance]
key_files:
  created: []
  modified:
    - apps/nestjs-backend/src/features/ai/ai.service.ts
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.spec.ts
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.module.ts
decisions:
  - "getAdHocGatewayModelInstance added to AiService for ad-hoc credential testing (testAiGatewayKey / testAttachmentTransferModes) — keeps createGateway confined to ai module without requiring architectural change"
  - "testImageGenerationModel refactored to accept image model instance directly (no inline factory); Google path receives text model instance (generateText semantics)"
  - "testLLM constructs ad-hoc llmProviders array from request body for getModelInstance routing"
  - "AiModule imported into SettingOpenApiModule to resolve AI_SERVICE token via DI"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-07T00:00:00Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 15 Plan 04: setting-open-api.service Gateway Retrofit Summary

GW-01/GW-04 highest-blast-radius retrofit: all 15+ provider-SDK call sites in setting-open-api.service.ts now route through aiService.getModelInstance/getAdHocGatewayModelInstance — zero direct @ai-sdk/* imports or createGateway calls remain.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Inject AiService + retrofit text-gen + image-gen + probe sites | c29b1258d | setting-open-api.service.ts, ai.service.ts, setting-open-api.module.ts, setting-open-api.service.spec.ts |

(Tasks 1 and 2 were combined: image-gen, routing tests, and all call sites were retrofitted in a single commit.)

## Call Sites Retrofitted

### Group A — Text generation / connectivity probe (4 sites)
- `testLLM` AI_GATEWAY branch → `aiService.getAdHocGatewayModelInstance(apiKey, model, baseUrl)`
- `testLLM` non-gateway text branch → `aiService.getModelInstance(modelKey, llmProviders)`
- `testSingleModel` AI_GATEWAY branch → `aiService.getAdHocGatewayModelInstance(apiKey, model, baseUrl)`
- `testSingleModel` non-gateway branch → `aiService.getModelInstance(modelKey, llmProviders)`

### Group B — Image generation (2 sites)
- `testLLM` non-Google image branch → `aiService.getModelInstance(modelKey, llmProviders, true)`
- `testLLM` Google image branch → `aiService.getModelInstance(modelKey, llmProviders)` (text model; uses generateText)

### Group C — Ad-hoc key testing (2 sites)
- `testAiGatewayKey` → `aiService.getAdHocGatewayModelInstance(apiKey, 'openai/gpt-4o-mini', baseUrl)`
- `testAttachmentTransferModes` → `aiService.getAdHocGatewayModelInstance(apiKey, testModel, baseUrl)`

## Verification Results

### grep gate
```
grep -c "@ai-sdk/|createGateway" setting-open-api.service.ts → 0  PASS
grep -c "imageModel(" setting-open-api.service.ts → 0  PASS
grep -c "getModelInstance|getAdHocGatewayModelInstance" setting-open-api.service.ts → 8  PASS
```

### Test results
```
6/6 tests GREEN (setting-open-api.service.spec.ts):
  - sends runtime build version to public access checker ✓
  - uses the catalog default size when testing GPT image text-to-image generation ✓
  - infers image generation testing from catalog when testImageGeneration is omitted ✓
  - uses prompt images when testing GPT image image-to-image generation ✓
  - text-gen path calls getModelInstance with isImageGeneration falsy ✓
  - image-gen path calls getModelInstance with isImageGeneration=true ✓
```

Note: 3 pre-existing failures in unrelated specs (action-proposal, unified-ai, workspace-state) are out-of-scope and present on main branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added getAdHocGatewayModelInstance to AiService**
- **Found during:** Task 1 — testAiGatewayKey / testAttachmentTransferModes use user-provided AI Gateway keys before they are persisted; getModelInstance for AI_GATEWAY always reads from settingService.getSetting() (DB), not from ad-hoc creds
- **Fix:** Added synchronous `getAdHocGatewayModelInstance(apiKey, modelId, baseUrl?)` to AiService that wraps createGateway internally — keeps createGateway inside the ai module, zero direct SDK calls in setting-open-api.service.ts
- **Files modified:** ai.service.ts
- **Commit:** c29b1258d

**2. [Rule 1 - Bug] testImageGenerationModel refactored to accept model instance instead of factory**
- **Found during:** Task 2 — original signature took `modelProvider: OpenAIProvider` and called `modelProvider.image(model)` inline; after retrofit, getModelInstance returns the image model directly
- **Fix:** Changed signature to `imageModelInstance: ImageModel`; Google path receives text model instance cast; inline `.image()` factory call removed
- **Files modified:** setting-open-api.service.ts
- **Commit:** c29b1258d

**3. [Rule 3 - Blocking] Package node_modules symlinks for worktree test runner**
- **Found during:** Task 1 verification — worktree has no node_modules; vitest can't resolve imports
- **Fix:** Symlinked nestjs-backend, root, openapi, formula, core, and all v2 packages' node_modules from main repo to worktree
- **Impact:** Non-code fix; symlinks are in node_modules/ which is gitignored

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. T-15-06 mitigated: createGateway is now confined to `features/ai/ai.service.ts` only; grep guard in scripts/check-no-direct-ai-sdk.sh will pass for this file after merge.

## Known Stubs

None. All retrofitted call sites have real gateway routing logic.

## Self-Check: PASSED

- [x] Commit c29b1258d exists
- [x] `grep -c "@ai-sdk/|createGateway" setting-open-api.service.ts` → 0
- [x] `grep -c "imageModel(" setting-open-api.service.ts` → 0
- [x] 6/6 tests GREEN
- [x] AiModule imported in SettingOpenApiModule
- [x] getAdHocGatewayModelInstance exported from AiService
- [x] No STATE.md / ROADMAP.md modified
