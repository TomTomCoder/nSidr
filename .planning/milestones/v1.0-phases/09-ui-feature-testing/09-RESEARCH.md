# Phase 9: UI Feature Testing & Bug Fixes — Research

**Researched:** 2026-05-23
**Domain:** Playwright E2E testing, NestJS/Next.js full-stack feature validation
**Confidence:** HIGH

## Summary

Phase 9 is a systematic Playwright-driven test campaign covering every feature built in Phases 1–7. The app runs as a unified NestJS + Next.js server (no separate ports in production mode) at http://localhost:3001 during dev. The repo already has a mature Playwright setup in `apps/nextjs-app/` with config, reporters (HTML/JSON/GitHub), trace-on-failure, and two browser targets (Desktop Chrome + Mobile Chrome). Existing e2e tests live in `apps/nextjs-app/e2e/pages/` and are very thin (index, 404, system). This phase adds 7 feature-area test suites, runs them against the live dev server, and fixes all discovered bugs progressively.

**Primary recommendation:** Write one spec file per phase feature area, use `reuseExistingServer: true` (already configured) against localhost:3001, group tests into Playwright `describe` blocks per feature, run with `E2E_WEBSERVER_MODE=DEV`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Authority Matrix UI | Frontend Server (SSR) | API / Backend | Page at /base/[baseId]/authority-matrix; reads permission from NestJS |
| Prompt Overrides Panel | Frontend Server (SSR) | API / Backend | Admin panel at /admin/prompts; CRUD via NestJS PromptController |
| Agent Chat UI | Browser / Client | API / Backend | Streaming SSE from AgentExecutionService; 3-step wizard is client-side |
| Gantt View rendering | Browser / Client | API / Backend | SVG/HTML timeline; view options stored in NestJS view.options JSON |
| Integrations Panel | Browser / Client | API / Backend | OAuth popups + postMessage; IntegrationsPanel admin UI |
| Doc Search (Cmd+Shift+K) | Browser / Client | API / Backend | Global shortcut opens DocSearchPanel; queries /api/doc-search |
| Bull Board queue admin | Frontend Server (SSR) | API / Backend | /admin/queues — served by NestJS BullMQ Board adapter |
| Performance dashboard | Frontend Server (SSR) | API / Backend | /admin/performance — Prometheus metrics via PerformanceInterceptor |

## Feature Inventory (All Testable UI Features by Area)

### Phase 1 — Authority Matrix
- `/base/[baseId]/authority-matrix` page loads without error
- Table of roles renders with correct columns
- Add/edit/delete role rows (modal form)
- Permission toggles save and reload correctly
- Unauthorized user sees 403 / redirect

### Phase 2 — Prompt System
- `/admin/prompts` page is accessible (admin only)
- Lists 5 default prompt entries (table creation, app generation, workflow, import, chat)
- Edit a prompt override: PUT saves, page reflects new value
- Delete override: row reverts to default
- Per-model adapter selector renders without error

### Phase 3 — Performance & Queue Admin
- `/admin/queues` (Bull Board) loads and shows DOC_INGEST queue
- `/admin/performance` dashboard renders Prometheus metric charts
- Import job dispatch via UI adds an item to the BullMQ queue (visible in Bull Board)

### Phase 4 — Super Agent System
- Agent list page renders
- 3-step creation wizard (Alignment → Personalization → Confirm) opens and navigates
- Step 1: name/description fields validate
- Step 2: instruction textarea, scope selector work
- Step 3: confirm creates agent, appears in list
- Agent config modal opens: 5 tabs (Instructions / Travaux / Compétences / Connaissance / Mémoire) all render
- Agent chat: send message, streaming response renders (AgentThinkingStream component)
- KnowledgeTab OAuth connect buttons render (skeleton expected — not functional without real tokens)
- BullMQ cron scheduler: scheduled agents appear in Bull Board with correct queue name

### Phase 5 — Gantt View
- Add Gantt view to a table with date fields (startField + endField selectors)
- Gantt timeline renders bars for records with valid date ranges
- Milestone markers appear for records meeting milestoneThreshold
- GanttOptionsPanel opens: all 9 options fields present
- Drag-to-reschedule: drag a bar, dates update in record
- Dependency arrows render when dependencyField is set
- Critical path highlighting toggle works
- Error state when startField/endField not set

### Phase 6 — Google & Slack Integrations
- IntegrationsPanel admin UI loads
- List of 6 providers renders (Gmail, GCal, GDrive, GChat, GMeet, Slack)
- "Connect" button triggers OAuth popup window
- Webhook configuration form renders
- Field sync direction selector (IMPORT/EXPORT/BIDIRECTIONAL) renders

### Phase 7 — Doc Import & Vector Search
- DocImportPanel: drag-and-drop or file picker for .md and .pdf files
- Upload triggers BullMQ DOC_INGEST job (confirm in Bull Board)
- DocLibrary: list of imported docs renders
- DocViewer: click doc renders content as plain text (no HTML injection)
- DocSearchPanel: Cmd+Shift+K opens modal
- Keyword search returns results
- Semantic search returns results (requires OPENAI_API_KEY)
- DocGraphService link graph visible (related docs section)

