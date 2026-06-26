# Phase 15: AI Provider Gateway — Pattern Map

**Mapped:** 2026-06-07
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/nestjs-backend/src/features/ai/ai.service.ts` | service (gateway) | request-response | self — extend in-place | exact (existing file) |
| `packages/openapi/src/admin/setting/update.ts` | schema/config | transform | self — extend in-place | exact (existing file) |
| `packages/openapi/src/admin/setting/get-public.ts` | schema/config | transform | self — audit in-place | exact (existing file) |
| `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` | service | request-response | `ai.service.ts` gateway pattern | exact (retrofit) |
| `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` | service | request-response | existing `streamLlmIteration` at line 301 | exact (retrofit) |
| `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts` | service | request-response | `ai.service.ts` `getModelInstance` call pattern | role-match (retrofit) |
| `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/LlmProviderForm.tsx` | component | request-response | self — extend in-place | exact (existing file) |
| `scripts/check-no-direct-ai-sdk.sh` | utility/CI | batch | N/A — new shell script | no-analog |

---

## Pattern Assignments

### `apps/nestjs-backend/src/features/ai/ai.service.ts` — extend with `resolveApiKey()` + `embed()` + `getEmbeddingModelInstance()`

**Analog:** self (extend in-place at lines 116–253)

**Imports pattern** (lines 1–46 — already correct; DO NOT change):
```typescript
import { createGateway, generateObject, generateText, stepCountIs, streamText } from 'ai';
// NOTE: add embedMany here when implementing GW-04
// import { embedMany } from 'ai';   ← add to this import line
import { getAdaptedProviderOptions, getTaskModelKey, modelProviders } from './util';
```
Anti-pattern: Do NOT `import type` for any DI-injected service (Phase 17 bug-1 — type erased at runtime).

**Existing `getModelConfig` pattern** (lines 116–168) — copy the throw structure for `resolveApiKey()`:
```typescript
async getModelConfig(modelKey: string, llmProviders: LLMProvider[] = []) {
  const { type, model, name } = this.parseModelKey(modelKey);

  if (this.isGatewayModel(modelKey)) {
    const { aiConfig } = await this.settingService.getSetting([SettingKey.AI_CONFIG]);
    if (!aiConfig?.aiGatewayApiKey) {
      throw new CustomHttpException(
        'AI Gateway API key is not configured',
        HttpErrorCode.VALIDATION_ERROR,
        { localization: { i18nKey: 'httpErrors.ai.gatewayApiKeyNotSet' } }
      );
    }
    return { type: LLMProviderType.AI_GATEWAY, model, baseUrl: aiConfig.aiGatewayBaseUrl || undefined, apiKey: aiConfig.aiGatewayApiKey };
  }

  const providerConfig = llmProviders.find(
    (p) => p.name.toLowerCase() === name.toLowerCase() && p.type.toLowerCase() === type.toLowerCase()
  );
  if (!providerConfig) {
    throw new CustomHttpException(
      'AI provider configuration is not set',
      HttpErrorCode.VALIDATION_ERROR,
      { localization: { i18nKey: 'httpErrors.ai.providerConfigurationNotSet' } }
    );
  }
  const { baseUrl, apiKey } = providerConfig;
  return { type, model, baseUrl, apiKey };
}
```

**New `resolveApiKey` cascade to add** (GW-05 — D-15-03 strict 2-level cascade):
```typescript
// Add AFTER getModelConfig, BEFORE getModelInstance
resolveApiKey(modelKey: string, providers: LLMProvider[]): string {
  const { type, model, name } = this.parseModelKey(modelKey);
  const provider = providers.find(
    (p) => p.type.toLowerCase() === type.toLowerCase() && p.name.toLowerCase() === name.toLowerCase()
  );
  if (!provider) {
    throw new CustomHttpException(
      `No provider configured: ${type}`,
      HttpErrorCode.VALIDATION_ERROR,
      { localization: { i18nKey: 'httpErrors.ai.providerConfigurationNotSet' } }
    );
  }
  // Level 1: model-level apiKey override (GW-05)
  const modelOverride = provider.modelConfigs?.[model]?.apiKey;
  if (modelOverride) return modelOverride;
  // Level 2: provider default apiKey
  if (provider.apiKey) return provider.apiKey;
  // FAIL LOUD — D-15-03: no env-var fallback, no silent switching
  throw new CustomHttpException(
    `No API key configured for model ${modelKey}. Set a model override or a provider default key in AI settings.`,
    HttpErrorCode.VALIDATION_ERROR,
    { localization: { i18nKey: 'httpErrors.ai.apiKeyNotConfigured' } }
  );
}
```

**New `getEmbeddingModelInstance` + `embed` to add** (GW-04 — D-15-04):
```typescript
// Pattern: mirrors getModelInstance() (lines 171–253) but targets embedding models
async getEmbeddingModelInstance(embeddingModelKey: string, llmProviders: LLMProvider[]) {
  const { type, model, baseUrl, apiKey } = await this.getModelConfig(embeddingModelKey, llmProviders);
  // same factory lookup as getModelInstance() — see lines 225–253
  const provider = Object.entries(modelProviders).find(
    ([key]) => type.toLowerCase() === key.toLowerCase()
  )?.[1];
  if (!provider) throw new CustomHttpException(`Unsupported embedding provider: ${type}`, HttpErrorCode.VALIDATION_ERROR, ...);
  const providerOptions = getAdaptedProviderOptions(type as LLMProviderType, { name: model, baseURL: baseUrl!, apiKey: apiKey! });
  const modelProvider = provider(providerOptions as never);
  return modelProvider.textEmbeddingModel(model);
}

