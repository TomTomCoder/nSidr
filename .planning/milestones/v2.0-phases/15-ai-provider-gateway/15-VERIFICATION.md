---
phase: 15-ai-provider-gateway
verified: 2026-06-07T12:00:00Z
status: human_needed
score: 6/6 must-haves verified (automated)
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 6/6
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Add OpenAI key in admin settings, configure a gateway model, trigger a test call via the UI"
    expected: "Test call succeeds through the gateway (createGateway path in ai.service.ts)"
    why_human: "Requires live app boot, real OpenAI API key, and admin UI interaction"
  - test: "Open model catalog in admin UI, apply modality filter (e.g. 'image-generation' tag)"
    expected: "Only image-generation models shown; text-only models hidden"
    why_human: "Frontend filtering behavior cannot be verified with grep; requires rendered UI"
  - test: "Install Ollama locally, add Ollama provider in admin settings, click load models, select a model, send a prompt"
    expected: "Model list loads via /api/settings/ollama-models proxy; prompt answered without cloud key"
    why_human: "Requires running Ollama daemon + live UI; SSRF proxy is server-side but selector UX needs visual check (deferred 15-03-T3)"
  - test: "Configure an embedding provider in space AI settings, index a doc, verify embeddings are stored"
    expected: "Embeddings generated via UnifiedAiService.generateEmbeddings (GW-04 path), not hard-coded OpenAI key"
    why_human: "Requires a running app with pgvector + a configured embedding provider; end-to-end picker persistence needs UI verification"
  - test: "Assign a per-model API key override to a specific model in admin UI, verify it saves and the public GET response omits the key"
    expected: "Override key stored in modelConfigs[model].apiKey; GET /api/settings returns safeModelConfigSchema (apiKey omitted)"
    why_human: "Requires admin UI save flow + network inspector to confirm key is absent from public response"
---

# Phase 15: AI Provider Gateway Verification Report

**Phase Goal:** Stand up a Vercel AI SDK in-process gateway as the single AI entry point; manage per-provider keys (with per-model override); expose a modality-filtered model catalog; support Ollama local models; retrofit Phase 17's direct OpenAI calls to route through the gateway.
**Verified:** 2026-06-07 (re-verification)
**Status:** human_needed (all 6 automated truths VERIFIED; 5 UI/live-app items require human confirmation)
**Re-verification:** Yes — regression check against initial verification; no regressions found; no gaps closed (5 human-UAT items remain outstanding by design)

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 (GW-01) | Provider key in settings → test call succeeds through gateway | ✓ VERIFIED | `ai.service.ts` `getModelInstance()` calls `createGateway({apiKey, baseURL})` for `LLMProviderType.AI_GATEWAY`; `getAdHocGatewayModelInstance()` used by testAiGatewayKey |
| 2 (GW-02) | Model catalog with modality filter | ✓ VERIFIED | `gateway-model.ts` defines `GatewayModelType` (`language/embedding/image`) + `GatewayModelTag[]`; `getGatewayModels()` returns `type` + `tags` per model; frontend filtering is human-needed |
| 3 (GW-03) | Ollama local model launch/select | ✓ VERIFIED | `util.ts` registers `createOllama` under `LLMProviderType.OLLAMA`; `setting.service.ts` `listOllamaModels()` proxies `/api/tags` with SSRF guard; endpoint wired in `setting-open-api.controller.ts` |
| 4 (GW-04) | Existing AI feature (embeddings) routes through gateway | ✓ VERIFIED | `unified-ai.service.ts` `generateEmbeddings()` calls `aiService.embed()` via configured `embeddingProvider`; API process bound to `UnifiedAiService` via `EMBEDDING_GENERATOR` token in `doc-search.module.ts` |
| 5 | No provider SDK imports outside gateway module — grep guard GREEN | ✓ VERIFIED | `scripts/check-no-direct-ai-sdk.sh` exits 0; re-confirmed by re-verification run: "OK: No direct AI SDK imports outside apps/nestjs-backend/src/features/ai/" |
| 6 (GW-05) | Per-model API-key override | ✓ VERIFIED | `ai.service.ts` `resolveApiKey()` implements 2-level cascade (modelConfigs[model].apiKey → provider.apiKey → THROW); schema in `update.ts` (`modelConfigSchema`); public GET strips apiKey via `safeModelConfigSchema` in `get-public.ts` |

**Score:** 6/6 automated truths verified

---

### Re-Verification Regression Check

All critical automated assertions re-checked against merged HEAD:

| Check | Result |
|-------|--------|
| `bash scripts/check-no-direct-ai-sdk.sh` | exit 0 — PASS (no regression) |
| `createGateway` + `resolveApiKey` + `getAdHocGatewayModelInstance` in `ai.service.ts` | All present at substantive lines — PASS |
| `agent-execution.service.ts` uses `AI_SERVICE` token, no `@ai-sdk` import | Confirmed — PASS |
| `safeModelConfigSchema = modelConfigSchema.omit({ apiKey: true })` in `get-public.ts` | Line 11 confirmed — PASS |
| `unified-ai.service.ts generateEmbeddings` at line 619 routes through `aiService.embed()` | Confirmed — PASS |

