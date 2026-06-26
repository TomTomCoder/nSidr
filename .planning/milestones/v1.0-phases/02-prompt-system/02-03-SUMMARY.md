---
phase: 02-prompt-system
plan: "03"
subsystem: api+ui
tags: [nestjs, nextjs, ai, prompts, admin, react-query]

# Dependency graph
requires:
  - 02-01 (AiPromptOverride Prisma model + PromptService)
  - 02-02 (PromptService injected into AiService)
provides:
  - REST API: GET/PUT/DELETE /api/admin/ai/prompts with instance|read/update guards
  - PromptOverridesPanel React component for admin UI
  - AISettingPage updated to render PromptOverridesPanel
affects: [admin-settings, ai-service, prompt-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PromptController: NestJS controller with @Permissions decorator for admin-only access"
    - "PromptOverridesPanel: useQuery + useMutation with queryClient.invalidateQueries on save/reset"
    - "Badge variant=secondary for overridden, variant=outline for default"

key-files:
  created:
    - apps/nestjs-backend/src/features/ai/prompt.controller.ts
    - apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/PromptOverridesPanel.tsx
  modified:
    - apps/nestjs-backend/src/features/ai/ai.module.ts
    - apps/nextjs-app/src/features/app/blocks/admin/setting/AISettingPage.tsx

key-decisions:
  - "GET endpoint returns all 6 keys (including BUILD_SCHEMA added in 02-02 deviation) not 5 as originally planned"
  - "modelPattern defaults to null in PUT so global override is stored when not specified"
  - "PROMPT_KEY_LABELS includes build.schema key to cover the extra key from plan 02-02"

requirements-completed: [PROMPT-04, PROMPT-05]

# Metrics
duration: 15min
completed: 2026-05-11
---

# Phase 02 Plan 03: Prompt Admin API + UI Summary

**PromptController REST API (GET/PUT/DELETE /api/admin/ai/prompts) + PromptOverridesPanel React component wired into the Admin AI Settings page**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11T00:15:00Z
- **Tasks:** 2 auto + 1 checkpoint (human-verify)
- **Files modified:** 4

## Accomplishments

- PromptController created with GET (list all prompts with defaults+overrides), PUT (upsert global override), DELETE (remove override) all behind `@Permissions` guards
- PromptController registered in AiModule controllers array
- PromptOverridesPanel renders all 6 prompt keys in a bordered list with Overridden/Default badges, Edit button (opens monospace dialog), and Reset to default button (DELETE endpoint)
- AISettingPage updated to import and render PromptOverridesPanel below AIConfigFormWizard

## Task Commits

1. **Task 1: PromptController + ai.module.ts update** — `24733b2` (feat)
2. **Task 2: PromptOverridesPanel + AISettingPage update** — `3603dc8` (feat)
3. **Task 3: Human verify admin UI** — APPROVED (2026-05-12)

## Files Created/Modified

- `apps/nestjs-backend/src/features/ai/prompt.controller.ts` — New: GET/PUT/DELETE endpoints at /api/admin/ai/prompts
- `apps/nestjs-backend/src/features/ai/ai.module.ts` — Added PromptController to controllers array
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/PromptOverridesPanel.tsx` — New: React component for prompt CRUD UI
- `apps/nextjs-app/src/features/app/blocks/admin/setting/AISettingPage.tsx` — Added PromptOverridesPanel render below AIConfigFormWizard

## Decisions Made

- GET lists all 6 prompt keys (plan said 5, but 02-02 added BUILD_SCHEMA as a deviation — PROMPT_KEY_LABELS updated to include it)
- modelPattern defaults to null in PUT so global (non-model-specific) override is stored when caller omits it
- PROMPT_KEY_LABELS map covers all 6 keys to avoid showing raw key strings in the UI

## Deviations from Plan

**1. [Rule 2 - Missing] Added build.schema to PROMPT_KEY_LABELS**

- **Found during:** Task 2 — PROMPT_KEY.BUILD_SCHEMA was added in 02-02 as a deviation; the panel labels map in the plan only covered 5 keys
- **Fix:** Added `'build.schema': 'Build Schema'` entry to PROMPT_KEY_LABELS in PromptOverridesPanel.tsx
- **Files modified:** PromptOverridesPanel.tsx
- **Commit:** 3603dc8

## Known Stubs

None — GET calls real DB, PUT/DELETE write to real DB. Panel renders live data.

## Threat Surface Scan

New endpoints introduced:
| Flag | File | Description |
|------|------|-------------|
| threat_flag: admin-api | prompt.controller.ts | GET/PUT/DELETE /api/admin/ai/prompts — new admin REST surface. Mitigated by @Permissions('instance|read') and @Permissions('instance|update') on all handlers (T-02-06 mitigated). |

## Self-Check: PASSED

- `apps/nestjs-backend/src/features/ai/prompt.controller.ts` — FOUND
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/PromptOverridesPanel.tsx` — FOUND
- Commit `24733b2` — FOUND
- Commit `3603dc8` — FOUND
- `grep "PromptController" ai.module.ts` = 2 matches (import + controllers array)
- `grep "PromptOverridesPanel" AISettingPage.tsx` = 2 matches (import + JSX render)

## Human Verification

**Checkpoint:** human-verify admin UI
**Result:** APPROVED
**Date:** 2026-05-12
**Notes:** User confirmed PromptOverridesPanel renders correctly in admin AI settings page.

---
*Phase: 02-prompt-system*
*Completed: 2026-05-12*
*Verification: APPROVED*
