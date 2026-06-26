# Phase 16: AI-Generation Column Polish — Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Mode:** Interactive — 3 decisions captured

<domain>
Close the 2 AICOL gaps left after the baseline audit. AICOL-01 is already
satisfied (`FieldType.Ai`, per-output-type `ai-config/*.ts` Zod input schemas,
backend generation in `field-supplement.service`). This phase ships:
- **AICOL-02-OUTPUT:** every AI response is validated against an output-typology
  Zod schema before write; mismatches retry once then surface error (no silent
  string-stuffing into typed cells).
- **AICOL-03-REGEN:** user right-clicks an AI cell → "Regenerate" → single-cell
  re-generation through the Phase 15 gateway (no full-column re-run).
</domain>

<phase_boundary>
**In scope**
- Per-output-type **output Zod schema** in `packages/core/src/models/field/ai-config/*.ts`
  (single-select must match configured options; rating must be int 1-N; date must
  parse as ISO/timestamp; attachment metadata; multi-select must be array of valid
  options; text passes through)
- Server-side validation + 1 retry with strengthened prompt in
  `field-supplement.service.ts` (or sibling AI-gen service if it exists)
- Cell-level error state for unrecoverable validation failures (icon + tooltip)
- New `POST /api/table/:tableId/field/:fieldId/record/:recordId/regenerate` endpoint
- Cell context menu "Regenerate" item visible only on AI cells
- Backend handler routes through `AiService` gateway (NO new direct provider SDK imports)
- vitest for each output type's validator (5 types × 2 cases = 10+ tests)
- vitest for the single-cell regenerate endpoint (RBAC + happy + error paths)

**Out of scope**
- Bulk regenerate (field-header dropdown) — deferred to a follow-up phase
- Streaming generation UX (token-by-token cell paint) — future
- Cost/usage UI per regenerate — future "AI Ops" phase
- The gateway retrofit of OTHER callers (Phase 15's D-15-06 — only this phase's
  new handler uses the gateway; the rest of P15-D-15-06 scope is unchanged)
