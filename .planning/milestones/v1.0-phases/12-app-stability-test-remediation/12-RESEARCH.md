# Phase 12: App Stability & Test Remediation - Research

**Researched:** 2026-05-31
**Domain:** NestJS/Next.js full-stack — Vitest unit specs, Playwright E2E, NestJS event emitter, doc-search frontend integration
**Confidence:** HIGH (all findings verified from codebase + planning files)

## Summary

Phase 12 has four work streams: (1) complete Phase 11 gap closure (11-04/05/06), (2) fix Phase 7 doc search frontend, (3) execute 90-test progressive UI testing passes, and (4) produce a final TESTING-PLAN.md status update.

**Critical discovery:** 11-04 (DM trigger) was already executed — `POST :id/message` and `EventEmitter2.emit('agent.dm')` are present in `agent.controller.ts` as of commit `bbb916bac`. No SUMMARY.md exists for 11-04. Plans 11-05 (regression tests) and 11-06 (record tools) remain unexecuted. The doc-search frontend is further along than the Phase 7 summary suggests — the sidebar link, keyboard shortcut hook, and Zustand store are wired; `DocSearchPanel` and `DocImportPanel` are rendered inside `DocLibrary` (accessible via `/space/[spaceId]/doc-library`). The global `DocSearchPanel` modal trigger via `Cmd+Shift+K` is wired in `AppProviders.tsx` via `useDocSearchKeyboardShortcut`, but the panel itself is not yet mounted in `AppProviders` — clicking the shortcut would open the store state without rendering a panel in layout.

**Primary recommendation:** Start with a 11-04 SUMMARY.md acknowledgment (no code needed), then execute 11-05 (regression tests) and 11-06 (record tools), audit+fix the doc-search frontend render gap, then run progressive browser passes against all 90 TESTING-PLAN.md cases.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DM trigger endpoint | API / Backend | — | NestJS controller emits internal event; no frontend involvement |
| Vitest regression specs | API / Backend | — | Unit tests are backend-only (agent-*.spec.ts) |
| Record tool field mapping | API / Backend | Database / Storage | Replace raw SQL with RecordOpenApiService field→column model |
| Doc search global modal | Frontend Server (Next.js) | Browser / Client | Panel must be mounted in layout; store state is client-side |
| Doc library page | Browser / Client | Frontend Server | Page exists at `/space/[spaceId]/doc-library`, layout wired |
| Progressive UI testing | Browser / Client | — | Playwright drives browser; fixes land in both tiers as needed |

---

## Wave 1: Phase 11 Gap Closure — What to Know

### 11-04 Status: ALREADY EXECUTED (needs SUMMARY only)

- `POST :id/message` is present in `agent.controller.ts` [VERIFIED: codebase grep]
- `EventEmitter2.emit('agent.dm', payload)` fires with `{ agentId, message, fromUserId, conversationId }` [VERIFIED: codebase grep]
- `EventEmitter2` is injected in the constructor [VERIFIED: codebase grep]
- The human-verify checkpoint in 11-04 was satisfied as part of commit `bbb916bac` (fix: permission guard, tool schema, missing file issues) [VERIFIED: git log]
- **Action for Phase 12 plan 12-01:** Create 11-04-SUMMARY.md acknowledging completion; no new code needed

### 11-05: Vitest Regression Tests — NOT WRITTEN

**Test framework:** Vitest [VERIFIED: `apps/nestjs-backend/vitest.config.ts` exists]

**Run command:** `pnpm --filter @teable/nestjs-backend test-unit` (vitest run) [VERIFIED: 11-05-PLAN.md]

**Reference spec style** (from 11-05-PLAN.md):
- Import from `'vitest'`: `describe`, `it`, `expect`, `vi`, `beforeEach`
- Reference: `apps/nestjs-backend/src/features/v2/v2-action-trigger.service.spec.ts`
- No Nest TestingModule required — construct services directly with stubs
- `vi.mock` for PrismaService; `vi.fn()` for individual methods

**Four spec files to create:**
1. `agent-trigger.service.spec.ts` — createTrigger/list/toggle/delete CRUD + handleRecordCreated/Updated
2. `agent-event.listener.spec.ts` — `record.created` / `record.updated` → trigger service projection
3. `agent.controller.spec.ts` — `agentWebhook` with correct secret (200-equiv) vs wrong secret (UnauthorizedException)
4. `agent-execution.service.spec.ts` — `run()` async generator with mocked AiService + mocked AgentConversationService

