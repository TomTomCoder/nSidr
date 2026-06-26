# Phase 15: AI Provider Gateway — Research

**Researched:** 2026-06-06
**Domain:** AI provider routing (Vercel AI SDK in-process gateway) + Nest DI + Prisma schema + Next.js admin UI
**Confidence:** HIGH on codebase audit; MEDIUM on Vercel AI SDK API details (Context7 unavailable in this session — see Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-15-01** Keep Vercel AI SDK `createGateway` — defer LiteLLM. Planner MUST correct ROADMAP.md Goal text "self-hosted LiteLLM gateway" → "Vercel AI SDK in-process gateway".
- **D-15-02** Per-model key override UX = **inline in model picker** ("Override" link → small key+label form). Settings page lists overrides for management/audit only.
- **D-15-03** Cascade = **strict 2-level: model-override → provider-default → FAIL LOUD**. No env-var fallback. No silent provider switching. Error must name the missing key + model.
- **D-15-04** Embedding provider is a **distinct space-level config** (own provider+model+key cascade). Remove the silent OpenAI fallback at `unified-ai.service.ts:598-631` — replace with typed error.
- **D-15-05** Ollama = connect-to-existing only. Store URL (default `http://localhost:11434`), list models via `GET /api/tags`. UI shows `Install Ollama →` link to `https://ollama.com/download` in new tab. No bundling, no spawn, no model-pull UI.
- **D-15-06** Retrofit ALL 4 callers. Phase exit criterion: `grep -r "@ai-sdk/\|createOpenAI\|generateText" apps/nestjs-backend/src --include="*.ts" --exclude="*spec*"` returns hits ONLY inside `apps/nestjs-backend/src/features/ai/`.

### Claude's Discretion
- Gateway module name (`AiService` vs `AiGatewayService`).
- Gateway API surface — single `complete()` or richer (`generateText/streamText/embed/embedMany`).
- UI affordance for "no embedding provider configured" (toast+link vs disabled).

### Deferred Ideas (OUT OF SCOPE)
LiteLLM proxy, cost dashboards, per-org spend caps, rate-limit UI, AI-Gen Column polish (Phase 16), AI surface UI simplification (Phase 20), model picker rewrite (Phase 23), Ollama launch-from-app, cross-provider fallback.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GW-01 | Per-provider API key registration for all 18 providers | **Already built** — `llmProviderSchema` in `packages/openapi/src/admin/setting/update.ts:82-91` (type/name/apiKey/baseUrl/models/modelConfigs); `modelProviders` map in `apps/nestjs-backend/src/features/ai/util.ts`. Verify only. |
| GW-02 | Modality-filtered model catalog (text/embedding/image, vision/audio/video flags) | **Already built** — `gateway-model.ts` types + `setting.service.getGatewayModels()` with 1h cache. Verify only. |
| GW-03 | Ollama support — connect-to-existing + install link | **Provider wired** (`ollama-ai-provider-v2` in `util.ts`); **gap**: UI install link + `GET /api/tags` model listing not present in `LlmProviderForm.tsx`. |
| GW-04 | All AI features route through gateway + separate embedding provider config | **Gap**: `unified-ai.service.ts:598-631` `generateEmbeddings()` bypasses the gateway entirely (hardcoded `process.env.OPENAI_API_KEY` + direct fetch to `api.openai.com`). Schema has `embeddingModel: string` but no embedding-provider-key-cascade plumbing. |
| GW-05 | Per-model key override with cascade `model → provider → fail` | **Schema partially ready**: `modelConfigs: Record<string, IModelConfig>` exists on `llmProviderSchema:90` — but `modelConfigSchema` does NOT include an `apiKey` field today. Need schema extension + resolver code + UI inline override. |
</phase_requirements>

## Summary

Phase 15 is **75% built**. The Vercel AI SDK in-process gateway is fully wired at
`apps/nestjs-backend/src/features/ai/ai.service.ts` (1535 lines), with `createGateway()`
used for the Vercel AI Gateway path and a 18-provider factory map in
`apps/nestjs-backend/src/features/ai/util.ts` for direct-provider keys. The AI config
schema in `packages/openapi/src/admin/setting/update.ts` already supports
`llmProviders[]`, `embeddingModel`, `chatModel`, `aiGatewayApiKey`, and per-model
`modelConfigs`. **Phase 15 is mostly verify-and-gap-fill — not greenfield.**

Three real gaps remain:
1. **GW-04 embeddings** — `unified-ai.service.ts:598-631` is a hardcoded direct fetch to OpenAI; needs gateway routing + separate-embedding-provider cascade.
2. **GW-05 per-model key override** — `modelConfigSchema` lacks an `apiKey` field; resolver in `ai.service.ts:182` (`getModelConfig`) does not consult model-level overrides; UI has no inline override affordance.
3. **GW-03 Ollama UX** — provider is wired, but no `Install Ollama →` link and no `GET /api/tags` model-listing flow in `LlmProviderForm.tsx`.

Two callers still import `generateText` outside the gateway module:
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts:3,317` (Phase 17)
- `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts:5,37` (uses `createGateway` + `generateText` + `generateImage` directly across ~15 call sites)

**Primary recommendation:** Plan as **5 small slices** — schema first, then resolver, then retrofit each caller, then UI. Defer Ollama-UX slice to last (lowest risk).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-provider API key storage | API / Backend (Setting entity, `aiConfig.llmProviders[]`) | — | Server-only secrets; never reaches browser |
| Model catalog + modality flags | API / Backend (cache 1h) | Frontend (read-only consumer) | Authoritative on server, cached + shipped to UI |
| Model resolver / cascade | API / Backend (`ai.service.ts.getModelConfig`) | — | Pure server logic; UI sends `modelKey` string |
| Embedding generation | API / Backend (gateway), Worker (doc-ingest) | — | Worker carries `spaceId` per AUDIT; needs threaded config |
| Per-model override UI | Frontend (Next.js admin form) | API (POST setting update) | Inline edit form in model picker |
| Ollama URL config + model list | Frontend (fetch via backend proxy) | API (proxy `/api/tags` to avoid CORS+secrets-in-browser) | URL stored on backend; model list fetched server-side |
| Install Ollama link | Frontend (static anchor) | — | Pure presentational, opens external URL in new tab |

## Standard Stack

### Core (all already installed — verify, don't reinstall)
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `ai` | (in package.json — verify) | `createGateway`, `generateText`, `streamText`, `embed`, `embedMany`, `tool`, `stepCountIs` | `ai.service.ts:28`, `agent-execution.service.ts:3` |
| `@ai-sdk/openai` + 10 sibling provider pkgs | (installed) | Provider factories for direct (non-gateway) calls | `apps/nestjs-backend/src/features/ai/util.ts` |
| `ollama-ai-provider-v2` | (installed) | Ollama provider | `util.ts` modelProviders map |
| `@openrouter/ai-sdk-provider` | (installed) | OpenRouter | `util.ts` |

### Supporting (already in repo)
| Library | Purpose |
|---------|---------|
| `@hookform/resolvers/zod` + `react-hook-form` | UI form validation in `LlmProviderForm.tsx` |
| `zod` | Schema in `packages/openapi/src/admin/setting/update.ts` |
| Prisma | Setting persistence (no schema migration likely needed — `aiConfig` is JSON-on-Setting) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | LiteLLM standalone proxy | Deferred per D-15-01 — would discard 1.5k lines of working code |

**Installation:** None needed — every required library is already installed.

**Version verification:** `[ASSUMED]` — could not run `npm view` in this session (context-mode tools unreported; sandbox limits). Planner should run `npm list ai @ai-sdk/openai ollama-ai-provider-v2` once at start of execution to lock versions in PLAN.md.

## Package Legitimacy Audit

**No new packages installed in this phase** — every library is already present in the repo (audited via grep of import paths). Slopcheck not required for the phase as drafted. If the planner discovers a need to add a package (e.g., separate `@ai-sdk/cohere` if not present for embeddings), it must be slopcheck-verified before install.

## Architecture Patterns

### System Architecture Diagram

```
                 ┌─────────────────────────────────────────┐
                 │  Admin UI (LlmProviderForm.tsx)         │
                 │  - provider key + baseUrl + models      │
                 │  - [NEW] inline per-model override      │
                 │  - [NEW] embedding-provider picker      │
                 │  - [NEW] "Install Ollama →" link        │
                 └─────────────┬───────────────────────────┘
                               │ POST /api/admin/setting (aiConfig JSON)
                               ▼
                 ┌─────────────────────────────────────────┐
                 │  SettingService (persistence)            │
                 │  aiConfig.llmProviders[].modelConfigs    │
                 │  + [NEW] aiConfig.embeddingProvider      │
                 └─────────────┬───────────────────────────┘
                               │
   ┌──────────────────┬────────┴─────────┬────────────────────────────┐
   │                  │                  │                            │
   ▼                  ▼                  ▼                            ▼
┌───────────┐   ┌──────────────┐  ┌─────────────────┐         ┌──────────────┐
│ chat,     │   │ agent run    │  │ open-api LLM    │         │ doc-ingest   │
│ ai-gen,   │   │ (Phase 17)   │  │ (image/text gen)│         │ worker       │
│ proposals │   │              │  │                 │         │ (embeddings) │
│           │   │              │  │                 │         │              │
│ unified-  │   │ agent-       │  │ setting-open-   │         │ embed flow   │
│ ai.svc    │   │ execution.svc│  │ api.service     │         │              │
└─────┬─────┘   └──────┬───────┘  └────────┬────────┘         └──────┬───────┘
      │                │                   │                          │
      └────────────────┴───────┬───────────┴──────────────────────────┘
                               ▼
                 ┌─────────────────────────────────────────┐
                 │  AiService (the gateway)                │
                 │  - getModelConfig(modelKey, providers)  │
                 │  - [NEW] resolveKey(modelKey)           │  ← cascade: model→provider→THROW
                 │  - [NEW] embed(text[], embedConfig)     │  ← separate embedding cascade
                 │  - getModelInstance() → ILanguageModel  │
                 │  - generateText/streamText/embedMany    │
                 └─────────────┬───────────────────────────┘
                               │
                ┌──────────────┴───────────────┐
                ▼                              ▼
        ┌───────────────┐              ┌──────────────────┐
        │ createGateway │              │ direct provider  │
        │ (Vercel AI    │              │ factories (11+)  │
        │  Gateway path)│              │ from util.ts     │
        └───────────────┘              └──────────────────┘
```

**Component responsibilities:**

| Component | Responsibility |
|-----------|---------------|
| `ai.service.ts` | Sole owner of `createGateway`, `generateText`, `streamText`, provider factories. Exposes `AI_SERVICE` token. |
| `util.ts` | Provider factory map (`modelProviders`) + `getAdaptedProviderOptions`. No business logic. |
| `unified-ai.service.ts` | Chat / proposal orchestration. **Retrofit:** stop calling `fetch('https://api.openai.com/...')` directly. Use `aiService.embed()`. |
| `agent-execution.service.ts` | Agent runtime. **Retrofit:** replace direct `generateText({model})` with `aiService.generateText({modelKey, ...})`. |
| `setting-open-api.service.ts` | Plugin SDK endpoints. **Retrofit:** replace ~15 direct `createGateway/generateText/generateImage` call sites with gateway calls (largest retrofit). |
| `LlmProviderForm.tsx` | Provider/key editor. **Extend:** per-model override panel, embedding-provider picker, Ollama install link. |

### Recommended Project Structure
```
apps/nestjs-backend/src/features/ai/
├── ai.service.ts          # Gateway (existing — extend with embed() + resolveKey())
├── util.ts                # Provider factory map (existing — no change)
├── unified-ai.service.ts  # Chat orchestration (retrofit embeddings)
├── constant.ts            # Task→model-key constants (existing)
└── ai.module.ts           # AI_SERVICE token wiring
```

### Pattern 1: Strict-cascade key resolver
**What:** Resolve API key in order `modelConfigs[modelKey].apiKey → llmProvider.apiKey → throw NamedConfigMissingError`.
**When to use:** Every code path that needs a provider key for a `modelKey`.
**Example:**
```typescript
// Source: synthesised from D-15-03 + existing getModelConfig at ai.service.ts:182
// [ASSUMED] — needs review during planning
function resolveApiKey(modelKey: string, providers: LLMProvider[]): string {
  const [providerType, modelId] = parseModelKey(modelKey);
  const provider = providers.find((p) => p.type === providerType);
  if (!provider) throw new ConfigurationError(`No provider configured: ${providerType}`);
  const modelOverride = provider.modelConfigs?.[modelId]?.apiKey;
  if (modelOverride) return modelOverride;
  if (provider.apiKey) return provider.apiKey;
  throw new ConfigurationError(
    `No API key configured for model ${modelKey}. ` +
      `Set a model override or a provider default key in AI settings.`
  );
}
```

### Pattern 2: Separate embedding-provider cascade
**What:** Embedding calls take an `embeddingProvider` config (resolved from `aiConfig.embeddingModel` + the provider it belongs to) and route through gateway/provider factories same as chat — but use `embed/embedMany`, not `generateText`.
**When to use:** `unified-ai.service.generateEmbeddings()` and any doc-ingest worker call.

### Anti-Patterns to Avoid
- **Silent provider fallback** — D-15-03 forbids. If GPT-4 key is missing, do NOT silently use Claude.
- **`process.env.OPENAI_API_KEY` fallback** — D-15-04 explicitly removes this from `unified-ai.service.ts:602`.
- **Provider SDK imports outside `ai/`** — D-15-06 phase exit criterion forbids. Verifiable via grep.
- **`import type` for DI-injected services** — Phase 17 bug-1; type-only imports are erased at runtime, breaking Nest DI metadata reflection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP to OpenAI embeddings | Custom `fetch('https://api.openai.com/v1/embeddings')` | `embed()` / `embedMany()` from `ai` package via configured provider | Already done for chat; embeddings should match. Hand-rolled fetch lacks retry/timeout/auth-rotation handled by SDK |
| Provider auth options building | New `if (type === ...)` chain | `getAdaptedProviderOptions` in `util.ts` | Already handles 11+ providers |
| Ollama model list | Manual catalog | `GET {ollamaUrl}/api/tags` (proxy via backend) | Ollama exposes its own catalog endpoint |
| Per-call key override | Re-creating provider instance every call | Vercel AI SDK accepts `model` instances built per-call from factory — already the pattern in `getModelInstance` | Existing factory pattern supports it |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `aiConfig` JSON on `Setting` row (admin) and on `Integration` row (per-space — `IntegrationType.AI`, see `ai.service.ts:257`). Both serialize `llmProviders[]` with current `modelConfigs` shape. | **Data migration consideration:** Adding `apiKey?: string` to `modelConfigSchema` is **additive** (optional field) — existing JSON blobs remain valid. No backfill required. Adding `embeddingProvider` to `aiConfigSchema` is also additive. |
| Live service config | Vercel AI Gateway API key (`aiGatewayApiKey`) stored in DB only — no external service registration needed. | None |
| OS-registered state | None — pure in-process gateway, no OS-level state. | None |
| Secrets / env vars | `process.env.OPENAI_API_KEY` is read at `unified-ai.service.ts:602`. **D-15-04 removes this read** — but operators may have set it. **Plan must include**: changelog note that OPENAI_API_KEY is no longer used for embedding fallback. | Document in PLAN.md |
| Build artifacts | None — no native modules, no generated code. **However**: if `modelConfigSchema` changes in `packages/openapi/`, the openapi package must rebuild before backend can typecheck it. | Add `yarn build packages/openapi` step before backend rebuild in any task that touches the schema. |

**Nothing found in category:** Stored embeddings in vector DB do NOT change schema — only the provider that *generates* future embeddings changes. Existing embedding vectors remain valid as long as dimensionality matches new embedding model. **PLANNER WARNING**: if user changes embedding provider/model to one with different vector dim, existing chunks become stale. Out-of-scope for Phase 15 but worth a one-line warning in UI.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` (NestJS backend) | All retrofit work | ✓ | (assumed Node 22 per node-compile-cache path) | — |
| Ollama (local) | GW-03 live test | ✗ (user-supplied per D-15-05) | — | Tests must skip if `localhost:11434` unreachable |
| OpenAI API key | Existing embedding flow | (env-only) | — | After D-15-04, only used if user sets it as a provider key explicitly |
| Postgres | Setting persistence | ✓ | per project | — |
| Vercel AI Gateway endpoint | `createGateway` path | ✓ (HTTP at runtime) | — | Direct-provider path bypasses gateway when chosen |

**Missing dependencies with fallback:** Ollama — provide skip-condition test pattern (Validation Architecture section).

## Common Pitfalls

### Pitfall 1: `import type` on a DI-injected service (Phase 17 bug-1)
**What goes wrong:** Backend refuses to boot — Nest DI cannot resolve constructor parameter.
**Why it happens:** TypeScript erases type-only imports; reflect-metadata gets `undefined` for the type token.
**How to avoid:** Use a value import for any class injected via `@Inject` or constructor type — never `import type`.
**Warning signs:** Server crash on boot referencing "Cannot read properties of undefined (reading 'name')" or "Nest cannot resolve dependencies of …".

### Pitfall 2: Schema → openapi-package → backend rebuild order
**What goes wrong:** Backend typecheck passes with stale openapi types, then fails at runtime when zod schema doesn't match actual JSON.
**How to avoid:** Any task that edits `packages/openapi/src/admin/setting/update.ts` MUST include `yarn build` for that package (or `yarn workspace @teable/openapi build`) before any backend task that depends on the new shape.

### Pitfall 3: Prisma migration drift
**What goes wrong:** Phase 17 had migrations sitting on disk for a day without being applied; Prisma client was out of date.
**How to avoid:** Phase 15 likely needs **no Prisma migration** (aiConfig is JSON), but if planner discovers one is needed, plan a `prisma generate && prisma migrate dev` task BEFORE any consumer code task, in its own checkpoint.

### Pitfall 4: Express body consumed before MCP transport (Phase 17 bug-2)
**Not directly relevant to Phase 15** — but the structural lesson is: when wiring a third-party SDK that wants to parse the request, check whether Nest's global JSON middleware has already consumed the body. Pass `parsedBody` if the SDK supports it.

### Pitfall 5: Silent fallback creep
**What goes wrong:** A "helpful" fallback hides a real configuration gap; users think things work until production load reveals the wrong provider was used.
**How to avoid:** D-15-03/04 mandate fail-loud. Any new code branch that does `if (!provider) return defaultProvider` is a phase-exit-criterion violation. Tasks must include unit tests that assert the throw with the exact error-message format.

### Pitfall 6: Mocking the AI SDK in tests
**What goes wrong:** `generateText` mocks drift; test "passes" but real API contract changed.
**How to avoid:** Use the SDK's own `MockLanguageModelV2` (or equivalent test helper from the `ai` package) instead of hand-rolled mocks. Verify the helper exists when planning tests.

### Pitfall 7: Dev-server caching of old built dist
**What goes wrong:** `apps/nestjs-backend/dist` carries an old compile of `ai.service.ts`; runtime executes stale code, retrofit "doesn't work" though source is correct.
**How to avoid:** After each merge that touches `ai/`, restart dev backend (or rely on swc hot-reload). Document in PLAN.md verification steps.

## Code Examples

### Existing gateway entry pattern (do not rewrite — extend)
```typescript
// Source: apps/nestjs-backend/src/features/ai/ai.service.ts:182-249
async getModelInstance(modelKey: string, llmProviders: ..., isImageGeneration = false) {
  const { type, model, baseUrl, apiKey } = await this.getModelConfig(modelKey, llmProviders);
  if (type === LLMProviderType.AI_GATEWAY) {
    const gatewayProvider = createGateway({ apiKey, ...(baseUrl && { baseURL: baseUrl }) });
    return isImageGeneration ? gatewayProvider.imageModel(model) : gatewayProvider(model);
  }
  // ... direct provider factories ...
}
```

### Existing embedding code to be REPLACED
```typescript
// Source: apps/nestjs-backend/src/features/ai/unified-ai.service.ts:598-631
// REMOVE per D-15-04. Replace with aiService.embed(texts, embeddingConfig).
async generateEmbeddings(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ServiceUnavailableException('OPENAI_API_KEY required for embeddings');
  // direct fetch to https://api.openai.com/v1/embeddings ...
}
```

### Target embedding pattern (D-15-04)
```typescript
// [ASSUMED] — Vercel AI SDK embedMany signature; planner must verify against installed `ai` version
import { embedMany } from 'ai';

async embed(texts: string[], embeddingProviderConfig: EmbeddingProviderConfig) {
  const modelInstance = await this.getEmbeddingModelInstance(embeddingProviderConfig);
  const { embeddings } = await embedMany({ model: modelInstance, values: texts });
  return embeddings;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One global OPENAI_API_KEY env var for everything | Per-space provider configs with key cascade | This phase | Operators stop leaking dev keys into prod |
| Single embedding model hardcoded | Configurable embedding provider per space | This phase (D-15-04) | Enables Voyage, Cohere embed-v3, etc. |
| Direct provider SDK imports scattered | Single gateway module | This phase (D-15-06) | One audit point for provider behaviour |

**Deprecated:** `process.env.OPENAI_API_KEY` as embedding fallback — replaced by explicit space config.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `embed()` / `embedMany()` are exported from the installed `ai` package version | Code Examples + Retrofit plan | MEDIUM — if not, planner uses `provider.textEmbeddingModel(model)` + direct `provider.embed()`. Run `node -e "console.log(Object.keys(require('ai')))"` to confirm in Wave 0. |
| A2 | `modelConfigSchema` does NOT currently have `apiKey` field | GW-05 schema work | LOW — verified in `update.ts:80-91` (the schema only has `name`/`isImageModel` etc; `apiKey` would need adding). |
| A3 | Per-call API key override is achieved by building a new provider instance per call (not by passing `apiKey` to `generateText` directly) | GW-05 implementation | MEDIUM — the existing `getModelInstance()` builds a fresh provider each call, so this pattern already works. Confirm by reading util.ts factory implementations. |
| A4 | Vercel AI SDK does not expose first-class "modality" metadata; modality must be sourced from Teable's own `gatewayModelSchema` | GW-02 verification | LOW — already implemented in Teable; SDK metadata is not the source of truth. |
| A5 | Ollama `GET /api/tags` returns `{ models: [{name, ...}] }` | GW-03 model list slice | LOW — well-documented Ollama API. |
| A6 | aiConfig JSON additive changes need no Prisma migration | Runtime State Inventory | LOW — `Setting.aiConfig` is a JSON column; schema is in zod, not Prisma. Confirm by inspecting `schema.prisma` for the `aiConfig` column type. |
| A7 | Context7 docs for Vercel AI SDK gateway are not retrievable in this session | Whole research | Acknowledged — Context7 MCP tool returned "No such tool". Planner should re-run Context7 query on `createGateway`, `embed`, `embedMany` at start of execution to harden A1/A3. |

## Open Questions

1. **Does the doc-ingest worker know the space at embed time?**
   - What we know: AUDIT.md says "worker already carries `spaceId`."
   - What's unclear: whether the worker job payload schema currently includes spaceId or needs extension.
   - Recommendation: Planner task 0 reads `apps/nestjs-backend/src/features/.../doc-ingest*` worker code; if spaceId missing from payload, add it before retrofit.

2. **Should `setting-open-api.service.ts` be retrofitted in this phase or split?**
   - What we know: ~15 call sites — largest retrofit.
   - What's unclear: appetite for one big PR vs. two-phase delivery.
   - Recommendation: Plan as one slice with sub-tasks per call-site group (text-gen, image-gen, key-test). If size balloons, split mid-execution.

3. **What does "embedding provider config" look like in UI?**
   - Recommendation: Reuse `LlmProviderForm` rendered in "embedding mode" (filtered model list to embedding-capable models). Avoid new form.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (per existing `*.spec.ts` in `apps/nestjs-backend/src/features/ai/`) |
| Config file | `apps/nestjs-backend/vitest.config.ts` (verify path) |
| Quick run command | `yarn workspace @teable/nestjs-backend test src/features/ai --run` |
| Full suite command | `yarn workspace @teable/nestjs-backend test --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GW-01 | All 18 providers resolvable from `llmProviders[]` config | unit | `yarn ... test ai.service.spec --run -t "providers"` | ✅ (extend) |
| GW-02 | `getGatewayModels` returns modality flags | unit | `yarn ... test setting.service.spec --run -t "gatewayModels"` | ❓ Wave 0 verify |
| GW-03 | Ollama model list endpoint proxies `GET /api/tags` | unit (mock fetch) | new spec `setting.service.spec.ts -t "ollama tags"` | ❌ Wave 0 |
| GW-03 live | Real Ollama at `localhost:11434` returns models | smoke (skip if unreachable) | `OLLAMA_LIVE=1 yarn ... test ai.live.spec --run` | ❌ Wave 0 |
| GW-04 | `embed()` routes through gateway, uses configured embedding provider | unit | new `ai.service.spec.ts -t "embed cascade"` | ❌ Wave 0 |
| GW-04 | Missing embedding provider throws typed error (no silent fallback) | unit | `unified-ai.service.spec.ts -t "no silent fallback"` | ✅ (extend) |
| GW-05 | Model-override key beats provider default | unit | `ai.service.spec.ts -t "cascade: model override wins"` | ❌ Wave 0 |
| GW-05 | Missing key throws error naming the model | unit | `ai.service.spec.ts -t "cascade: fail loud names model"` | ❌ Wave 0 |
| Retrofit | grep finds zero `@ai-sdk/`/`generateText` outside `features/ai/` | smoke | `bash scripts/check-no-direct-ai-sdk.sh` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `yarn workspace @teable/nestjs-backend test src/features/ai --run` (< 30s)
- **Per wave merge:** Full backend suite + UI typecheck `yarn workspace @teable/nextjs-app typecheck`
- **Phase gate:** Full suite + grep retrofit check + manual UAT script for UI (per-model override edit, Ollama install link click, embedding provider switch)

### Wave 0 Gaps
- [ ] `scripts/check-no-direct-ai-sdk.sh` — grep guard for D-15-06 exit criterion (small bash; runs in CI)
- [ ] Extend `apps/nestjs-backend/src/features/ai/ai.service.spec.ts` with cascade test cases
- [ ] New `apps/nestjs-backend/src/features/ai/ai.service.embed.spec.ts` for embedding cascade
- [ ] Live-Ollama skip-conditional test pattern (use `beforeAll` to `fetch('http://localhost:11434/api/tags')` and `it.skipIf(unreachable)`)
- [ ] Wave 0 must run `node -e "console.log(Object.keys(require('ai')))"` to confirm `embed`/`embedMany` exports for assumption A1

### How to verify gateway routing without burning API credits
- Inject `MockLanguageModelV2` via the SDK's test helper (verify exact export name in Wave 0).
- Use `vi.mock('ai', ...)` to capture the `model` argument passed to `generateText`/`embedMany`, asserting the model instance came from the gateway's `getModelInstance`.
- Assert key cascade by spying on `getModelConfig` return values for a fixture `llmProviders[]`.

### How to verify Ollama works without an Ollama server
- Unit: mock `global.fetch` for `/api/tags` and assert the proxy returns the parsed list.
- Smoke (opt-in): `describe.skipIf(!process.env.OLLAMA_LIVE)` for real-server tests.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (admin-only setting updates) | Existing admin guard on setting endpoints — confirm |
| V3 Session Management | indirectly | Reuse existing Nest session/cookie stack |
| V4 Access Control | yes | Per-space integration config respects existing space-permission checks |
| V5 Input Validation | yes | Zod schemas in `packages/openapi/src/admin/setting/update.ts` — extend, do not bypass |
| V6 Cryptography | yes | API keys stored as plaintext in Setting JSON today — **document** but do not fix in Phase 15 (out of scope). Add note to Open Questions for future "secrets-at-rest" phase. |
| V8 Data Protection | yes | Provider keys must NEVER be returned to browser in setting GET — verify `get-public.ts` (`simpleLLMProviderSchema`) strips them. Audit during Wave 0. |
| V14 Configuration | yes | Removing `OPENAI_API_KEY` env-var fallback (D-15-04) tightens config — operators may be surprised; needs changelog entry. |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exfiltration via public setting endpoint | Information Disclosure | Verify `simpleLLMProviderSchema` does NOT include `apiKey` or per-model `apiKey`; if `modelConfigs.apiKey` is added (GW-05), the public schema must strip it too |
| SSRF via user-controlled `baseUrl` (Ollama URL, OpenAI-compatible URL) | Tampering | Already a pattern in the codebase; verify allow-list or warn-only stance is consistent. For Ollama, default `localhost:11434` is safe; do not allow internal-network URLs without operator opt-in |
| Provider misuse causing cost explosion | Denial of Service (financial) | Out of scope — deferred to future "AI Ops" phase per CONTEXT.md |

## Risk-ranked task ordering hint (for planner)

1. **LOWEST RISK — Schema extension** (additive: add optional `apiKey` to `modelConfigSchema`, add optional `embeddingProvider` to `aiConfigSchema`). No data migration, no behaviour change. Land first to unblock downstream.
2. **LOW RISK — Gateway resolver extension** (`resolveApiKey` cascade + new `embed()` method on `AiService`). Pure addition, tests-first. No caller change yet.
3. **MEDIUM RISK — Unified-AI embeddings retrofit** (D-15-04). Replaces existing hardcoded fetch. Largest behaviour change — but small surface (lines 598-631 + threading spaceId from worker).
4. **MEDIUM RISK — UI extension** (`LlmProviderForm.tsx`: inline override, embedding picker, Ollama link). Many small UI changes; risk of regression in existing form.
5. **HIGHEST RISK — `setting-open-api.service.ts` retrofit** (~15 call sites). Largest blast radius. Do LAST so earlier slices are stable.
6. **OPTIONAL — `agent-execution.service.ts` retrofit** (Phase 17 territory; only 1 call site at line 317). Small, but interacts with Phase 17 bug-3 (still open). Coordinate with Phase 17 follow-up.

**Suggested split:** Slice 1 (schema+resolver+embed unit), Slice 2 (unified-ai retrofit), Slice 3 (UI), Slice 4 (setting-open-api retrofit), Slice 5 (agent retrofit + Ollama UX). Each slice independently shippable.

## Sources

### Primary (HIGH confidence)
- `apps/nestjs-backend/src/features/ai/ai.service.ts` lines 28, 180-250, 252-269 — gateway entry, createGateway usage, model config resolver
- `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` lines 598-631 — silent embedding fallback (the target of D-15-04)
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` lines 3, 317 — direct `generateText` import
- `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts` lines 5, 37, 253, 397, 515-535, 571, 699-820, 1133-1192 — 15+ direct call sites
- `packages/openapi/src/admin/setting/update.ts` lines 80-91, 95-100, 168-200 — `llmProviderSchema`, `modelConfigSchema`, `aiConfigSchema`
- `packages/openapi/src/admin/setting/get-public.ts` line 21 — `simpleLLMProviderSchema` (audit for key leakage)
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/LlmProviderForm.tsx` lines 1-50, 122, 276-300, 486-660 — UI structure
- `.planning/phases/15-ai-provider-gateway/15-CONTEXT.md` — all 6 decisions
- `.planning/phases/15-ai-provider-gateway/15-AUDIT.md` — confirms ✅/⚠️ status
- `.planning/phases/17-agent-mcp-enhancement/17-VERIFICATION.md` lines 27-57 — 6 live-UAT bugs (informs runtime traps)

### Secondary (MEDIUM confidence)
- Vercel AI SDK general knowledge (training data — `createGateway`, `embed`, `embedMany`, `tool`, `stepCountIs` are well-documented APIs)
- Ollama `GET /api/tags` endpoint (well-documented)

### Tertiary (LOW confidence — flag for validation)
- Exact signature of `embedMany` in the installed `ai` package version — Context7 unavailable in session (A1). Verify in Wave 0.
- Exact name of SDK test helper for mocking language models — Verify in Wave 0.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in repo, paths confirmed
- Architecture: HIGH — built on existing patterns, not greenfield
- Pitfalls: HIGH for the Phase 17-derived ones (direct evidence); MEDIUM for Phase 15-specific (forecast)
- SDK API specifics: MEDIUM — could not run Context7 in this session

**Research date:** 2026-06-06
**Valid until:** 2026-07-06 (stable codebase; SDK versions don't change weekly)