## Playwright Setup [VERIFIED: repo]

**Config location:** `apps/nextjs-app/playwright.config.ts`
**Test directory:** `apps/nextjs-app/e2e/`
**Existing tests:** `e2e/pages/index/`, `e2e/pages/system/` (thin smoke tests)
**Playwright version:** `@playwright/test` 1.57.0 [VERIFIED: package.json]

**Run command (against live dev server at :3001):**
```bash
# From apps/nextjs-app/
E2E_WEBSERVER_MODE=DEV npx playwright test --project="Desktop Chrome"
```

**Run single suite:**
```bash
E2E_WEBSERVER_MODE=DEV npx playwright test e2e/pages/features/agent.spec.ts
```

**Config key settings:**
- `reuseExistingServer: true` (non-CI) — tests hit already-running server at port 3000 by default
- App actually runs at port 3001 in dev — need `webServerPort` override or use `baseURL` env var
- `trace: 'retry-with-trace'` — traces captured on failure
- Reporters: HTML (`e2e/.out/reports/html`), JSON, list
- Timeout: 30s dev / 90s CI per test

**IMPORTANT: Port mismatch.** The playwright config hardcodes port 3000. The running dev server is at 3001. Wave 0 must add `baseURL: 'http://localhost:3001'` to `playwright.config.ts` use block, or set `PLAYWRIGHT_BASE_URL` env var if supported. [ASSUMED — need to verify env var name]

**New test file location:** `apps/nextjs-app/e2e/pages/features/`
- `01-authority-matrix.spec.ts`
- `02-prompt-system.spec.ts`
- `03-performance-queues.spec.ts`
- `04-agent-system.spec.ts`
- `05-gantt-view.spec.ts`
- `06-integrations.spec.ts`
- `07-doc-search.spec.ts`

## Test Strategy (Wave Organization)

### Wave 0 — Setup & Fixtures
- Fix port in playwright config (3001)
- Create shared auth fixture (login as admin user)
- Create test helper: `createTestBase()`, `createTestTable()`, `createTestRecord()`
- Create `e2e/pages/features/` directory

### Wave 1 — Core Navigation & Auth (Authority Matrix + Prompt System)
- Tests for Phase 1 authority matrix UI
- Tests for Phase 2 prompt override admin panel
- These are simple CRUD UIs — highest confidence of passing

### Wave 2 — Data Features (Gantt View + Doc Search)
- Tests for Phase 5 Gantt view (needs table with date fields — fixture required)
- Tests for Phase 7 doc import/search (file upload fixture required)
- Fix any rendering bugs discovered

### Wave 3 — Agent & Integrations
- Tests for Phase 4 agent wizard and chat streaming
- Tests for Phase 6 integrations panel (OAuth popups — test button click + popup opens, not full OAuth flow)
- Fix bugs discovered

### Wave 4 — Admin Dashboards & Bug Sweep
- Tests for Phase 3 Bull Board and performance dashboard
- Cross-feature regression sweep
- Fix remaining bugs, final green run

## Known Issues (from Git Status)

Modified files on `refactor/architecture-deep-fix` branch that may have introduced bugs:

| File | Risk |
|------|------|
| `src/features/agent/agent-execution.service.ts` | Agent streaming may be broken |
| `src/features/agent/agent.module.ts` | Module wiring change — agent endpoints may 500 |
| `src/features/ai/ai.module.ts` | AI module change — prompt system may be affected |
| `src/features/ai/prompt.service.ts` | PromptService change — may break prompt override panel |
| `src/features/view/constant.ts` | View constants change — may affect Gantt view registration |
| `src/features/record/query-builder/*.ts` | 3 query builder files changed — Gantt/Grid data fetch may be broken |
| `src/features/table/open-api/table-open-api-v2.mapper.ts` | Table mapper change — table CRUD UI may have type errors |
| `src/features/next/next.controller.ts` | Next.js controller change — page routing may be affected |
| `src/share-db/readonly/readonly.service.ts` | ReadOnly service — real-time collaborative features may be broken |
| `src/features/import/open-api/import.class.ts` | Import pipeline change — doc import may fail |
| `apps/nextjs-app/src/features/app/blocks/share/view/component/grid/GridViewBase.tsx` | Grid view change — may affect all table views |
| `apps/nextjs-app/.env.development` | Env change — may affect API URLs or feature flags |

**High-priority bugs to check first:** Agent module wiring, view constants (Gantt), query builder (all views).

## Validation Architecture (Acceptance Criteria per Feature Area)