**Key interface details** (from 11-05-PLAN.md):
- `AgentExecutionService.run(ctx)`: async generator; mock `AiService.getModelInstance` to return stub yielding `{ text: 'final', steps: [] }`
- `AgentConversationService`: mock `createConversation`, `getConversationHistory`, `saveMessage`, `markConversationComplete`
- `AgentController.agentWebhook`: looks up active webhook trigger, checks `X-Agent-Secret` header, throws `UnauthorizedException('Invalid webhook secret')` on mismatch

### 11-06: Record Tools — Raw SQL Present, Needs Replacement

**Current state:** `AgentExecutionService.executeToolCall` uses `$queryRawUnsafe` for `search_records` (line ~332), and more at lines ~347, ~374, ~400 [VERIFIED: codebase grep]

**Target:** Replace with `RecordOpenApiService` or equivalent that resolves field IDs → column names [ASSUMED — need to verify which record service is canonical]

**Scope:** Optional/stretch; minimum viable is `create_record` only. The plan explicitly says "do not expand the phase" if the canonical service cannot be cleanly injected.

---

## Wave 2: Phase 7 Doc Search Frontend — Actual State vs. Summary

**What Phase 7 summary said was missing:**
1. Cmd+Shift+K keyboard shortcut → **WIRED** — `useDocSearchKeyboardShortcut` is called in `AppProviders.tsx` [VERIFIED: codebase grep]
2. Sidebar navigation item → **WIRED** — `SpaceInnerSideBar.tsx` has a `doc-library` entry linking to `/space/[spaceId]/doc-library` [VERIFIED: codebase grep]
3. App layout integration → **PARTIAL** — `DocLibrary` page exists at `/space/[spaceId]/doc-library.tsx` with proper layout; `DocSearchPanel` is rendered inside `DocLibrary` for inline search; but no global modal mounting in AppProviders for the Cmd+Shift+K trigger

**Remaining gap for doc-search frontend:**
- `useDocSearchStore` has `isOpen` state; `useDocSearchKeyboardShortcut` toggles it; but `DocSearchPanel` is never conditionally rendered at the layout level keyed to `isOpen` [VERIFIED: AppProviders.tsx does not render DocSearchPanel]
- The linting issues (jsx-a11y, Tailwind order) from the Phase 7 summary appear largely resolved — existing components already have `role="button"`, `tabIndex`, `onKeyDown` handlers [VERIFIED: codebase grep on DocSearchPanel.tsx and DocImportPanel.tsx]

**API endpoints available** (from Phase 7 backend):
- `POST /api/doc-search/ingest/markdown` → returns `{ jobId }`
- `POST /api/doc-search/ingest/pdf` → returns `{ jobId }`
- `GET /api/doc-search/search?q=...&mode=semantic|keyword|hybrid&spaceId=...`
- `GET /api/doc-search/docs` — list all docs
- `GET /api/doc-search/docs/:id` — single doc with content
- `DELETE /api/doc-search/docs/:id`
- `GET /api/doc-search/docs/:id/links`

---

## Wave 3: Progressive UI Testing — Playwright Infrastructure

**Location:** `apps/nextjs-app/e2e/` [VERIFIED: codebase ls]

**Config:** `apps/nextjs-app/playwright.config.ts` — port from `PLAYWRIGHT_PORT` env var (default 3000) [VERIFIED]

**Auth fixture:** `e2e/fixtures/auth.ts` — saves storageState to `.auth.json`; defaults to `test@e2e.com` / `12345678`; connects to `http://localhost:3001` [VERIFIED]

**testBase fixture:** `e2e/fixtures/testBase.ts` — creates a throwaway base for test isolation [VERIFIED: file exists]

**Existing spec files:**
- `e2e/full-sweep.spec.ts` — smoke (space, base, trash, admin, authority matrix) [VERIFIED]
- `e2e/agent-chat.spec.ts` [VERIFIED]
- `e2e/doc-library.spec.ts` [VERIFIED]
- `e2e/automations.spec.ts` [VERIFIED]
- `e2e/pages/features/` — grid-view, form-view, gallery-view, gantt-view, kanban-view, calendar-view, authority-matrix, integrations [VERIFIED]