async embed(texts: string[], embeddingModelKey: string, llmProviders: LLMProvider[]): Promise<number[][]> {
  const modelInstance = await this.getEmbeddingModelInstance(embeddingModelKey, llmProviders);
  const { embeddings } = await embedMany({ model: modelInstance, values: texts });
  return embeddings;
}
```

**Error handling pattern** (lines 192–220) — copy exactly for all new throw sites:
```typescript
throw new CustomHttpException(
  '<human-readable message naming the model/provider>',
  HttpErrorCode.VALIDATION_ERROR,
  {
    localization: {
      i18nKey: 'httpErrors.ai.<key>',
      // context: { model: modelKey }   ← add context when message must include dynamic values
    },
  }
);
```

---

### `packages/openapi/src/admin/setting/update.ts` — add `apiKey` to `modelConfigSchema` + `embeddingProvider` to `aiConfigSchema`

**Analog:** self (extend in-place, lines 46–197)

**Existing `modelConfigSchema`** (lines 46–78) — add one optional field:
```typescript
export const modelConfigSchema = z.object({
  label: z.string().optional(),
  // ... existing fields ...
  isImageModel: z.boolean().optional(),
  ability: modelAbilitySchema.optional(),
  // ADD for GW-05:
  apiKey: z.string().optional(),  // per-model API key override (cascade: model → provider → FAIL)
});
```

**Existing `aiConfigSchema`** (lines 168–197) — add one optional field:
```typescript
export const aiConfigSchema = z.object({
  llmProviders: z.array(llmProviderSchema).default([]),
  embeddingModel: z.string().optional(),
  // ADD for GW-04 (separate embedding provider config per D-15-04):
  embeddingProvider: z.object({
    providerType: z.nativeEnum(LLMProviderType),
    providerName: z.string(),
    modelId: z.string(),
    // apiKey resolved via same cascade: modelConfigs[modelId].apiKey → provider.apiKey → THROW
  }).optional(),
  // ... rest unchanged ...
});
```
Both additions are **additive optional fields** — existing JSON blobs remain valid, no Prisma migration needed. Rebuild `packages/openapi` before any backend task that imports the changed types: `yarn workspace @teable/openapi build`.

---

### `packages/openapi/src/admin/setting/get-public.ts` — audit `simpleLLMProviderSchema` for key leakage

**Analog:** self (audit in-place, lines 9–14)

**Current schema** (lines 9–14):
```typescript
export const simpleLLMProviderSchema = llmProviderSchema.pick({
  type: true,
  name: true,
  models: true,
  isInstance: true,
  modelConfigs: true,  // ← RISK: modelConfigs now may contain apiKey after GW-05
});
```
**Required fix:** After adding `apiKey` to `modelConfigSchema`, `modelConfigs` values will include it. The public schema must strip per-model `apiKey`. Pattern: use `.transform()` or create a `safeModelConfigSchema` that omits `apiKey`:
```typescript
// add safeModelConfigSchema that picks everything EXCEPT apiKey
const safeModelConfigSchema = modelConfigSchema.omit({ apiKey: true });
export const simpleLLMProviderSchema = llmProviderSchema
  .pick({ type: true, name: true, models: true, isInstance: true })
  .extend({ modelConfigs: z.record(z.string(), safeModelConfigSchema).optional() });
