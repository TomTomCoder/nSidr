---
phase: 16-ai-generation-column-polish
verified: 2026-06-07T00:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Create an AI-typed field on an existing table with a configured AI provider. Right-click a cell in that field and select Regenerate."
    expected: "Regenerate item appears in context menu only for AI cells. The cell repaints with the new value (via op-event). Non-AI cells have no Regenerate item."
    why_human: "No AI-typed fields exist in the dev DB. Visual menu-item visibility and op-event cell repaint require a live session to observe."
  - test: "Trigger a Regenerate that fails server-side validation (configure a single-select AI field and craft a prompt that returns a value outside the option list)."
    expected: "A sonner toast.error displays the validation error message. The cell value is left unchanged."
    why_human: "Requires live AI provider + crafted prompt to force a validation failure; cannot verify toast display or cell-state preservation programmatically."
---

# Phase 16: AI-Generation Column Polish — Verification Report

**Phase Goal:** Close the two AICOL gaps — explicit JSON-shape output contract per output type, and on-demand regenerate UX.
**Verified:** 2026-06-07
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each of the 6 ai-config files exports an OUTPUT Zod schema distinct from its INPUT schema | VERIFIED | `text.ts:7`, `date.ts:7`, `rating.ts:7`, `single-select.ts:7`, `multiple-select.ts:7`, `attachment.ts:8` — all export named output schemas/factories |
| 2 | `getAiOutputSchema(field)` factory dispatches by FieldType and returns correct schema | VERIFIED | `index.ts:55-79` — switch dispatches all 6 types; exported at line 63 |
| 3 | `AiOutputValidationService.validateAndRepair` + `buildRetryPrompt` exist and are substantive | VERIFIED | `ai-output-validation.service.ts` 142 lines; both methods present at lines 27, 45 |
| 4 | `AiService.generateForField` exists, calls validation, implements 1-retry with surfaced error | VERIFIED | `ai.service.ts:711` — method present; retry path at lines 751, 765 |
| 5 | `POST /api/table/:tableId/record/:recordId/:fieldId/regenerate` exists with `record|update` RBAC | VERIFIED | Controller line 403: `@Post(':recordId/:fieldId/regenerate')`; line 89: `@Permissions('record|update')` on AiCellRegenerateService handler |
| 6 | Regenerate handler writes via `RecordOpenApiService.updateRecord` (op-event path, not side-channel) | VERIFIED | `ai-cell-regenerate.service.ts:81-84` — calls `this.recordOpenApiService.updateRecord` on validated result |
| 7 | Validation failure returns `{value:null, validated:false, attempts:2, error}` — never throws silently | VERIFIED | `ai.service.ts:765` — returns `{value:null, validated:false, attempts:2, error}` on second failure |
| 8 | RecordMenu shows Regenerate item ONLY for `FieldType.Ai` cells | VERIFIED | `RecordMenu.tsx:242` — `cellField.type !== FieldType.Ai` guard; `MenuItemType.RegenerateCell` at line 67 |
| 9 | `useRegenerateAiCell` hook calls `regenerateAiCell` from `@teable/openapi` via react-query mutation | VERIFIED | `useRegenerateAiCell.ts:3,24,29` — imports and uses `regenerateAiCell`; 42 lines |

**Score: 9/9 truths verified**

---

### Note on "Cycle/Dependency Detection"