**No existing specs for:** Unified AI Chat (Phase 10), Prompt System admin panel, Super Agent wizard/triggers, share/API access

**Run command:** `cd apps/nextjs-app && E2E_WEBSERVER_MODE=NOT_SET pnpm playwright test` (app must be running separately) [VERIFIED: playwright.config.ts]

---

## Known Implementation Gaps per TESTING-PLAN.md

| Test Area | Gap | Status in TESTING-PLAN |
|-----------|-----|------------------------|
| 8.11 Agent DM trigger | `POST :id/message` | `[S]` — was stub; now IMPLEMENTED |
| 11 Doc Search | Frontend render unverified | `[ ]` |
| All 90 cases | Never browser-tested | `[ ]` |

---

## Architecture Patterns

### NestJS EventEmitter pattern (DM trigger reference)
```typescript
// Source: apps/nestjs-backend/src/features/agent/agent.controller.ts (verified in codebase)
// Already implemented for agent.dm:
this.eventEmitter.emit('agent.dm', {
  agentId: id,
  message: body.message,
  fromUserId: this.cls.get('user')?.id,
  conversationId: body.conversationId,
});
```

### Vitest spec pattern (from 11-05-PLAN.md)
```typescript
// Source: apps/nestjs-backend/src/features/v2/v2-action-trigger.service.spec.ts (reference)
import { describe, it, expect, vi, beforeEach } from 'vitest';
// No Nest TestingModule — construct service directly with stubbed deps:
const service = new AgentTriggerService(mockPrisma as unknown as PrismaService, ...);
```

### Doc search global panel mounting pattern
```typescript
// Missing: AppProviders.tsx or a layout-level component should conditionally render:
// <DocSearchPanel open={isOpen} spaceId={spaceId} onClose={closeDocSearch} onSelectResult={...} />
// Keyed to useDocSearchStore().isOpen
```

---

## Common Pitfalls

### Pitfall 1: Vitest async generator testing
**What goes wrong:** `AgentExecutionService.run()` is an async generator; calling it synchronously without iterating yields no assertions.
**How to avoid:** Collect events with `for await (const event of service.run(ctx)) { events.push(event); }` then assert on the collected array.

### Pitfall 2: Doc search `spaceId` required by panel
**What goes wrong:** `DocSearchPanel` and `DocImportPanel` both require `spaceId` prop; mounting at layout level requires routing context.
**How to avoid:** Read `spaceId` from router in the layout component before mounting; skip render if `spaceId` is undefined (pages without a space context).

### Pitfall 3: Playwright port mismatch
**What goes wrong:** Auth fixture hardcodes `http://localhost:3001`; app runs on 3001 in dev.
**How to avoid:** Already fixed in 09-12 — use `PLAYWRIGHT_PORT` env or ensure dev server is on 3001 when running auth fixture. The playwright.config.ts defaults to 3000 for the webServer port, but the NestJS+Next.js stack runs on 3001. Confirm env alignment before running E2E.

### Pitfall 4: Missing 11-04 SUMMARY blocks ROADMAP progress
**What goes wrong:** ROADMAP.md still shows `[ ] 11-04-PLAN.md`; if a planning tool checks plan completion, it will try to re-execute 11-04.
**How to avoid:** Create `11-04-SUMMARY.md` as part of 12-01 before any other plans run.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Record create/update in agent tools | Custom `$queryRawUnsafe` JSON access | `RecordOpenApiService` or `RecordService.createRecords` (already used by other features) |
| Auth in Playwright tests | Custom login flow per test | Reuse `authFile` storageState from `e2e/fixtures/auth.ts` |
| Vitest mocking | Manual class stubs | `vi.mock()` + `vi.fn()` as used in reference spec |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (backend unit) + Playwright (E2E) |
| Vitest config | `apps/nestjs-backend/vitest.config.ts` |
| Quick unit run | `pnpm --filter @teable/nestjs-backend test-unit` |
| Playwright run | `cd apps/nextjs-app && pnpm playwright test` (requires running app) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command |
|-----|----------|-----------|---------|
| 11-05 | Trigger CRUD | unit | `pnpm --filter @teable/nestjs-backend test-unit agent-trigger.service.spec.ts` |
| 11-05 | Record projection listener | unit | `pnpm --filter @teable/nestjs-backend test-unit agent-event.listener.spec.ts` |
| 11-05 | Webhook auth 200/401 | unit | `pnpm --filter @teable/nestjs-backend test-unit agent.controller.spec.ts` |
| 11-05 | Execution loop happy path | unit | `pnpm --filter @teable/nestjs-backend test-unit agent-execution.service.spec.ts` |
| 12 UI | 90 TESTING-PLAN cases | E2E/manual | `pnpm playwright test` (fix bugs on failure) |

