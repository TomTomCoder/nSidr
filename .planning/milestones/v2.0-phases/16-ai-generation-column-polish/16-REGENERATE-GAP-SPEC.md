# Phase 16 — regenerate happy-path: full root-cause + implementation spec

_2026-06-13. Investigated live with a real Gemini key. The regenerate **500 bug is fixed**
(commit `56ad13648`: `createFieldInstanceByVo`). What remains is a **feature-sized,
multi-layer gap** that must NOT be shipped blind — it touches the v2 domain + persistence
and there is no runnable test suite in this environment (sqlite arch). This spec makes it
immediately actionable._

## What works now (verified live)
- Phase 15 gateway: `test-llm` → `{"success":true}` against Gemini 2.5-flash.
- Regenerate endpoint no longer 500s; returns clean typed responses (400 for non-Ai fields).
- A typed field (`singleLineText`) **+ `aiConfig`** can be created via API.

## Why the end-to-end regenerate still can't run

The Regenerate menu + endpoint target **`FieldType.Ai`** only
(`RecordMenu.tsx:242`, `ai-cell-regenerate.service.ts:63`). Creating such a field is blocked,
and even if created, the config model doesn't line up. Three concrete layers:

### Gap 1 — `FieldType.Ai` is unimplemented in the v2 domain
`type:'ai'` is rejected by the create schema, and `convertField` throws
`Pattern matching error: no pattern matches value {type:ai}`
(`field-open-api-v2.service.ts` → `TableFieldSpecs.parseTableFieldSpec`).
Root cause: **there is no `CreateAiFieldSpec`, no Ai field aggregate, and no Ai case in the
`DefaultTableMapper` / `TableFieldSpecs` `.exhaustive()` matches** anywhere in
`packages/v2/core`. 22 other `CreateXFieldSpec` classes exist; AI was never ported.
→ Requires implementing a whole field type in v2: spec class, aggregate + value objects
(prompt, sourceFieldIds, modelKey), persistence mapper (cellValueType/dbFieldType — AI output
is text-like), and wiring into both exhaustive matches.

### Gap 2 — config-storage mismatch (aiConfig vs options)
- `FieldType.Ai` stores config in **`options`** (`ai.field.ts` `IAiFieldOptions =
  { prompt?, sourceFieldIds? }`); the frontend editor `AiFieldOptions.tsx` edits `options`.
- But `AiCellRegenerateService.buildAiPromptForCell` reads **`field.aiConfig`**
  (`{ type: <action>, prompt | sourceFieldId, modelKey }`).
- `getAiConfigSchema('ai')` returns `z.undefined()` → an `ai` field can't even carry
  `aiConfig`; and `options` has **no `modelKey`**, so no model can be resolved.
→ Even a successfully-created `FieldType.Ai` field would fail regenerate with
  "has no aiConfig". Must pick ONE model and make it consistent across `ai.field.ts`,
  `field.schema` (`getAiConfigSchema`), the frontend `AiFieldOptions`, and the regenerate
  service. Cleanest: extend `IAiFieldOptions` with `modelKey` + action `type`, and change
  regenerate to read `field.options` (drop the `aiConfig` dependency for `FieldType.Ai`).

### Gap 3 — model selection
`generateForField` needs a `modelKey` (e.g. `google@gemini-2.5-flash@Gemini`). It isn't in
`IAiFieldOptions`; resolve via Gap 2.

## Recommended sequence (needs the v2 unit/e2e suite, which can't run here)
1. v2: add `CreateAiFieldSpec` + aggregate + mapper + both match cases (mirror
   `CreateSingleLineTextFieldSpec`, text-like cellValueType). Unit-test field create/convert.
2. core/openapi: extend `IAiFieldOptions` with `modelKey` + action `type`; align
   `getAiConfigSchema`/output-schema.
3. backend: point `buildAiPromptForCell` + `generateForField` at `field.options`.
4. frontend: `AiFieldOptions` — add a model picker bound to `options.modelKey`.
5. Live UAT with the configured Gemini provider (already set on the QA space).

## Why not done here
Implementing a new v2 domain field type + reworking the config model across 4 layers, with
**no runnable test suite** (sqlite3 arm64/x86_64 mismatch) and in a branch carrying ~270
pre-existing v2 errors, would be an unverifiable, high-blast-radius change to the persistence
layer. Best practice: land it behind the v2 test suite, not blind.