| Feature Area | Acceptance Criteria | Test Type | Automated? |
|-------------|---------------------|-----------|------------|
| Authority Matrix | Page loads, CRUD works, 403 on unauthorized | E2E Playwright | Yes |
| Prompt System | Admin panel loads, PUT/DELETE work | E2E Playwright | Yes |
| Bull Board | /admin/queues renders queue list | E2E Playwright | Yes |
| Performance Dashboard | /admin/performance renders charts | E2E Playwright | Yes |
| Agent Wizard | 3-step form navigates and submits | E2E Playwright | Yes |
| Agent Chat | Message sent, streaming tokens appear | E2E Playwright | Yes (with timeout) |
| Gantt View | Bars render for date fields, options panel works | E2E Playwright | Yes |
| Drag-to-reschedule | Bar drag updates record dates | E2E Playwright | Yes |
| Integrations Panel | 6 providers listed, connect button opens popup | E2E Playwright | Yes |
| Doc Import | File upload triggers job in Bull Board | E2E Playwright | Yes |
| DocViewer | Content renders as plain text (no XSS) | E2E Playwright | Yes |
| Doc Search (Cmd+K) | Shortcut opens modal, search returns results | E2E Playwright | Yes |
| Keyword search | Returns results within 2s | E2E Playwright | Yes |
| Semantic search | Returns results (requires OPENAI_API_KEY) | E2E Playwright | Conditional |

**Phase gate:** All 14 acceptance criteria green (semantic search can be skipped if no OPENAI_API_KEY in test env).

## Standard Stack [VERIFIED: repo]

| Tool | Version | Purpose |
|------|---------|---------|
| @playwright/test | 1.57.0 | E2E test runner |
| Desktop Chrome | bundled | Primary test browser |
| Mobile Chrome (Pixel 5) | bundled | Mobile regression |
| vitest | 4.0.17 | Unit tests (separate from e2e) |

No new packages required — Playwright is already installed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Auth state across tests | Custom cookie management | Playwright `storageState` fixture |
| File upload in tests | Base64 encoding hacks | `page.setInputFiles()` |
| Waiting for streaming | `sleep()` loops | `page.waitForSelector()` with timeout |
| Screenshot on failure | Custom reporter | Built-in `preserveOutput: 'always'` + HTML reporter |
| OAuth popup testing | Full OAuth flow | Assert popup opens + closes, not full flow |

## Common Pitfalls

### Pitfall 1: Port mismatch (CRITICAL)
**What goes wrong:** Playwright config uses port 3000 but dev server runs at 3001 — all tests 404.
**How to avoid:** Add `baseURL: 'http://localhost:3001'` to `use:` block in playwright.config.ts or pass via env.

### Pitfall 2: No auth fixture — tests fail on login redirect
**What goes wrong:** Every feature page requires auth; tests land on login page.
**How to avoid:** Wave 0 creates a `storageState.json` fixture via `page.context().storageState()` after programmatic login.

### Pitfall 3: Gantt requires pre-configured date fields
**What goes wrong:** Gantt view shows "no startField configured" error if table has no date fields.
**How to avoid:** Test fixture creates a table with two Date fields before running Gantt tests.

### Pitfall 4: Streaming tests are flaky without proper waits
**What goes wrong:** Agent streaming SSE tokens arrive asynchronously; test asserts on empty div.
**How to avoid:** Use `page.waitForFunction()` to wait until streaming div has non-empty text content.

### Pitfall 5: OAuth popup tests require `popup` event listener
**What goes wrong:** `window.open()` in OAuth connect code creates a new page — Playwright must listen for it.
**How to avoid:** Use `const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('[data-testid="oauth-connect"]')])`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Playwright runner | Yes | check with `node --version` | — |
| Playwright browsers | E2E tests | Yes (installed) | 1.57.0 | `npx playwright install` |
| Dev server at :3001 | All tests | Must be running | — | Start with `turbo dev` |
| PostgreSQL + pgvector | Doc search tests | Required | — | Skip semantic search tests |
| OPENAI_API_KEY | Semantic search tests | ASSUMED present | — | Skip semantic search assertions |
| Bull Board at /admin/queues | Queue tests | ASSUMED served by NestJS | — | Check NestJS startup |

## Sources

### Primary (HIGH confidence)
- `apps/nextjs-app/playwright.config.ts` — verified config, port, reporters, browser targets
- `apps/nextjs-app/package.json` — verified Playwright version 1.57.0
- `.planning/ROADMAP.md` — feature inventory per phase (all 7 phases)
- `.planning/STATE.md` — architecture decisions per phase (Phase 5/6/7)
- `apps/nestjs-backend/src/features/` directory listing — verified all feature modules

### Secondary (MEDIUM confidence)
- Git status on `refactor/architecture-deep-fix` — known-modified files and risk areas [ASSUMED all are risk areas without reading diffs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dev server runs at :3001 (from objective) | Playwright Setup | Port fix targets wrong port |
| A2 | `PLAYWRIGHT_BASE_URL` env var overrides baseURL | Playwright Setup | Wave 0 config approach wrong |
| A3 | OPENAI_API_KEY present in test environment | Environment Availability | Semantic search tests always fail |
| A4 | Bull Board served at /admin/queues | Feature Inventory | Queue admin test wrong URL |
| A5 | storageState approach works for admin auth | Test Strategy | All tests fail on auth redirect |

## Metadata

**Confidence breakdown:**
- Feature inventory: HIGH — sourced directly from ROADMAP.md
- Playwright setup: HIGH — verified from config file and package.json
- Known issues: MEDIUM — based on modified file list, not diff content
- Port mismatch risk: HIGH — explicit in objective ("app running at :3001"), config hardcodes 3000

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 (stable Playwright API)
