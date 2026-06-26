# Cross-Phase Integration Check
**Date:** 2026-05-19
**Scope:** Phases 1–4 (executed) + Phase 7 (executed) + Phases 5–6 (planned, not executed)

---

## Executive Summary

| Phase | Name | Status | Coherence |
|-------|------|--------|-----------|
| 1 | Authority Matrix | Complete | COHERENT — AuthorityMatrixModule registered in app.module.ts |
| 2 | Prompt System | Complete | COHERENT — PromptService exported from AiModule, consumed by Phase 4 |
| 3 | DB & Code Performance | Complete | COHERENT — no new modules; query/index optimisations only |
| 4 | Super Agent System | Complete (Wave 4) | **BROKEN — AgentModule NOT registered in app.module.ts** |
| 5 | Gantt View | Planned | Not executed — no code to check |
| 6 | Google & Slack Integrations | Planned | Not executed — no code to check |
| 7 | Doc Import & Vector Search | Executed | **BROKEN — doc-search feature directory missing from filesystem** |

---

## Phase-by-Phase Findings

### Phase 1 — Authority Matrix (COHERENT)

- `AuthorityMatrixModule` is imported in `apps/nestjs-backend/src/app.module.ts` line 15/108.
- No cross-phase export consumers identified as missing.

### Phase 2 — Prompt System (COHERENT)

- `PromptService` is declared in `AiModule` (providers + exports, `ai.module.ts` lines 15–16).
- `AiModule` is imported by `AgentModule` (`agent.module.ts` line 18), which gives `AgentService` and `AgentExecutionService` access to `PromptService`.
- `AgentService.upsertPrompt()` calls `promptService.upsertOverride(...)` — wired correctly.
- `AgentExecutionService` calls `promptService.get(...)` with a dynamic key `agent:${agentId}.system` cast as `any` (line 66). This bypasses the `PromptKey` type union — functional but type-unsafe.
- `AiModule` is also registered directly in `app.module.ts` line 106.

**Issue P2-1 (minor):** `agent-execution.service.ts:66` — `promptService.get()` is called with a dynamic string cast to `any`, bypassing the `PromptKey` type union. The method signature is `get(key: PromptKey, ...)` but agent keys are of the form `agent:<id>.system` which are not in `PROMPT_KEY`. The DB lookup in `get()` works because it does a string match, but TypeScript will not catch typos in these dynamic keys.

### Phase 3 — DB & Code Performance (COHERENT)

- This phase made no new module registrations — only query/index and code optimisations.
- `AiPromptOverride` model exists in schema.prisma (line 974) and is used correctly by `PromptService`.
- No integration gaps found.

### Phase 4 — Super Agent System (BROKEN — CRITICAL)

#### ISSUE P4-1 (CRITICAL): AgentModule not registered in app.module.ts

- `AgentModule` exists at `apps/nestjs-backend/src/features/agent/agent.module.ts` and is fully self-contained.
- `apps/nestjs-backend/src/app.module.ts` does **not** import `AgentModule`.
- Result: The entire agent feature — all controllers and services — is dead code at runtime. No `/api/agent/*` routes are registered. No BullMQ cron queue is started.
- **Fix:** Add `import { AgentModule } from './features/agent/agent.module';` and include `AgentModule` in the `appModules.imports` array in `app.module.ts`.

#### ISSUE P4-2 (CRITICAL): 5 Prisma models referenced in code but absent from schema.prisma

The following Prisma models are called via `this.prismaService.<model>.*` but **do not exist** in `packages/db-main-prisma/prisma/postgres/schema.prisma`:

| Prisma model | Referenced in file |
|---|---|
| `prismaService.agent` | `agent.service.ts`, `agent-oauth.service.ts` |
| `prismaService.agentTool` | `agent.controller.ts:130`, `agent-tool-registry.service.ts:142` |
| `prismaService.agentMemory` | `agent-memory.service.ts` (8 calls) |
| `prismaService.agentTrigger` | `agent-trigger.service.ts:16`, `agent-scheduler.service.ts:45` |
| `prismaService.agentConnection` | `agent-oauth.service.ts:97`, `agent-oauth.service.ts:115` |

The Phase 4 plan (04-01-PLAN.md) stated these 5 models would be added to schema.prisma. The commit `4e08c51` message says "feat(04-01): add 5 Agent Prisma models to schema" — but the models are not present in the schema file on disk. The schema only has `AiPromptOverride` (line 974) from Phase 2.

- **Fix:** Apply the 5 model definitions from plan 04-01 to `packages/db-main-prisma/prisma/postgres/schema.prisma` and re-run `prisma generate`.

#### ISSUE P4-3 (CRITICAL): OpenAPI types imported from wrong path

- `agent.controller.ts:16` imports `{ ICreateAgent, IUpdateAgent }` from `@teable/openapi`.
- These types exist in `packages/openapi/src/ai/agent.ts` — but they are **not** re-exported from the package's barrel (`packages/openapi/src/index.ts` needs to include them).
- If the barrel does not export them, the import resolves to `undefined` at compile time and TypeScript will error.
- Verify: `grep -r "ICreateAgent\|IUpdateAgent" packages/openapi/src/index.ts`.

#### ISSUE P4-4 (minor): Route ordering conflict in AgentController

- `@Get('oauth/:provider')` (line 159) and `@Get('oauth/callback')` (line 178) — NestJS matches routes top-to-bottom. `oauth/:provider` will capture `oauth/callback` before the dedicated callback handler fires.
- **Fix:** Reorder: place `@Get('oauth/callback')` before `@Get('oauth/:provider')`, or rename the callback route (e.g. `oauth/cb`).