```
The existing `apiKey: z.string().optional()` on `llmProviderSchema` is already NOT picked by `simpleLLMProviderSchema` — so provider-level key is safe. Only the new per-model key needs scrubbing.

---

### `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` — replace `generateEmbeddings()` lines 598–631

**Analog:** `ai.service.ts` `getModelInstance` call pattern (lines 171–253)

**Code to DELETE** (lines 598–631 — the entire `generateEmbeddings` method body):
```typescript
// DELETE: direct fetch to api.openai.com with process.env.OPENAI_API_KEY
// This violates D-15-04 and D-15-03
async generateEmbeddings(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;  // ← D-15-04: REMOVE
  if (!key) throw new ServiceUnavailableException('OPENAI_API_KEY required for embeddings');
  // ... direct fetch ...
}
```

**Replacement pattern** — route through gateway:
```typescript
// New signature: requires spaceId to resolve embedding provider config
async generateEmbeddings(texts: string[], spaceId: string): Promise<number[][]> {
  const aiConfig = await this.aiService.getAIConfigBySpaceId(spaceId);  // or getAIConfig(baseId)
  if (!aiConfig.embeddingProvider) {
    throw new CustomHttpException(
      'No embedding provider configured. Set an embedding provider in AI settings.',
      HttpErrorCode.VALIDATION_ERROR,
      { localization: { i18nKey: 'httpErrors.ai.embeddingProviderNotSet' } }
    );
  }
  const embeddingModelKey = `${aiConfig.embeddingProvider.providerType}@${aiConfig.embeddingProvider.modelId}@${aiConfig.embeddingProvider.providerName}`;
  return this.aiService.embed(texts, embeddingModelKey, aiConfig.llmProviders);
}
```
All callers of `generateEmbeddings()` must be updated to pass `spaceId`. The doc-ingest worker already carries `spaceId` per AUDIT.md — thread it through the job payload to this call.

---

### `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — retrofit `generateText` import

**Analog:** existing `streamLlmIteration` at lines 300–390 — already uses `aiService.getModelInstance()` pattern correctly.

**Import to REMOVE** (line 3):
```typescript
import { generateText, stepCountIs, jsonSchema } from 'ai';  // ← remove generateText
```

**Retrofit target** (line ~317 — wherever `generateText` is called directly):
Replace:
```typescript
// BEFORE (direct generateText with model built inline):
const result = await generateText({ model: someDirectModel, ... });
```
With:
```typescript
// AFTER: use aiService.getModelInstance() then pass to generateText via gateway
// Pattern already used in streamLlmIteration (lines 325–328):
const modelInstance = await this.aiService.getModelInstance(
  resolvedModelKey,
  aiConfig.llmProviders
);
const result = await generateText({ model: modelInstance, ... });
// NOTE: keep `generateText` import from 'ai' — only `model` construction moves to gateway
```
The `generateText` import itself stays; only the model building (`createOpenAI(...)` etc.) moves inside the gateway. Check: after retrofit, `grep "@ai-sdk/" agent-execution.service.ts` must return zero hits.

---

### `apps/nestjs-backend/src/features/setting/open-api/setting-open-api.service.ts` — retrofit ~15 call sites

**Analog:** `ai.service.ts` `getModelInstance` pattern (lines 171–253)