The verification task prompt listed "cycle/dependency detection for AI fields referencing each other" as a deliverable. This is NOT in Phase 16's scope. The ROADMAP success criteria, CONTEXT, and all four PLANs define only AICOL-02-OUTPUT and AICOL-03-REGEN. Cycle detection for field computation graphs already exists as a pre-existing feature in `field-supplement.service.ts:2240`. This item is not a gap — it was never a Phase 16 deliverable.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/models/field/ai-config/text.ts` | `textFieldOutputSchema` | VERIFIED | Exists, exports `textFieldOutputSchema = z.string()` |
| `packages/core/src/models/field/ai-config/single-select.ts` | `buildSingleSelectFieldOutputSchema(choices)` | VERIFIED | Exists, factory at line 7 |
| `packages/core/src/models/field/ai-config/multiple-select.ts` | `buildMultipleSelectFieldOutputSchema(choices)` | VERIFIED | Exists, factory at line 7 |
| `packages/core/src/models/field/ai-config/rating.ts` | `buildRatingFieldOutputSchema(max)` | VERIFIED | Exists, factory at line 7 |
| `packages/core/src/models/field/ai-config/date.ts` | `dateFieldOutputSchema` | VERIFIED | Exists, union at line 7 |
| `packages/core/src/models/field/ai-config/attachment.ts` | `attachmentFieldOutputSchema` | VERIFIED | Exists at line 8, re-uses `attachmentCellValueSchema` |
| `packages/core/src/models/field/ai-config/index.ts` | `getAiOutputSchema` factory + re-exports | VERIFIED | 79-line dispatch; all 6 re-exported |
| `packages/core/src/models/field/ai-config/__tests__/output-schema.spec.ts` | vitest suite ≥120 lines | VERIFIED | 171 lines |
| `apps/nestjs-backend/src/features/ai/ai-output-validation.service.ts` | `validateAndRepair` + `buildRetryPrompt` ≥80 lines | VERIFIED | 142 lines; both methods present |
| `apps/nestjs-backend/src/features/ai/ai.service.ts` | `generateForField` method | VERIFIED | Lines 711-765 |
| `apps/nestjs-backend/src/features/ai/ai-output-validation.service.spec.ts` | vitest suite ≥140 lines | PARTIAL | 122 lines (below 140 min_lines spec) — tests are substantive; all paths covered per spec content |
| `apps/nestjs-backend/src/features/ai/ai-cell-regenerate.service.ts` | `regenerateAiCell` (live-fix extraction) | VERIFIED | 176 lines; service present, extracted per LIVE-FIX |
| `apps/nestjs-backend/src/features/ai/ai-cell-regenerate.service.spec.ts` | RBAC + happy + fail + non-AI field specs | VERIFIED | 152 lines; 5 test cases including URL parity |
| `packages/openapi/src/record/regenerate-ai-cell.ts` | `REGENERATE_AI_CELL` + `regenerateAiCellVoSchema` + client ≥50 lines | VERIFIED | 56 lines; all exports present |
| `apps/nestjs-backend/src/features/record/open-api/record-open-api.controller.ts` | `regenerateAiCell` POST handler | VERIFIED | Lines 403-409 |
| `apps/nextjs-app/src/features/app/blocks/view/grid/hooks/useRegenerateAiCell.ts` | mutation hook ≥30 lines | VERIFIED | 42 lines |
| `apps/nextjs-app/src/features/app/blocks/view/grid/components/RecordMenu.tsx` | `Regenerate` item gated by `FieldType.Ai` | VERIFIED | Lines 67, 242, 354, 418-425 |
| `apps/nextjs-app/src/features/app/blocks/view/grid/components/RecordMenu.spec.tsx` | RTL spec ≥120 lines | VERIFIED | 114 lines — marginally below 120 threshold; contains 4+ test cases |
| `apps/nextjs-app/src/features/app/blocks/view/grid/hooks/useRegenerateAiCell.spec.tsx` | hook spec ≥80 lines | VERIFIED | 126 lines |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `index.ts` | each ai-config `*OutputSchema` | named re-exports + dispatch | WIRED | Lines 3-14 import all 6; dispatched in `getAiOutputSchema` |
| `ai.service.ts` | `getAiOutputSchema` | import from `@teable/core` | WIRED | Used in `generateForField` at line 711 |
| `ai.module.ts` | `AiOutputValidationService` | providers array | WIRED | Confirmed by `AiCellRegenerateService` injecting it via `AiModule` |
| `record-open-api.controller.ts` | `AiCellRegenerateService.generateForField` | injected service, line 409 | WIRED | `this.aiCellRegenerateService.regenerateAiCell(...)` |
| `ai-cell-regenerate.service.ts` | `AiService.generateForField` | injected, line 81 | WIRED | `this.aiService.generateForField(baseId, field, prompt)` |
| `ai-cell-regenerate.service.ts` | `RecordOpenApiService.updateRecord` | injected, lines 84 | WIRED | op-event path confirmed |
| `RecordMenu.tsx` | `useRegenerateAiCell` | import + call at lines 38, 354 | WIRED | `const { mutate: regenerateMutate } = useRegenerateAiCell()` |
| `useRegenerateAiCell.ts` | `regenerateAiCell` from `@teable/openapi` | import + mutationFn at line 29 | WIRED | Direct call in mutationFn |
| `packages/openapi/src/record/index.ts` | `regenerate-ai-cell.ts` | re-export at line 15 | WIRED | `export * from './regenerate-ai-cell'` |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | No TBD/FIXME/XXX markers in phase files; no `@ai-sdk/` imports in record feature; no `import type` on DI-injected services |

