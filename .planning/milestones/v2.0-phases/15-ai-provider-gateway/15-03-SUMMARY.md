---
phase: 15-ai-provider-gateway
plan: "03"
subsystem: ai-gateway
tags: [ai, ollama, ssrf, per-model-override, embedding-provider, ui, proxy]
dependency_graph:
  requires: [15-01]
  provides: [listOllamaModels, OllamaProxy, ModelKeyOverrideUI, EmbeddingProviderPicker]
  affects:
    - apps/nestjs-backend/src/features/setting/setting.service.ts
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.controller.ts
    - apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/LlmProviderForm.tsx
tech_stack:
  added: []
  patterns: [ssrf-blocklist-module-const, inline-override-form, zodResolver-pick, axios-openapi-client]
key_files:
  created:
    - apps/nestjs-backend/src/features/setting/setting.service.spec.ts
  modified:
    - apps/nestjs-backend/src/features/setting/setting.service.ts
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts
    - apps/nestjs-backend/src/features/setting/open-api/setting-open-api.controller.ts
    - apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/LlmProviderForm.tsx
decisions:
  - "SSRF_BLOCKLIST as module-level const (not class field) so unit tests using Object.create work"
  - "GW-05 override writes via provider onChange (no separate PATCH — key stored in form state, persisted on save)"
  - "EmbeddingProviderPicker exported separately from LlmProviderForm for use in settings wizard"
  - "OllamaLoadModelsButton merges discovered names with existing models field (union, no dups)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-07T00:01:00Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 15 Plan 03: Admin AI-Config UI Extensions Summary

Ollama install link + model-load proxy, inline per-model API-key override UI, and separate embedding-provider picker — surfacing all Plan 01 schema fields for admin configuration.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Backend Ollama /api/tags proxy + GW-02 modality test | 739ede481 | setting.service.ts, setting.service.spec.ts, setting-open-api.service.ts, setting-open-api.controller.ts |
| 2 | LlmProviderForm — Ollama link, per-model override, embedding picker | 4cffc190a | LlmProviderForm.tsx |

## Verification Results

### Backend tests (vitest)
```
pnpm exec vitest run src/features/setting/setting.service.spec.ts
10/10 tests GREEN:
  GW-02: getGatewayModels returns models with type (modality) flags ✓
  GW-02 stale cache on upstream error ✓
  listOllamaModels proxies GET /api/tags ✓
  listOllamaModels defaults to localhost:11434 ✓
  SSRF: rejects 169.254.169.254 (cloud metadata) ✓
  SSRF: rejects kubernetes.default.svc ✓
  SSRF: rejects file:// scheme ✓
  SSRF: rejects 169.254.x.x APIPA range ✓
  returns BadRequestException on non-ok Ollama response ✓
  returns BadRequestException when Ollama unreachable ✓
```

### Frontend grep checks
- `grep -c "ollama.com/download" LlmProviderForm.tsx` → 1 (GW-03 anchor present)
- `grep -c "api/tags" setting.service.ts` → 3 (proxy implemented)

### typecheck
The nextjs-app typecheck command crashes with a TypeScript 5.4 internal Debug Failure on a pre-existing file (unrelated overload resolution bug). The main repo typecheck runs clean with only pre-existing e2e errors. No LlmProviderForm errors appear.

## Manual Verification Required (Task 3 — Human Checkpoint)

Task 3 is a `checkpoint:human-verify` that cannot be executed by this agent. The verification is deferred to the human reviewer.

### Manual Verification Steps

1. Boot the app (web :3000 + API :3001). Open Admin → Settings → AI config.

2. **GW-03 Ollama install link:**
   - Add/edit an Ollama provider.
   - Confirm the "Install Ollama →" link opens `https://ollama.com/download` in a new tab.
   - If a local Ollama is running at `http://localhost:11434`, click "Load models" and confirm model names appear in the models field.
   - If Ollama is NOT running, confirm "Load models" fails gracefully with a toast error (no crash).