No regressions detected.

---

### Pre-Existing Known Issue (Not Phase 15)

`unified-ai.service.spec.ts` Test 3 ("chat() yields proposal event for write tools") fails. This is a PRE-EXISTING failure proven by the orchestrator: at pre-phase-15 base commit `0f7ecf9ff` this spec failed 7/7; Phase 15 fixed 6 and added 2 passing; Test 3 was already failing before Phase 15 and targets the `chat()` proposal path which Phase 15 never modified. This is NOT a Phase 15 gap. Flagged for separate fix.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/nestjs-backend/src/features/ai/ai.service.ts` | Gateway entry point + model resolution | ✓ VERIFIED | `createGateway`, `resolveApiKey`, `embed`, `getEmbeddingModelInstance`, `getAdHocGatewayModelInstance` all present and substantive |
| `apps/nestjs-backend/src/features/ai/util.ts` | Provider factory map including Ollama | ✓ VERIFIED | `createOllama` imported + registered under `LLMProviderType.OLLAMA` in `modelProviders` map |
| `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` | `generateEmbeddings` routing through gateway | ✓ VERIFIED | `generateEmbeddings()` at line 619 resolves embeddingProvider config, builds model key, calls `aiService.embed()` |
| `apps/nestjs-backend/src/features/setting/setting.service.ts` | Ollama proxy + SSRF guard | ✓ VERIFIED | `listOllamaModels()` + `assertSsrfSafe()` at lines 214-284 |
| `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts` | Gateway model catalog endpoint | ✓ VERIFIED | `getGatewayModels()` at line 1318; `listOllamaModels()` delegated from controller |
| `packages/openapi/src/admin/setting/gateway-model.ts` | Model catalog type schema (modality + tags) | ✓ VERIFIED | `GatewayModelType` (language/embedding/image) + `GatewayModelTag[]` defined |
| `packages/openapi/src/admin/setting/update.ts` | Per-model apiKey override schema (GW-05) | ✓ VERIFIED | `modelConfigSchema` with optional `apiKey`; `modelConfigs: z.record(z.string(), modelConfigSchema)` |
| `packages/openapi/src/admin/setting/get-public.ts` | apiKey stripped from public schema | ✓ VERIFIED | `safeModelConfigSchema = modelConfigSchema.omit({ apiKey: true })` |
| `scripts/check-no-direct-ai-sdk.sh` | Phase-exit grep guard | ✓ VERIFIED | Script exists, correct token list, exits 0 on current codebase |
| `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` | Agent-execution retrofit through gateway | ✓ VERIFIED | Uses `AI_SERVICE` injection token + `aiService.getModelInstance()`; no direct `@ai-sdk` or `createOpenAI` usage |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `doc-search.module.ts` | `UnifiedAiService` | `EMBEDDING_GENERATOR` token | ✓ WIRED | `{ provide: EMBEDDING_GENERATOR, useExisting: UnifiedAiService }` line 36 |
| `UnifiedAiService.generateEmbeddings` | `AiService.embed` | `@Inject(AI_SERVICE)` | ✓ WIRED | Calls `this.aiService.embed(texts, embeddingModelKey, aiConfig.llmProviders)` |
| `agent-execution.service.ts` | `AiService.getModelInstance` | `@Inject(AI_SERVICE)` | ✓ WIRED | Lines 144 + 325 confirm usage |
| `setting-open-api.controller.ts` | `settingService.listOllamaModels` | route `/ollama-models` | ✓ WIRED | Confirmed at controller route wiring |
| `ai.service.ts resolveApiKey` | modelConfigs[model].apiKey cascade | Level-1 check | ✓ WIRED | Lines 198-212: model override → provider default → THROW |

---

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| `scripts/check-no-direct-ai-sdk.sh` | `bash scripts/check-no-direct-ai-sdk.sh` | exit 0 — "OK: No direct AI SDK imports outside apps/nestjs-backend/src/features/ai/" | PASS |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Grep guard exits clean | `bash scripts/check-no-direct-ai-sdk.sh` | exit 0 | ✓ PASS |
| Ollama registered in provider map | `grep -n "createOllama" util.ts` | Found at line 16 + 126 | ✓ PASS |
| apiKey stripped from public schema | `grep "safeModelConfigSchema" get-public.ts` | `modelConfigSchema.omit({ apiKey: true })` at line 11 | ✓ PASS |
| agent-execution uses AI_SERVICE token (no direct sdk) | `grep "AI_SERVICE\|getModelInstance" agent-execution.service.ts` | Lines 7, 33, 62, 144, 325 — no @ai-sdk import | ✓ PASS |
| Worker embedding uses raw fetch (intentional, not a violation) | grep of openai-embedding.generator.ts | raw `fetch()` to openai.com — no `@ai-sdk` import; grep guard intentionally excludes raw fetch | ✓ INFO |

Note on worker: `openai-embedding.generator.ts` uses a direct `fetch()` call with `OPENAI_API_KEY`. This is an intentional lightweight-worker design (documented in the file header: "carries none of the heavy AI-module dependencies"). The grep guard (criterion 5) explicitly checks for `@ai-sdk/` package imports and `createOpenAI`/`createGateway` constructor tokens — raw fetch is not in scope. This is a WARNING for future phases (GW-04 worker path not gateway-routed) but NOT a blocker for criterion 5 as defined.

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| GW-01 | Provider key in settings → test call through gateway | ✓ SATISFIED | `createGateway({apiKey})` in `getModelInstance`; `getAdHocGatewayModelInstance` for test-before-save |
| GW-02 | Model catalog with modality filter | ✓ SATISFIED (backend) / HUMAN for UI | `GatewayModelType` + `tags` schema defined; catalog API returns both; UI filter behavior needs human |
| GW-03 | Ollama local model support | ✓ SATISFIED (backend) / HUMAN for UI | `createOllama` in provider map; proxy endpoint with SSRF guard; UI picker needs human |
| GW-04 | Embeddings route through gateway | ✓ SATISFIED | `UnifiedAiService.generateEmbeddings` → `aiService.embed()` → `getEmbeddingModelInstance()` via configured provider |
| GW-05 | Per-model API-key override | ✓ SATISFIED | 2-level cascade in `resolveApiKey`; schema + public-strip in openapi package |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `worker/openai-embedding.generator.ts` | 17-18 | `OPENAI_API_KEY` env var hard-coded fallback | ⚠️ Warning | Worker embedding not yet gateway-routed; intentional per design but means GW-04 only applies to the API process, not the ingestion worker |

No TBD/FIXME/XXX debt markers found in Phase 15 modified files.

---

### Human Verification Required

#### 1. Gateway Test Call (GW-01)

**Test:** Add OpenAI (and a second provider, e.g. Anthropic) key in admin Settings > AI. Select a gateway model. Click "Test" (or use the test-api-key endpoint).
**Expected:** 200 response; no error; call routed through `createGateway` path in `ai.service.ts`.
**Why human:** Requires live app + real API key; cannot be unit-tested without external network call.

#### 2. Model Catalog Modality Filter (GW-02)

**Test:** Open admin Settings > AI > Model Catalog. Apply a modality filter (e.g. select "Image generation only").
**Expected:** Only models with `type: 'image'` or `tags: ['image-generation']` are shown; text-only models hidden.
**Why human:** Frontend filtering logic requires rendered React UI to confirm behavior.

#### 3. Ollama Install Link + Model Picker (GW-03)

**Test:** With Ollama running locally at `http://localhost:11434`, add an Ollama provider in admin settings. Click "Load models". Select a model and send a prompt.
**Expected:** Model list loads from `/api/settings/ollama-models` proxy without CORS error; selected model responds without any cloud API key.
**Why human:** Requires running Ollama daemon; deferred from 15-03-T3.

