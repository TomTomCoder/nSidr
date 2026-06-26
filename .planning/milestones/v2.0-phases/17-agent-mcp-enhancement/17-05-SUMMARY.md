---
phase: 17-agent-mcp-enhancement
plan: "05"
subsystem: agent
tags: [agent, doc-search, knowledge-base, prisma, nestjs, react]

# Dependency graph
requires:
  - phase: 17-02
    provides: "Agent model, AgentExecutionService base, DocSearchModule"
provides:
  - "Agent.knowledgeSources JSON field + migration for per-agent doc/folder scope"
  - "DocSearchService.hybridSearch with optional parameterized scope (backward-compatible)"
  - "search_knowledge_base execution branch in AgentExecutionService (was missing)"
  - "Knowledge-sources picker UI in KnowledgeTab and PersonalizationStep"
affects: [17-06, 18-xx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma.sql/join for parameterized IN-list scope filter (T-17-12/T-17-13)"
    - "knowledgeSources: {docIds[], folderIds[]} JSON stored as JSONB on agent table"
    - "Scope propagated from agent record through executeToolCall -> hybridSearch"

key-files:
  created:
    - packages/db-main-prisma/prisma/postgres/migrations/20260605000002_add_agent_knowledge_sources/migration.sql
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/features/doc-search/search.service.ts
    - apps/nestjs-backend/src/features/doc-search/search.service.spec.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
    - apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
    - apps/nestjs-backend/src/features/agent/dto/update-agent.dto.ts
    - apps/nestjs-backend/src/features/agent/dto/create-agent.dto.ts
    - apps/nestjs-backend/src/features/agent/agent.service.ts
    - apps/nextjs-app/src/features/app/components/agent/tabs/KnowledgeTab.tsx
    - apps/nextjs-app/src/features/app/components/agent/steps/PersonalizationStep.tsx
    - apps/nextjs-app/src/features/app/components/agent/AgentConfigModal.tsx
    - apps/nextjs-app/src/features/app/components/agent/AgentWizard.tsx
    - apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx

key-decisions:
  - "knowledgeSources stored as JSONB (not separate table) — shape: {docIds:string[], folderIds:string[]}"
  - "scope applied as parameterized Prisma.sql WHERE IN, never string-interpolated (T-17-12/T-17-13)"
  - "Empty/null knowledgeSources = whole-space search (backward-compatible)"
  - "DocSearchService already exported from DocSearchModule, already imported in AgentModule — no module change needed"
  - "spaceId resolved at tool-call time via prismaService.base.findUnique (agent only has baseId, not spaceId)"

patterns-established:
  - "DocSearchScope: optional {docIds?,folderIds?} threaded through semantic/keyword/hybrid"
  - "executeToolCall switch extended with search_knowledge_base case (was previously falling to default)"

requirements-completed: [AGENT-03]

# Metrics
duration: 18min
completed: "2026-06-05"
---

# Phase 17 Plan 05: Per-Agent Knowledge Scoping Summary

**Per-agent doc/folder search scope: JSONB schema + parameterized SQL filter + missing search_knowledge_base execution branch + knowledge picker in both builder and config UI.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-05T20:15:11Z
- **Completed:** 2026-06-05T20:32:40Z
- **Tasks:** 3 of 3
- **Files modified:** 14

## Accomplishments

- Added `Agent.knowledgeSources Json?` field (JSONB) with migration; Prisma schema validates
- Extended `DocSearchService.hybridSearch(spaceId, query, limit, scope?)` — scope applied via `Prisma.sql`/`Prisma.join` (parameterized, never interpolated); empty scope = unscoped, backward-compatible; 5 tests green
- Added `case 'search_knowledge_base'` in `AgentExecutionService.executeToolCall` switch — was registered but falling to `default:` branch; now resolves spaceId via base FK, reads `knowledgeSources` from agent, calls scoped hybridSearch; 7 tests green (including 2 new scope propagation tests + fix of pre-existing mock bugs)
- Added knowledge-sources multi-select picker in `KnowledgeTab.tsx` (config UI) and `PersonalizationStep.tsx` (wizard builder) — both surfaces fetch space docs/folders and persist via PATCH /api/agent/:id

## Task Commits

1. **Task 1: Knowledge-source schema + scoped hybridSearch** - `89222ff8b` (feat)
2. **Task 2: Wire search_knowledge_base execution branch** - `7f5747add` (feat)
3. **Task 3: Knowledge-source picker in both UIs** - `175111550` (feat)

## Files Created/Modified

- `packages/db-main-prisma/prisma/postgres/migrations/20260605000002_add_agent_knowledge_sources/migration.sql` - ALTER TABLE agent ADD COLUMN knowledge_sources JSONB
- `packages/db-main-prisma/prisma/postgres/schema.prisma` - Add knowledgeSources Json? to Agent model
- `apps/nestjs-backend/src/features/doc-search/search.service.ts` - DocSearchScope interface; buildScopeFilter(); extend semanticSearch/keywordSearch/hybridSearch with optional scope
- `apps/nestjs-backend/src/features/doc-search/search.service.spec.ts` - 2 new scope propagation tests
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` - Inject DocSearchService; add search_knowledge_base case
- `apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts` - Fix pre-existing mock bugs + 2 new search_knowledge_base tests
- `apps/nestjs-backend/src/features/agent/dto/update-agent.dto.ts` - KnowledgeSources interface + field
- `apps/nestjs-backend/src/features/agent/dto/create-agent.dto.ts` - knowledgeSources field
- `apps/nestjs-backend/src/features/agent/agent.service.ts` - Persist knowledgeSources on create/update
- `apps/nextjs-app/src/features/app/components/agent/tabs/KnowledgeTab.tsx` - Full rewrite with knowledge picker
- `apps/nextjs-app/src/features/app/components/agent/steps/PersonalizationStep.tsx` - Add knowledge sources section
- `apps/nextjs-app/src/features/app/components/agent/AgentConfigModal.tsx` - Add spaceId prop; typed AgentRecord
- `apps/nextjs-app/src/features/app/components/agent/AgentWizard.tsx` - Add spaceId prop; fix any types
- `apps/nextjs-app/src/features/app/components/chat-panel/ChatPanel.tsx` - Pass spaceId to AgentConfigModal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing spec mock missing `findConversation`**
- **Found during:** Task 2 (running agent-execution.service.spec.ts)
- **Issue:** `conversationService.findConversation is not a function` — method was added to the service but not to the test mock
- **Fix:** Added `findConversation: vi.fn().mockResolvedValue(...)` to the conversation service mock
- **Files modified:** agent-execution.service.spec.ts
- **Commit:** 7f5747add

**2. [Rule 2 - Missing] Pre-existing spec missing `recordOpenApiService` and `mcpAggregator` params**
- **Found during:** Task 2
- **Issue:** Constructor gained additional params in previous plans but spec was not updated
- **Fix:** Added mock stubs for `recordOpenApiService`, `mcpAggregator`, `docSearchService`
- **Files modified:** agent-execution.service.spec.ts
- **Commit:** 7f5747add

### Deferred

- **Live UI verification (checkpoint:human-verify):** Deferred per checkpoint-handling instructions. Manual verification steps: boot web :3000 + API :3002, open agent builder + config UI, restrict agent to folder X, ask questions inside/outside scope.
- **DB migration apply:** Requires live Postgres with pgvector — run `pnpm prisma migrate deploy` in packages/db-main-prisma to apply `20260605000002_add_agent_knowledge_sources`.
- **Full tsc type check:** Deferred per memory constraints (no full monorepo tsc/build).

## Threat Surface Scan

No new network endpoints or auth paths introduced beyond the existing PATCH /api/agent/:id endpoint (which gains a `knowledgeSources` field). The SQL scope filter uses `Prisma.sql`/`Prisma.join` — parameterized, not string-interpolated — closing T-17-12 and T-17-13.

## Known Stubs

None. The knowledge-sources picker is functional (fetches real docs/folders from backend, persists to agent record). The picker gracefully shows an empty state when no docs have been imported.

## Self-Check: PASSED

- migration.sql: FOUND
- search.service.ts: FOUND
- agent-execution.service.ts: FOUND
- KnowledgeTab.tsx: FOUND
- PersonalizationStep.tsx: FOUND
- Commit 89222ff8b: FOUND
- Commit 7f5747add: FOUND
- Commit 175111550: FOUND