**Imports to REMOVE** (lines 5–51):
```typescript
import type { OpenAIProvider } from '@ai-sdk/openai';       // ← REMOVE
import { createGateway, generateText, tool, generateImage } from 'ai';  // ← keep generateText/generateImage; remove createGateway
import { getAdaptedProviderOptions, modelProviders } from '../../ai/util';  // ← REMOVE (moves to gateway)
import { INSTANCE_PROVIDER_NAME } from '../../ai/ai.service';  // ← keep if still needed; else remove
```

**Pattern for each of the ~15 call sites** (three groups):

Group A — text generation call sites:
```typescript
// BEFORE (direct createGateway + generateText inline):
const gatewayProvider = createGateway({ apiKey, baseURL });
const model = gatewayProvider(modelId);
const result = await generateText({ model, messages, ... });

// AFTER (route through gateway service):
const modelInstance = await this.aiService.getModelInstance(modelKey, llmProviders);
const result = await generateText({ model: modelInstance, messages, ... });
```

Group B — image generation call sites:
```typescript
// BEFORE:
const gatewayProvider = createGateway({ apiKey, baseURL });
const model = gatewayProvider.imageModel(modelId);
const result = await generateImage({ model, ... });

// AFTER:
const modelInstance = await this.aiService.getModelInstance(modelKey, llmProviders, true);
const result = await generateImage({ model: modelInstance, ... });
```

Group C — API key test / model resolution (lines ~37, 253):
These already build a model instance to test connectivity. Route through `aiService.getModelInstance()` then pass the instance to the test probe. Keep the test logic; remove the inline factory construction.

**AI_SERVICE injection** — this service does NOT currently inject `AiService` via `AI_SERVICE` token. Add:
```typescript
import { AI_SERVICE } from '../../../shared/tokens/ai.token';
import { AiService } from '../../ai/ai.service';  // value import, NOT `import type`

// In constructor:
@Inject(AI_SERVICE) private readonly aiService: AiService,
```

---

### `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/LlmProviderForm.tsx` — extend for GW-03 + GW-05 UI

**Analog:** self (extend in-place, lines 1–60 establish the pattern)

**Imports pattern** (lines 1–51 — already correct for existing form):
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { llmProviderSchema, LLMProviderType } from '@teable/openapi';
import { useForm } from 'react-hook-form';
import { toast } from '@teable/ui-lib/shadcn/ui/sonner';
```

**GW-03 Ollama "Install Ollama →" link pattern** — add next to baseUrl input for Ollama type:
```tsx
{providerType === LLMProviderType.OLLAMA && (
  <a
    href="https://ollama.com/download"
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-blue-500 hover:underline"
  >
    {t('settings.ai.installOllama')} →
  </a>
)}
```
Pattern: copy from existing external-link anchors in the same file (search for `target="_blank"` in `LlmProviderForm.tsx`).

**GW-05 per-model key override UI pattern** — inline in the model row:
- Each model row shows badge "Using provider default key" or "Override set"
- "Override" button → small inline form (key input + save)
- On save: PATCH the model's `modelConfigs[modelId].apiKey` via the existing settings update endpoint
- Use `useForm` + `zodResolver` for the inline form, same as the outer provider form
- The form value shape: `{ apiKey: string }` — validated against `modelConfigSchema.pick({ apiKey: true })`

**GW-04 embedding provider picker pattern** — add a new section below existing chat model pickers:
- Filter model list to embedding-capable models (where `modelType === 'embedding'` or from gateway modality flags)
- Reuse existing `<Select>` pattern from other model pickers in the file
- On change: update `aiConfig.embeddingProvider` via existing settings update API

---

### `scripts/check-no-direct-ai-sdk.sh` — phase-exit CI guard (D-15-06)

**Analog:** no existing analog in codebase (first shell CI script of this type).

**Pattern** (new file — use RESEARCH.md's D-15-06 exit criterion verbatim):
```bash
#!/usr/bin/env bash
set -e
RESULT=$(grep -r "@ai-sdk/\|createOpenAI\|generateText" \
  apps/nestjs-backend/src \
  --include="*.ts" \
  --exclude="*spec*" \
  --exclude-dir="ai" \
  -l)