#### 4. Embedding Picker Persistence (GW-04)

**Test:** In space AI settings, configure an embedding provider (select provider type, model). Save. Index a doc. Verify embeddings are generated.
**Expected:** `UnifiedAiService.generateEmbeddings` picks up the configured provider (not hard-coded OpenAI); embeddings stored in pgvector.
**Why human:** Requires running app + pgvector + a configured embedding provider; picker UI persistence is deferred from 15-03-T3.

#### 5. Per-Model Key Override Save + Public GET Exclusion (GW-05)

**Test:** In admin Settings > AI > Provider, expand a model and enter a per-model API key override. Save. Then call `GET /api/settings` (public endpoint) and inspect the response.
**Expected:** Override key saved; public GET response omits `apiKey` from `modelConfigs` entries (safeModelConfigSchema applied).
**Why human:** Requires admin UI form interaction + network inspector to confirm key exclusion from public response; deferred from 15-03-T3.

---

### Gaps Summary

No automated gaps found. No regressions detected in re-verification. All 6 success criteria are verified at the code level:

- GW-01: Gateway provider factory via `createGateway` is wired and used.
- GW-02: Modality types and capability tags are modeled in the schema and returned by the catalog API.
- GW-03: Ollama provider registered; proxy endpoint with SSRF protection implemented.
- GW-04: Embedding path routes through `AiService.embed()` in the API process (worker is intentionally lightweight with direct fetch — not a criterion-5 violation per the grep guard definition).
- Criterion 5: Grep guard exits 0 — no `@ai-sdk/` imports or direct provider constructors outside `features/ai/`.
- GW-05: 2-level API key cascade implemented; public schema strips per-model keys.

5 human-verification items remain — these are all deferred UI checkpoints from 15-03-T3 that require a live app boot and cannot be resolved with static analysis.

---

_Verified: 2026-06-07 (re-verification)_
_Verifier: Claude (gsd-verifier)_