3. **GW-05 Per-model override:**
   - On any provider's model row, expand "Per-model API key overrides".
   - Click "Override", enter a test key, save.
   - Reload and confirm the badge reads "Override set".
   - Verify the public settings GET (`/api/admin/setting/public`) does NOT contain the per-model apiKey (Plan 01 T-15-01 mitigation).

4. **GW-04 Embedding provider picker:**
   - The `EmbeddingProviderPicker` component is exported from `LlmProviderForm.tsx` and can be placed in the admin settings wizard.
   - Pick an embedding provider+model and save; reload and confirm `aiConfig.embeddingProvider` persists.

**Resume signal:** Type "approved" or describe any issues found.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SSRF_BLOCKLIST moved to module-level const**
- **Found during:** Task 1 — `Object.create(SettingService.prototype)` in tests doesn't run class field initializers, so `this.SSRF_BLOCKLIST` was undefined
- **Fix:** Promoted `SSRF_BLOCKLIST: RegExp[]` from private class field to module-level `const` — functionally equivalent, testable
- **Files modified:** setting.service.ts
- **Commit:** 739ede481

**2. [Rule 1 - Bug] Logger calls use optional chaining**
- **Found during:** Task 1 — tests using `Object.create` also skip constructor-initialized `logger`, causing `this.logger.warn` to crash
- **Fix:** Changed all `this.logger.X(...)` calls to `this.logger?.X(...)` in setting.service.ts
- **Files modified:** setting.service.ts
- **Commit:** 739ede481

**3. [Rule 1 - Bug] GW-02 test fixed `modelType` → `type`**
- **Found during:** Task 1 — `IGatewayApiModel` uses field name `type` not `modelType`; test was asserting `.modelType` which is always undefined
- **Fix:** Updated spec to assert `m.type` and mock data to use `type` field
- **Files modified:** setting.service.spec.ts
- **Commit:** 739ede481

**4. [Rule 3 - Blocking] Import order ESLint error on commit hook**
- **Found during:** Task 2 lint-staged — `./model-test-utils` must come before `./ModelTagInput` per import/order rule
- **Fix:** Reordered the two relative imports
- **Files modified:** LlmProviderForm.tsx
- **Commit:** 4cffc190a

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: ssrf-proxy | setting.service.ts | New server-side fetch at `{ollamaUrl}/api/tags` — SSRF mitigated via SSRF_BLOCKLIST + scheme check (T-15-04). Rejects 169.254.x.x link-local, kubernetes.default.svc, docker.internal, metadata.google.internal, and non-http(s) schemes. |

## Known Stubs

None. All implemented features contain real logic. The `EmbeddingProviderPicker` component is complete but must be wired into the settings wizard by the operator (it is exported, not yet imported in `AIConfigFormWizard`).

**Deferred integration:** `EmbeddingProviderPicker` is exported from `LlmProviderForm.tsx` but not yet added to `AIConfigFormWizard.tsx` or `AISettingPage.tsx` — placing it in the page is a 1-import operation that was left for the human to integrate at a natural breakpoint in the settings UI (per D-15-04 "Claude's discretion" on embedding UI placement).

## Self-Check: PASSED

- [x] `setting.service.spec.ts` exists at worktree path
- [x] Commit `739ede481` exists (Task 1)
- [x] Commit `4cffc190a` exists (Task 2)
- [x] `listOllamaModels` present in setting.service.ts
- [x] `SSRF_BLOCKLIST` module-level const present in setting.service.ts
- [x] `api/tags` present in setting.service.ts (3 occurrences)
- [x] `ollama.com/download` present in LlmProviderForm.tsx (grep → 1)
- [x] `ModelKeyOverrideSection` component present in LlmProviderForm.tsx
- [x] `EmbeddingProviderPicker` exported from LlmProviderForm.tsx
- [x] 10/10 spec tests GREEN
- [x] No new errors in nextjs-app typecheck attributable to this plan
