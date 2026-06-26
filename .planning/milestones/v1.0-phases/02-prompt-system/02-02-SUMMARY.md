---
phase: 02-prompt-system
plan: "02"
subsystem: api
tags: [nestjs, ai, prompts, refactor]

# Dependency graph
requires:
  - 02-01 (PromptService + PROMPT_KEY from prompt.service.ts)
provides:
  - AiService with all inline system prompts replaced by PromptService.get() calls
  - DB-overridable prompts for all 6 AI generation methods
affects: [ai-service, prompt-admin-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AiService injects PromptService via NestJS DI constructor injection"
    - "All system prompts loaded via await this.promptService.get(PROMPT_KEY.X, modelKey)"
    - "Dynamic runtime data (schemaJson, tableList) concatenated at call site after prompt load"

key-files:
  created: []
  modified:
    - apps/nestjs-backend/src/features/ai/ai.service.ts
    - apps/nestjs-backend/src/features/ai/prompt.service.ts

key-decisions:
  - "generateBuildStream had a 6th inline French system prompt not in the plan — added PROMPT_KEY.BUILD_SCHEMA to satisfy zero-inline-strings acceptance criteria"
  - "Dynamic schemaJson and tableList remain concatenated at call site (not in PromptService defaults) so DB overrides only control static preamble"
  - "generateBuildStream has no modelKey param so promptService.get called with undefined modelKey (falls through to hardcoded default)"

requirements-completed: [PROMPT-03]

# Metrics
duration: 10min
completed: 2026-05-11
---

# Phase 02 Plan 02: PromptService Integration into AiService Summary

**PromptService injected into AiService constructor; all 6 inline French system prompt strings replaced with await this.promptService.get(PROMPT_KEY.X, modelKey) calls**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11T00:10:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Imported `PromptService` and `PROMPT_KEY` from `./prompt.service` at top of ai.service.ts
- Added `private readonly promptService: PromptService` to AiService constructor
- Replaced all 5 plan-specified inline system prompts in the 5 target methods
- Found and replaced a 6th inline system prompt in `generateBuildStream` (deviation)
- Added `PROMPT_KEY.BUILD_SCHEMA` to prompt.service.ts with its default string
- Dynamic data (schemaJson, tableList) preserved as call-site concatenation

## Task Commits

1. **Task 1: Inject PromptService and replace all inline system prompts** — `53dfe19` (feat)

## Files Created/Modified

- `apps/nestjs-backend/src/features/ai/ai.service.ts` — PromptService injected; 6 `promptService.get()` calls replacing inline strings
- `apps/nestjs-backend/src/features/ai/prompt.service.ts` — Added `BUILD_SCHEMA` key and default prompt string

## Decisions Made

- Dynamic runtime data (schemaJson suffix for app generation, tableList suffix for workflow) stays concatenated at the call site in ai.service.ts rather than being part of the DB-overridable prompt content — this is by design so DB overrides only need to manage static instructions
- `generateBuildStream` (JSON-schema output method) had no `modelKey` parameter, so `promptService.get(PROMPT_KEY.BUILD_SCHEMA)` is called with `undefined` modelKey — falls through to hardcoded default correctly
- The plan expected exactly 5 `promptService.get` calls; a 6th was added for the undiscovered `generateBuildStream` method (see Deviations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added BUILD_SCHEMA prompt key for generateBuildStream**

- **Found during:** Task 1 — acceptance criteria check for `Tu es un expert en modélisation` returning 0 failed
- **Issue:** `generateBuildStream` (line 432) had a hardcoded French system prompt not identified in the plan. The plan's acceptance criteria required 0 occurrences of all French inline strings.
- **Fix:** Added `PROMPT_KEY.BUILD_SCHEMA` constant + default string to `prompt.service.ts`; replaced inline string in `generateBuildStream` with `await this.promptService.get(PROMPT_KEY.BUILD_SCHEMA)`
- **Files modified:** `prompt.service.ts`, `ai.service.ts`
- **Commit:** `53dfe19`

## Known Stubs

None — all prompt calls resolve to real defaults or DB overrides.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. Prompt content flows from admin-controlled DB rows or hardcoded defaults only; no user input reaches the system parameter (T-02-04 mitigation satisfied).

## Self-Check: PASSED

- `apps/nestjs-backend/src/features/ai/ai.service.ts` — FOUND
- `apps/nestjs-backend/src/features/ai/prompt.service.ts` — FOUND
- Commit `53dfe19` — FOUND
- `grep -c "promptService.get" ai.service.ts` = 6 (5 plan targets + 1 deviation)
- `grep -c "Tu es un" ai.service.ts` = 0
- No TypeScript errors in modified files

---
*Phase: 02-prompt-system*
*Completed: 2026-05-11*