### Wave 0 Gaps
- [ ] `apps/nestjs-backend/src/features/agent/agent-trigger.service.spec.ts` — does not exist yet
- [ ] `apps/nestjs-backend/src/features/agent/agent-event.listener.spec.ts` — does not exist yet
- [ ] `apps/nestjs-backend/src/features/agent/agent.controller.spec.ts` — does not exist yet
- [ ] `apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts` — does not exist yet

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | All backend | ✓ (per project notes) | — | — |
| Redis | Sessions, BullMQ | ✓ (per project notes) | — | — |
| pgvector extension | Doc search | ✓ (installed in Phase 7) | — | — |
| OPENAI_API_KEY | Doc search embeddings | Unknown | — | Doc search tests skip embedding calls |
| AI model config (base) | Agent live run (11-04 human verify) | Operator-configured | — | Test graceful error path instead |

---

## Open Questions

1. **Is RecordOpenApiService injectable into AgentModule without circular dep?**
   - What we know: 11-06-PLAN.md says "locate the canonical RecordService/RecordOpenApiService; prefer reusing it over raw SQL"
   - What's unclear: Whether AgentModule already imports the record module or if a new module import is needed
   - Recommendation: Check `agent.module.ts` imports before writing 12-03-PLAN.md

2. **Does `useDocSearchKeyboardShortcut` render a panel or just toggle store state?**
   - What we know: The hook is called in AppProviders; `useDocSearchStore` has `isOpen`; but `DocSearchPanel` is not mounted at layout level
   - Recommendation: 12-04 must mount `DocSearchPanel` in AppProviders or a global layout component, reading `spaceId` from router

3. **What's the canonical way to get `spaceId` in AppProviders?**
   - What we know: Next.js router is available; `useRouter().query.spaceId` works on space pages
   - Recommendation: Mount the panel only when `spaceId` is in route; otherwise the keyboard shortcut is a no-op on non-space pages (acceptable)

---

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/nestjs-backend/src/features/agent/agent.controller.ts` — confirmed `POST :id/message` and `emit('agent.dm')` present
- Codebase: `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — confirmed `$queryRawUnsafe` at lines ~332, 347, 374, 400
- Codebase: `apps/nextjs-app/src/AppProviders.tsx` — confirmed `useDocSearchKeyboardShortcut` called; no `DocSearchPanel` mounted
- Codebase: `apps/nextjs-app/src/features/app/blocks/space/space-side-bar/SpaceInnerSideBar.tsx` — confirmed `doc-library` sidebar item
- Planning: `.planning/phases/11-super-agent-hardening/11-03-SUMMARY.md`, `11-04-PLAN.md`, `11-05-PLAN.md`, `11-06-PLAN.md`
- Planning: `.planning/phases/07-doc-import-vector-search/07-SUMMARY.md`
- Planning: `.planning/TESTING-PLAN.md` — 90 test cases, all `[ ]`
- Git log: commit `bbb916bac` — `fix(11-04-uat)` confirms 11-04 was executed with UAT fixes

### Tertiary (LOW confidence / assumed)
- RecordOpenApiService injectable into AgentModule without circular dep [ASSUMED — agent.module.ts imports not checked]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RecordOpenApiService can be injected into AgentModule without circular dependency | 11-06 / Open Questions | May require a different injection strategy or forwarded ref; 12-03 plan must check agent.module.ts imports first |

---

## Metadata

**Confidence breakdown:**
- 11-04 already executed: HIGH — verified from codebase grep + git log
- 11-05 spec framework/patterns: HIGH — vitest.config.ts + reference spec pattern from plan
- 11-06 raw SQL location: HIGH — verified lines in agent-execution.service.ts
- Doc search frontend partial state: HIGH — verified AppProviders + sidebar + components
- Playwright fixture patterns: HIGH — verified from e2e/fixtures/auth.ts

**Research date:** 2026-05-31
**Valid until:** 2026-06-30 (stable codebase; re-verify if major refactors happen)