#### ISSUE P4-5 (minor): maxIterations field

- `agent-execution.service.ts:77` reads `agent.maxIterations` — this field must exist on the `Agent` Prisma model. Confirm it is included in the schema definition when P4-2 is fixed.

### Phase 7 — Doc Import & Vector Search (BROKEN — CRITICAL)

#### ISSUE P7-1 (CRITICAL): doc-search feature directory does not exist

- The git status shows `apps/nestjs-backend/src/features/doc-search/` as **untracked** — meaning the files exist on disk but were never committed.
- However, `ls` of the features directory shows **no `doc-search` entry** — the directory is absent from the filesystem in the working tree.
- Commits `b5497a7`, `f6d1915` reference doc-search files. These may be in a git worktree (`agent-a*`) that was not merged to main.
- The modified files in git status (`doc-ingest.controller.ts`, `doc-search.controller.ts`, etc.) are listed as **modified in worktree** — they live in a detached worktree, not in the main branch checkout.
- **Fix:** Identify which worktree contains the doc-search implementation and merge or cherry-pick those commits into the main branch. Run `git worktree list` and `git log --oneline --all | grep doc-search` to locate them.

#### ISSUE P7-2: No DocSearchModule registration in app.module.ts

- Even if P7-1 is resolved by merging the worktree, `DocSearchModule` is not listed in `app.module.ts`. Registration must be added alongside the merge.

---

## Cross-Phase Dependency Map

```
Phase 2 (PromptService)
    └─→ Phase 4 AgentService.upsertPrompt()          [WIRED — via AiModule import]
    └─→ Phase 4 AgentExecutionService.run()           [WIRED — but type-unsafe P2-1]

Phase 4 (AgentModule)
    └─→ app.module.ts                                 [NOT WIRED — P4-1 CRITICAL]
    └─→ schema.prisma (5 Agent models)                [NOT WIRED — P4-2 CRITICAL]
    └─→ @teable/openapi (ICreateAgent, IUpdateAgent)  [NEEDS VERIFICATION — P4-3]

Phase 7 (DocSearchModule)
    └─→ app.module.ts                                 [NOT WIRED — P7-2 CRITICAL]
    └─→ schema.prisma (DocDocument, DocChunk, etc.)   [NOT VERIFIED — worktree issue P7-1]
    └─→ filesystem                                    [MISSING — P7-1 CRITICAL]
```

---

## API Surface

| Route | Controller | Registered | Notes |
|---|---|---|---|
| `POST /api/agent` | AgentController | NO | AgentModule not in app.module |
| `GET /api/agent` | AgentController | NO | AgentModule not in app.module |
| `POST /api/agent/:id/run` | AgentController | NO | AgentModule not in app.module |
| `GET /api/agent/oauth/:provider` | AgentController | NO | Also has route order bug P4-4 |
| `GET /api/agent/oauth/callback` | AgentController | NO | Route shadowed by above P4-4 |
| `GET /api/agent/:id/connections` | AgentController | NO | AgentModule not in app.module |
| `GET /api/doc-search/*` | DocSearchController | NO | Worktree not merged P7-1 |

---

## Prioritised Fix List

| Priority | Issue | Action | File |
|---|---|---|---|
| P0 | P4-2 | Add 5 Agent models to schema.prisma + prisma generate | `packages/db-main-prisma/prisma/postgres/schema.prisma` |
| P0 | P7-1 | Locate doc-search worktree and merge to main | git worktree / main branch |
| P0 | P4-1 | Register AgentModule in app.module.ts | `apps/nestjs-backend/src/app.module.ts` |
| P0 | P7-2 | Register DocSearchModule in app.module.ts | `apps/nestjs-backend/src/app.module.ts` |
| P1 | P4-3 | Verify ICreateAgent/IUpdateAgent exported from openapi barrel | `packages/openapi/src/index.ts` |
| P1 | P4-4 | Fix route order: callback before :provider | `agent.controller.ts` lines 159/178 |
| P2 | P2-1 | Type-safe agent prompt key lookup | `agent-execution.service.ts:66` |

---

## Requirements Integration Map

| Requirement | Integration Path | Status | Issue |
|---|---|---|---|
| Phase 2: PromptService 3-tier lookup | AiModule export → AgentModule import → AgentExecutionService.run() | WIRED | P2-1 type cast |
| Phase 4: Agent CRUD API | AgentController → app.module.ts | UNWIRED | P4-1: module not registered |
| Phase 4: Agent Prisma models | Code → schema.prisma → PrismaClient | UNWIRED | P4-2: 5 models absent from schema |
| Phase 4: BullMQ cron scheduling | AgentSchedulerService → AGENT_CRON_QUEUE | UNWIRED | P4-1: module not registered |
| Phase 4: OAuth token storage | AgentOAuthService → AgentConnection model | UNWIRED | P4-2: model absent |
| Phase 4: Agent streaming run | AgentController POST :id/run → AgentExecutionService | UNWIRED | P4-1 + route order P4-4 |
| Phase 7: Doc ingestion pipeline | DocIngestController → app.module.ts | UNWIRED | P7-1: worktree not merged |
| Phase 7: Vector search API | DocSearchController → app.module.ts | UNWIRED | P7-1 + P7-2 |

**Requirements with no cross-phase wiring (self-contained):**
- Phase 3 (DB/Code performance) — query optimisations, no exported interfaces consumed by other phases.
- Phase 1 (Authority Matrix) — self-contained module, no other phase depends on its exports.