- Refactor of the existing column-wide auto-fill pipeline (that's the "what
  already works" baseline — touch ONLY where needed for validation)
</phase_boundary>

<decisions>

### D-16-01: AICOL-02-OUTPUT — Zod-validate + 1 retry + surface
**Strategy:** Per-output-type output schema (distinct from existing INPUT schemas).
- `text` → `z.string()` (already valid)
- `single-select` → `z.enum([...configured options])`
- `multiple-select` → `z.array(z.enum([...configured options]))`
- `rating` → `z.number().int().min(1).max(max)`
- `date` → `z.string().datetime()` or epoch-ms `z.number().int()`
- `attachment` → existing attachment-meta schema (FK to attachment service)

**Flow:**
1. Call gateway with prompt + (Phase 15 D-15-04 ready) embedding-or-chat per type
2. Parse the raw response. Try Zod parse.
3. On fail: retry ONCE with augmented prompt `"Previous output failed validation:
   ${zodErrorMsg}. Output must match the schema exactly. Example valid output: ${example}."`
4. On second fail: store cell as `{ error: "validation_failed", attempts: 2,
   lastError: "..." }` in a sidecar column or null the value + raise a notification
   pattern aligned with how other field errors are surfaced today (planner to verify
   in `field-supplement.service`).

**Implementation note for planner:** use Vercel AI SDK's `generateObject({schema, ...})`
when the configured provider supports structured output — this constrains the LLM at
sampling time and avoids the retry entirely on supporting providers. Fall back to
`generateText` + post-validation for unsupported providers. This is the BEST of both
worlds — see `apps/nestjs-backend/src/features/ai/ai.service.ts` for the gateway
methods (createGateway from `ai` package).

### D-16-02: AICOL-03-REGEN — cell context menu, single cell, gateway-routed
**UI:** add "Regenerate" to the AI-cell context menu. Visible only when
`field.type === FieldType.Ai`. Click → fire mutation → optimistic spinner
overlay on the cell → result paints in.

**Backend:** new endpoint `POST /api/table/:tableId/field/:fieldId/record/:recordId/regenerate`
- RBAC: same as cell edit (`record|update`)
- Handler: read field's AI config, gather source field values for the row, build
  prompt the same way the bulk pipeline does, call `AiService.generate*` (gateway),
  validate per D-16-01, write result via existing record-update path (NOT a side
  channel — must trigger the same op-event so collaborators see the update).
- Response: `{ value, validated: true|false, attempts: 1|2, error?: string }`

**Frontend mutation:** new react-query hook `useRegenerateAiCell(tableId, fieldId, recordId)`.

### D-16-03: Routing — through Phase 15 gateway
The new handler calls `AiService` (the existing gateway entry, `ai.service.ts:28`
`createGateway`). NO direct `@ai-sdk/openai` or similar imports in the new handler.
This pre-emptively satisfies one row of Phase 15's D-15-06 retrofit gate.

**Anti-pattern to avoid:** copying `generateText({model: openai('gpt-4'), ...})`
from anywhere. Always go through the gateway service.

### Claude's discretion (planner picks)
- Exact file location of the new endpoint controller (existing
  `field-supplement.controller` if it exists, or new `ai-generation.controller`)
- Whether to introduce a small `OutputValidator` class or keep validation inline
- Cell error UI: a corner icon + tooltip, or a banner-style notification
- Whether `generateObject` (structured) vs `generateText` (raw + retry) is per-call
  or per-provider configured
- Streaming or non-streaming for single-cell regen (recommend non-streaming for v1)

</decisions>

<canonical_refs>

### Phase / milestone
- `.planning/ROADMAP.md` — Phase 16 entry (restored 2026-06-06)
- `.planning/REQUIREMENTS.md` — AICOL-02-OUTPUT, AICOL-03-REGEN

### Existing AI-column code (read before changing)
- `packages/core/src/models/field/derivate/ai.field.ts` — FieldType.Ai derivation
- `packages/core/src/models/field/ai-config/` — INPUT Zod schemas (existing). The new OUTPUT schemas live HERE, distinct exports per file.
- `apps/nestjs-backend/src/features/field/field-supplement.service.ts` — where `getAiConfigSchema(type)` lives + bulk AI generation pipeline
- `apps/nestjs-backend/src/features/ai/ai.service.ts` — gateway entry (use it; don't bypass)
- `apps/nestjs-backend/src/features/ai/unified-ai.service.ts` — also uses gateway (reference)

### Existing cell context menu (extend, don't replace)
- `apps/nextjs-app/src/features/app/components/field-setting/dialog/AiAutoFillDialog.tsx` — existing AI dialog (reference for column-wide pattern)
- planner to find the grid cell context-menu implementation and add a new menu item gated by `field.type === FieldType.Ai`

### Reference docs (Vercel AI SDK)
- Context7: `mcp__plugin_context7_context7__query-docs` — `generateObject` API, `experimental_output: 'json'`, provider support matrix for structured output

### Phase dependencies
- Phase 15 (gateway) — the gateway code exists but Phase 15 isn't formally "shipped"; this phase's regen handler is gateway-routed regardless (D-16-03)
- Phase 17.1 anti-patterns logged in `17.1-SUMMARY.md` — mock-shape drift, import-type-on-DI — apply here too

</canonical_refs>

<code_context>

### Reusable assets
- `createGateway` from `ai` package (used in `ai.service.ts`) — single entry for all AI calls
- Existing per-output-type `ai-config/*.ts` Zod input schemas — model the new OUTPUT schemas alongside them in the SAME file (1 export per file)
- Record-update flow with op-events — for the regenerate write path (find it via `RecordOpenApiService` or similar)

### Established patterns
- Zod-discriminated unions per field type (e.g., `singleSelectFieldAIConfigSchema` is a discriminated union of `classify | customize`)
- Service methods return validated DTOs; throw `CustomHttpException` on validation failure
- React-query hooks colocated with the component that uses them

### Anti-patterns to avoid (Phase 17 + 17.1 lessons)
- ❌ `import type` for any DI-injected service (bug-1)
- ❌ Mock shape that diverges from real return shape — bind mocks to constructors
  if possible, copy real fixtures otherwise (17.1 mock-shape drift trap)
- ❌ Silent fallback on validation failure — surface every error (Phase 17 D-15-04 spirit)
- ❌ Direct `@ai-sdk/*` import outside `apps/nestjs-backend/src/features/ai/` — D-16-03
- ❌ New side-channel record-write paths that skip op-events — collaborators must see the update

</code_context>

<deferred_ideas>
- Bulk regenerate (field-header dropdown — "Regenerate visible" / "Regenerate selected")
- Streaming generation (token-by-token cell paint)
- Per-regenerate cost/usage in cell tooltip
- AI-cell version history (prior generations as audit log)
- "Why did this answer happen?" introspection (prompt + tool calls log)
</deferred_ideas>

---
_Created: 2026-06-06_
_2 features, 3 decisions, ~4 commits expected_