if [ -n "$RESULT" ]; then
  echo "FAIL: Direct AI SDK imports found outside features/ai/:"
  echo "$RESULT"
  exit 1
fi
echo "OK: All AI SDK usage is inside features/ai/"
```

---

## Shared Patterns

### Error Handling — `CustomHttpException`
**Source:** `apps/nestjs-backend/src/custom.exception.ts` lines 7–19
**Apply to:** All new service code (resolveApiKey, embed, getEmbeddingModelInstance, generateEmbeddings retrofit)
```typescript
throw new CustomHttpException(
  '<message naming the missing key/provider/model>',
  HttpErrorCode.VALIDATION_ERROR,
  {
    localization: {
      i18nKey: 'httpErrors.ai.<specific-key>',
      context: { model: modelKey },  // always include model/provider name so error is actionable
    },
  }
);
```
Anti-pattern: Never use `ServiceUnavailableException` for config-missing cases (that's the old pattern being removed). Use `CustomHttpException` with `HttpErrorCode.VALIDATION_ERROR`.

### DI Token Injection — `AI_SERVICE`
**Source:** `apps/nestjs-backend/src/shared/tokens/ai.token.ts` line 10
**Apply to:** `setting-open-api.service.ts` (missing injection today); any new consumer of `AiService`
```typescript
// Token definition:
export const AI_SERVICE = Symbol('AiService');

// Consumer pattern (value import, NOT import type):
import { AiService } from '../../ai/ai.service';
import { AI_SERVICE } from '../../shared/tokens/ai.token';

// In @Injectable() constructor:
@Inject(AI_SERVICE) private readonly aiService: AiService,
```

### Model Key Format
**Source:** `apps/nestjs-backend/src/features/ai/ai.service.ts` lines 84–86
**Apply to:** All code that constructs or parses model keys
```typescript
// Format: `{type}@{model}@{name}`
// e.g. "openai@gpt-4o@my-provider" or "aiGateway@anthropic/claude-sonnet-4@teable"
public parseModelKey(modelKey: string) {
  const [type, model, name] = modelKey.split('@');
  return { type, model, name };
}
```

### Provider Factory Lookup
**Source:** `apps/nestjs-backend/src/features/ai/util.ts` lines 113–133 + `ai.service.ts` lines 225–248
**Apply to:** `getEmbeddingModelInstance()` (new), any new code that builds a provider instance
```typescript
const provider = Object.entries(modelProviders).find(
  ([key]) => type.toLowerCase() === key.toLowerCase()
)?.[1];
if (!provider) {
  throw new CustomHttpException(`Unsupported AI provider: ${type}`, HttpErrorCode.VALIDATION_ERROR, ...);
}
const providerOptions = getAdaptedProviderOptions(type as LLMProviderType, { name: model, baseURL: baseUrl!, apiKey: apiKey! });
const modelProvider = provider(providerOptions as never) as OpenAIProvider;
```

### Key Stripping in Public Schema
**Source:** `packages/openapi/src/admin/setting/get-public.ts` lines 9–14
**Apply to:** After GW-05 adds `modelConfigs[].apiKey`, the public schema must omit it
```typescript
export const simpleLLMProviderSchema = llmProviderSchema.pick({
  type: true, name: true, models: true, isInstance: true,
  // modelConfigs: true  ← replace with safe version that omits apiKey
}).extend({
  modelConfigs: z.record(z.string(), modelConfigSchema.omit({ apiKey: true })).optional(),
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/check-no-direct-ai-sdk.sh` | utility/CI | batch | No existing CI shell scripts of this type in the repo |

---

## Metadata

**Analog search scope:** `apps/nestjs-backend/src/features/ai/`, `apps/nestjs-backend/src/features/agent/`, `apps/nestjs-backend/src/features/setting/open-api/`, `packages/openapi/src/admin/setting/`, `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/`
**Files scanned:** 8 source files read directly
**Key finding:** Phase 15 is all retrofits + small extensions — no file is greenfield. Every new code block has a direct line-number analog in the codebase.
**Pattern extraction date:** 2026-06-07