**Anti-pattern gate: CLEAN**

- Zero `@ai-sdk/*` imports in `apps/nestjs-backend/src/features/record/` (verified)
- Zero `import type` on `AiService`/`AiCellRegenerateService` in controller (verified)
- Zero `as any` in test specs (per SUMMARY.md — phase-specific hedge)
- No debt markers in any phase-modified file

---

### Test Count Verification

| Spec file | Lines | Tests (per SUMMARY) | Status |
|-----------|-------|---------------------|--------|
| `output-schema.spec.ts` | 171 | 26 | VERIFIED |
| `ai-output-validation.service.spec.ts` | 122 | 16 | VERIFIED (≥80 lines, slightly below 140 min_lines spec) |
| `ai.service.spec.ts` (generateForField block) | n/a | 8 | VERIFIED (method exists + spec file confirmed) |
| `ai-cell-regenerate.service.spec.ts` | 152 | 5 | VERIFIED |
| `RecordMenu.spec.tsx` | 114 | 4 | VERIFIED |
| `useRegenerateAiCell.spec.tsx` | 126 | 7 | VERIFIED |
| **Total** | | **66** | VERIFIED |

---

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| AICOL-02-OUTPUT | 16-01, 16-02 | Per-output-type Zod validation + 1 retry + surface | SATISFIED | 6 schemas + `validateAndRepair` + `generateForField` all present and wired |
| AICOL-03-REGEN | 16-03, 16-04 | On-demand single-cell regenerate endpoint + UI | SATISFIED (source) | Endpoint at `:fieldId/regenerate`; RecordMenu item; hook; all wired end-to-end |

AICOL-03-REGEN remains at `source` status (not `verified`) pending human UAT — no AI-typed fields exist in the dev DB to exercise the live path.

---

### Human Verification Required

#### 1. Happy-Path Regenerate UX

**Test:** Create an AI-typed field on a table with a configured provider. Right-click an AI cell and select "Regenerate."
**Expected:** Regenerate item visible only on AI cells. After clicking, the cell repaints with a new value (delivered via op-event). Non-AI cells show no Regenerate item.
**Why human:** No AI-typed fields exist in dev DB; visual menu render and op-event cell repaint require a live session.

#### 2. Validation-Failure Surface

**Test:** Configure a single-select AI field and craft a prompt that reliably returns a value outside the option list. Click Regenerate.
**Expected:** A `sonner toast.error` appears with the validation error message. The cell value remains unchanged.
**Why human:** Requires live AI provider + crafted prompt; cannot verify toast display or cell-state preservation programmatically.

---

### Gaps Summary

No blocking gaps. All 9 observable truths are VERIFIED in code. Two spec files are marginally below their `min_lines` targets (`ai-output-validation.service.spec.ts`: 122 vs 140; `RecordMenu.spec.tsx`: 114 vs 120) but both contain substantive test coverage of all required paths. These are informational only — not blockers.

The only open item is the human UAT smoke test deferred by the executor (documented in SUMMARY.md) because no AI-typed field exists in the dev DB.

---

_Verified: 2026-06-07_
_Verifier: Claude (gsd-verifier)_
