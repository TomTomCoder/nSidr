---
phase: 02-prompt-system
plan: "01"
subsystem: api
tags: [prisma, nestjs, ai, prompts, postgres]

# Dependency graph
requires: []
provides:
  - AiPromptOverride Prisma model and ai_prompt_override DB table
  - PromptService with 5 default prompt keys (table.create, app.generate, workflow.build, import.analyze, chat.system)
  - PromptService registered in AiModule (injectable by AiService)
affects: [ai-service, prompt-admin-api, chat-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PromptService.get(key, modelId) 3-tier lookup: model-specific DB > global DB > hardcoded default"
    - "PROMPT_KEY const enum + PromptKey type for type-safe prompt key references"
    - "PROMPT_DEFAULTS map with exact prompt strings as fallback"

key-files:
  created:
    - apps/nestjs-backend/src/features/ai/prompt.service.ts
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/features/ai/ai.module.ts

key-decisions:
  - "modelPattern uses prefix match (startsWith) not exact match, allowing 'gpt-4' to match 'gpt-4-turbo'"
  - "PROMPT_DEFAULTS hardcoded in service file (not separate config) for simplicity and single source of truth"
  - "PromptService exported from AiModule so future admin API can inject it without circular deps"

patterns-established:
  - "Prompt override lookup: model-specific row > global row (null modelPattern) > hardcoded default"
  - "All default prompts in PROMPT_DEFAULTS constant at top of prompt.service.ts"

requirements-completed: [PROMPT-01, PROMPT-02]

# Metrics
duration: 15min
completed: 2026-05-11
---

# Phase 02 Plan 01: Prompt System Foundation Summary

**AiPromptOverride Prisma model pushed to DB + PromptService with 5 hardcoded defaults and model-aware DB override lookup registered in AiModule**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11T00:15:00Z
- **Tasks:** 3 (Task 2 is DB-only, no file commit)
- **Files modified:** 3

## Accomplishments
- AiPromptOverride model added to Prisma schema with promptKey, modelPattern, content, isActive fields and pushed to PostgreSQL
- PromptService created with PROMPT_KEY enum, PROMPT_DEFAULTS map (5 full prompt strings extracted from ai.service.ts), and 3-tier DB override lookup
- PromptService registered in AiModule providers and exports, ready for injection by AiService or admin API

## Task Commits

1. **Task 1: Add AiPromptOverride model to Prisma schema** - `95cbd2c` (feat)
2. **Task 2: Push schema to database** - no commit (DB operation only)
3. **Task 3: Create PromptService + update AiModule** - `2ce85ed` (feat)

## Files Created/Modified
- `packages/db-main-prisma/prisma/postgres/schema.prisma` - Added AiPromptOverride model (@@map "ai_prompt_override")
- `apps/nestjs-backend/src/features/ai/prompt.service.ts` - New: PromptService with PROMPT_KEY, PROMPT_DEFAULTS, get() method
- `apps/nestjs-backend/src/features/ai/ai.module.ts` - Added PromptService to providers and exports

## Decisions Made
- modelPattern uses prefix match (`startsWith`) not exact match — allows `gpt-4` to match `gpt-4-turbo`, `gpt-4o`, etc.
- PROMPT_DEFAULTS hardcoded inline in the service file (not a separate JSON/config) for simple single-file ownership
- PromptService added to AiModule exports so future admin API plan can inject it without circular dependency issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree has no node_modules — prisma generate/db push run using the main repo's prisma binary with explicit --schema path
- `prisma db push` auto-generate step failed (worktree node_modules missing) but the DB sync itself completed successfully ("Your database is now in sync with your Prisma schema")

## User Setup Required

None - no external service configuration required. Database was pushed automatically.

## Next Phase Readiness
- PromptService is injectable — next plan (02-02) can replace hardcoded system prompts in ai.service.ts with `await this.promptService.get(PROMPT_KEY.X, modelId)` calls
- Admin API plan (02-03) can inject PromptService to expose CRUD endpoints for prompt overrides
- No blockers

---
*Phase: 02-prompt-system*
*Completed: 2026-05-11*
