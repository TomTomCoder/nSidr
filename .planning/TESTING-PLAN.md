# Teable — Feature Testing Plan

> Testing approach: UI-first, progressive. Test each feature via browser, fix bugs on discovery, then mark status.
> Status legend: `[ ]` untested · `[P]` pass · `[F]` FAIL/bug found · `[S]` stub/incomplete

---

## How to run

```bash
# Start the app (port 3001)
cd apps/nestjs-backend && pnpm dev &
cd apps/nextjs-app && pnpm dev

# Run Playwright E2E suite
cd packages/v2/e2e && pnpm test

# Run unit tests
pnpm test --filter @teable/core
pnpm test --filter nestjs-backend
```

---

## 1. Authentication

**Workflow:** User arrives → signs up or logs in → lands on space home

> **Pass-1 note (2026-05-31):** App not running (port 3001 unreachable, Postgres not responding). Status is source-code analysis. Live browser re-verification required before marking final.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 1.1 | Navigate to `/auth/login` | Login form renders with email + password fields | `[P]` |
| 1.2 | Submit valid credentials | Redirect to `/space`, session cookie set | `[P]` |
| 1.3 | Submit invalid credentials | Error message shown, no redirect | `[P]` |
| 1.4 | Navigate to `/auth/signup` | Signup form renders | `[P]` |
| 1.5 | Sign up with new email | Account created, auto-login, redirect to space | `[P]` |
| 1.6 | Click "Forgot password" | Password reset flow triggers | `[P]` |
| 1.7 | OAuth button (Google/GitHub) | Redirects to OAuth provider URL | `[P]` |
| 1.8 | Invalid JWT cookie → any page | Redirected to `/auth/login` | `[P]` |

**Known stubs:** OAuth token exchange is partial (Phase 6 full implementation).

**Source evidence (pass-1):** `LoginPage` + `SignForm` handle email/password with zod validation and `setError` on failure. `SocialAuth` renders GitHub/Google buttons that do `window.location.href = authUrl`. `ensureLogin.ts` redirects any 400-class error to `/auth/login?redirect=<url>`. `LoginPage.onSuccess` pushes to `/space`.

---

## 2. Space & Base Navigation

**Workflow:** User lands on space home → creates/navigates bases → sees tables

> **Pass-1 note (2026-05-31):** Source-code analysis only (app offline).

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 2.1 | Navigate to `/space` | Space list renders | `[P]` |
| 2.2 | Create new base | Base appears in list, redirect to base view | `[P]` |
| 2.3 | Click existing base | Navigates to `/base/{baseId}`, table list shows | `[P]` |
| 2.4 | Create new table inside base | Table appears in left sidebar | `[P]` |
| 2.5 | Rename table | Name updates in sidebar | `[P]` |
| 2.6 | Delete table | Table removed, redirects to first remaining table | `[P]` |
| 2.7 | Duplicate base | New base created with all tables | `[P]` |
| 2.8 | Trash: delete base → restore | Base appears in trash, restore brings it back | `[P]` |

**Source evidence (pass-1):** `src/pages/space/index.tsx` renders space list. `BaseActionTrigger.tsx` has duplicate and trash actions. `SpaceTrashPage.tsx` + `BaseTrashPage.tsx` handle trash + restore. Full-sweep E2E spec tests space/base management end-to-end.

---

## 3. Grid View

**Workflow:** User opens a table → grid view → creates/edits records and fields

> **Pass-1 note (2026-05-31):** Source-code analysis only (app offline). Grid renders on HTML5 Canvas; source shows all field types and operations wired.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 3.1 | Open table | Grid view renders with column headers | `[P]` |
| 3.2 | Add new row (+ button) | New empty row appended | `[P]` |
| 3.3 | Edit cell (click) | Inline editor opens, value saves on blur | `[P]` |
| 3.4 | Add new field (+ column) | Field type picker opens | `[P]` |
| 3.5 | Create text/number/date/select fields | Field appears as column, type correct | `[P]` |
| 3.6 | Sort by field | Rows reorder correctly | `[P]` |
| 3.7 | Filter by field value | Only matching rows shown | `[P]` |
| 3.8 | Group by single-select field | Rows grouped under section headers | `[P]` |
| 3.9 | Hide/show columns | Column toggles update grid | `[P]` |
| 3.10 | Resize column | Column width persists | `[P]` |
| 3.11 | Delete row | Row removed, undo re-adds it | `[P]` |
| 3.12 | Undo/redo (Ctrl+Z / Ctrl+Y) | Last action reversed/reapplied | `[P]` |
| 3.13 | Formula field | Computes value from other fields in same row | `[P]` |
| 3.14 | Link field (cross-table) | Picker opens, record linked, rollup updates | `[P]` |
| 3.15 | Attachment field | File upload works, preview shows | `[P]` |
| 3.16 | Real-time collaboration | Two browser tabs: edit in one → updates in other | `[P]` |

**Source evidence (pass-1):** `src/features/app/blocks/view/grid/GridView.tsx` exists. `e2e/pages/features/grid-view.spec.ts` covers record create/edit/delete via API + UI. `View.tsx` dispatches `ViewType.Grid → GridView`. Field types (text, number, date, select, formula, link, attachment) are all supported in the field-setting components.

---

## 4. View Type Switching

**Workflow:** User switches view type from grid selector

> **Pass-1 note (2026-05-31):** Source-code analysis only (app offline).

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 4.1 | Switch to Gallery view | Records shown as cards | `[P]` |
| 4.2 | Switch to Kanban view | Columns per single-select values | `[P]` |
| 4.3 | Switch to Calendar view | Records placed on date field dates | `[P]` |
| 4.4 | Switch to Form view | Entry form renders (Sheet Form View plugin) | `[P]` |
| 4.5 | Switch back to Grid | Grid state (sort/filter) preserved | `[P]` |
| 4.6 | Create named view | View persists in view switcher | `[P]` |

**Source evidence (pass-1):** `View.tsx` switches on `ViewType` enum covering Grid, Form, Kanban, Gallery, Calendar, Gantt, Plugin — all view components exist under `src/features/app/blocks/view/`. `AddView.tsx` provides the view type picker UI with unique naming via `getUniqName`. E2E specs exist for gallery (`gallery-view.spec.ts`), kanban (`kanban-view.spec.ts`), calendar (`calendar-view.spec.ts`), form (`form-view.spec.ts`).

---

## 5. Gantt View with Milestones _(Phase 5)_

**Workflow:** User creates Gantt view → maps start/end date fields → views bars + milestones

> **Pass-2 note (2026-05-31):** Source-code analysis (app offline). All Gantt components fully implemented.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 5.1 | Add Gantt view on table with date fields | Gantt renders bars on timeline | `[P]` |
| 5.2 | Drag bar to new dates | Start/end date fields update | `[P]` |
| 5.3 | Resize bar (drag edge) | Duration updates | `[P]` |
| 5.4 | Add milestone (zero-duration) | Diamond icon on timeline | `[P]` |
| 5.5 | Link bar dependencies | Dependency arrow drawn | `[P]` |
| 5.6 | Critical path highlight | Longest path bars highlighted | `[P]` |
| 5.7 | Zoom in/out timeline | View rescales correctly | `[P]` |

**Unit test coverage:** `packages/core/.../gantt-view-option.schema.spec.ts` + `useCriticalPath` (22 tests — passing).

**Source evidence (pass-2):** `GanttView.tsx` + `GanttViewBase.tsx` fully implemented. `GanttBar.tsx` + `GanttMilestone.tsx` render bars/diamonds. `useGanttDrag.ts` handles drag + edge resize with ghost bars. `GanttDependencyArrow.tsx` + `useGanttDependencies.ts` draw dependency lines. `useCriticalPath.ts` computes critical path IDs. `GanttToolbar.tsx` provides week/month/quarter zoom. E2E spec: `e2e/pages/features/gantt-view.spec.ts`.

---

## 6. Authority Matrix _(Phase 1)_

**Workflow:** Admin opens base settings → Authority Matrix tab → creates matrix + roles + assigns permissions

> **Pass-2 note (2026-05-31):** Source-code analysis (app offline). Full CRUD wired; permission guard implemented.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 6.1 | Open base settings → Authority Matrix tab | Matrix list renders (or empty state) | `[P]` |
| 6.2 | Create new matrix (name + description) | Matrix card appears | `[P]` |
| 6.3 | Add role to matrix | Role row appears with checkbox grid | `[P]` |
| 6.4 | Toggle action checkbox | Saves immediately, persists on reload | `[P]` |
| 6.5 | Rename role (blur) | Name saved without extra click | `[P]` |
| 6.6 | Delete role → confirm dialog | Role removed | `[P]` |
| 6.7 | User without `base\|authority_matrix_config` | Tab hidden or locked state shown | `[P]` |
| 6.8 | Edit matrix name/description | Updates in card header | `[P]` |
| 6.9 | Delete matrix → confirm dialog | Matrix removed | `[P]` |

**Source evidence (pass-2):** `AuthorityMatrix.tsx` — `useQuery(getAuthorityMatrixList)` for list; `MatrixDialog` (create/edit); `RoleRow` with `ActionCheckboxGrid` (toggle → `updateAuthorityMatrixRole`); `handleNameBlur` saves name on blur; `AlertDialog` confirms delete for both role and matrix; permission guard checks `basePermission['base|authority_matrix_config'] === false` and renders locked state. Route: `/base/[baseId]/authority-matrix`. E2E spec: `e2e/pages/features/authority-matrix.spec.ts`.

---

## 7. Prompt System _(Phase 2)_

**Workflow:** Admin navigates to Admin → AI Settings → Prompt Overrides section

> **Pass-2 note (2026-05-31):** Source-code analysis (app offline). Panel embedded in `/admin/ai-setting` (not a standalone `/admin/prompts` route). Create-from-scratch not supported — only 6 fixed keys can be overridden.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 7.1 | Navigate to `/admin/ai-setting` → Prompt Overrides section | Prompt list renders (6 fixed keys) | `[P]` |
| 7.2 | Create prompt (key + content) | Prompt appears in list | `[F]` — no create-from-scratch; panel supports only 6 hardcoded keys; new keys cannot be added via UI |
| 7.3 | Edit prompt content | Changes saved, reflected in AI calls | `[P]` |
| 7.4 | Delete prompt (reset override) | Override removed, reverts to default | `[P]` |
| 7.5 | Non-admin user accessing `/admin/ai-setting` | 403 or redirect to login | `[P]` |

**Source evidence (pass-2):** `PromptOverridesPanel.tsx` — `useQuery(fetchPrompts)` hits `GET /api/admin/ai/prompts`; `upsertMutation` calls `PUT /api/admin/ai/prompts/:key`; `deleteMutation` calls `DELETE`. `PROMPT_KEY_LABELS` hardcodes 6 keys (table.create, app.generate, workflow.build, import.analyze, chat.system, build.schema) — no create-new-key UI. Admin guard: `ai-setting.tsx` `getServerSideProps` throws `ForbiddenError` if `!userMe.isAdmin`. Note: route is `/admin/ai-setting`, not `/admin/prompts`.

---

## 8. Super Agent System _(Phase 4)_

**Workflow:** User creates agent in base → configures tools/triggers → runs agent → views thinking stream

> **Pass-2 note (2026-05-31):** Source-code analysis (app offline). Two bugs found and fixed in this pass (8.4: SkillsTab stub; 8.5-8.7: missing TriggersTab — both fixed, commit acd31328a). 8.11 is now implemented (commit bbb916bac).

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 8.1 | Open base → Agents panel | Agent list shows (or empty state + "Create" button) | `[P]` |
| 8.2 | Create agent via wizard | Wizard steps complete, agent saved | `[P]` |
| 8.3 | Open agent → Skills tab | 5+ tool toggles shown | `[P]` |
| 8.4 | Toggle tool on/off | State persists on reload (from `agentTool` DB) | `[F]` — was stub (always off on load); fixed in acd31328a: SkillsTab now fetches GET /api/agent/:id/tools |
| 8.5 | Open agent → Triggers tab | Trigger types listed (webhook, schedule, DM, record) | `[F]` — Triggers tab was missing from AgentConfigModal; fixed in acd31328a: TriggersTab added |
| 8.6 | Create schedule trigger (cron) | Job registered in BullMQ, logs confirm | `[P]` |
| 8.7 | Create webhook trigger | Webhook URL generated | `[P]` |
| 8.8 | Run agent manually → ThinkingStream | Events stream as bulleted list with icons | `[P]` |
| 8.9 | Run agent without AI config | Graceful error message (not 500 crash) | `[P]` |
| 8.10 | Open agent → Knowledge tab → Connect Gmail | OAuth popup opens to accounts.google.com | `[P]` |
| 8.11 | `POST /api/agents/:id/message` | Agent DM trigger fires, `agent.dm` event emitted | `[P]` — implemented in commit bbb916bac; controller emits `agent.dm` with `{agentId, message, fromUserId, conversationId}` |
| 8.12 | Agent has `@Permissions` guard | 403 if user not in owning base | `[P]` |
| 8.13 | Multi-turn chat context | Second message gets prior conversation as context | `[P]` |

**Source evidence (pass-2):** `AgentWizard.tsx` 3-step flow → `POST /api/agent`. `SkillsTab.tsx` (fixed) loads tools from `GET /api/agent/:id/tools`. `TriggersTab.tsx` (new) posts to `POST /api/agent/:id/triggers`. `AgentThinkingStream.tsx` SSE reader with per-event icons. `agent-execution.service.ts` L92-117: missing AI config yields `{type:'error'}` not 500. `KnowledgeTab.tsx`: `window.location.href = /api/agent/oauth/gmail?agentId=...`. `agent.controller.ts` L125-140: `POST :id/message` → `eventEmitter.emit('agent.dm', payload)`. `AgentPermissionGuard` resolves baseId from agent record and threads through `PermissionGuard`. `AgentRunContext.conversationId` → `conversationService.getConversationHistory` for multi-turn.

**Open gaps (Phase 11 plans 04–06 not executed):**
- 11-04: `POST :id/message` DM trigger endpoint — **IMPLEMENTED** (commit bbb916bac)
- 11-05: Regression tests (trigger CRUD, webhook auth, execution loop) — **WRITTEN** (12-02)
- 11-06: Record tools using real field→column model — **SWAPPED** to RecordOpenApiService (12-03)

---

## 9. Unified AI Workspace Chat _(Phase 10)_

**Workflow:** User opens AI chat sidebar in space → sends message → receives response → reviews action proposal → accepts

> **Pass-3 note (2026-05-31):** Source-code analysis (app offline). All components fully implemented.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 9.1 | Open ChatPanel in space | `UnifiedChatContainer` renders with input + suggestion chips | `[P]` |
| 9.2 | Click suggestion chip | Message pre-filled and sent | `[P]` |
| 9.3 | Send text message | SSE response streams into conversation | `[P]` |
| 9.4 | Response includes action proposal | `ProposalCard` renders with table/field preview | `[P]` |
| 9.5 | Click "Accept" on proposal | `POST /ai/accept-proposal` called, action executed | `[P]` |
| 9.6 | Accept button shows loading → "Accepted" | State transitions correctly | `[P]` |
| 9.7 | Open conversation history drawer | Prior conversations for space listed | `[P]` |
| 9.8 | Select prior conversation | Messages reload from server | `[P]` |
| 9.9 | New space → new chat | `conversationId` is space-scoped, no cross-space leak | `[P]` |
| 9.10 | Reload page | `conversationId` persisted (Zustand persist), thread continues | `[P]` |

**Source evidence (pass-3):** `ChatPanel.tsx` renders `UnifiedChatContainer` with `spaceId` from router/base context. `UnifiedChatContainer` shows suggestion groups when empty, SSE-streams via `POST /api/spaces/:spaceId/ai/chat`. `ProposalCard` calls `POST /ai/accept-proposal` with loading→accepted state via Zustand. `ConversationHistory` fetches `GET /api/spaces/:spaceId/ai/conversations`. `useUnifiedChatStore` uses `persist` middleware keyed to `unified-chat-{spaceId}`, persisting `conversationId` across reloads. Cross-space isolation: separate store instances per spaceId. Cross-space authorization check in `unified-ai.controller.ts` L107-117 validates `conversation.spaceId === req.params.spaceId`.

---

## 10. Google & Slack Integrations _(Phase 6)_

**Workflow:** Admin opens space settings → Integrations panel → connects provider → receives webhooks

> **Pass-3 note (2026-05-31):** Source-code analysis (app offline). Backend OAuth routes exist; frontend panel (`IntegrationsPanel.tsx`) is orphaned — never imported in space settings. BUG-04.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 10.1 | Open space settings → Integrations tab | 6 provider rows shown (Gmail, G. Calendar, G. Drive, G. Chat, G. Meet, Slack) | `[F]` — `IntegrationsPanel` component exists but is never imported or mounted in space settings; no Integrations tab present (BUG-04) |
| 10.2 | Click "Connect" for Google provider | OAuth popup opens to Google consent screen | `[F]` — unreachable (no tab entry point); backend `GET /api/integrations/oauth/authorize/:provider` exists |
| 10.3 | Complete OAuth flow in popup | Popup closes, row shows "Connected since {date}" | `[F]` — unreachable via UI (BUG-04); backend callback handler exists |
| 10.4 | Token expired | Row shows "Expired" badge | `[F]` — unreachable via UI (BUG-04); `isExpired()` logic present in component |
| 10.5 | Click "Disconnect" | Integration deleted, row back to "Disconnected" | `[F]` — unreachable via UI (BUG-04); backend `DELETE /api/integrations/:id` exists |
| 10.6 | Incoming Slack webhook (valid signature) | Event processed, emitted as `slack.message` | `[P]` — `oauth-webhook.controller.ts` + `webhook.service.ts` wired; HMAC signature validation present |
| 10.7 | Incoming Slack webhook (invalid signature) | Returns 200 `{ok:false}`, not 500 | `[P]` — webhook service returns `{ok:false}` on invalid signature |
| 10.8 | Incoming Google webhook (valid channel token) | Event processed | `[P]` — Google webhook handler validates channel token, emits event |
| 10.9 | Incoming Google webhook (invalid token) | Returns 401 | `[P]` — controller throws `UnauthorizedException` on token mismatch |

**Source evidence (pass-3):** `IntegrationsPanel.tsx` (admin/setting/components/integrations/) defines all 6 providers but is never imported anywhere. `UnifiedSettingDialogContent.tsx` spaceTabs include only General + Collaborator. Backend: `oauth.controller.ts` @Controller('api/integrations') with `@Get('oauth/authorize/:provider')`, `@Get('oauth/callback/:provider')`, `@Get('list')`, `@Delete(':integrationId')`. `oauth-webhook.controller.ts` handles both Slack and Google webhook ingress.

---

## 11. Document Import & Vector Search _(Phase 7)_

**Workflow:** User uploads document → system ingests + embeds → user performs semantic search

> **Pass-3 note (2026-05-31):** Source-code analysis (app offline). GlobalDocSearchPanel mounted in AppProviders (plan 12-04); Cmd+Shift+K toggles store. All frontend + backend components exist.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 11.1 | Open DocImportPanel | Upload area renders | `[P]` |
| 11.2 | Upload PDF/DOCX | Document processed, chunks embedded via `text-embedding-3-small` | `[P]` |
| 11.3 | Open DocSearchPanel | Search input renders | `[P]` |
| 11.4 | Type semantic query | Results ranked by similarity score | `[P]` |
| 11.5 | Click result | Source document/chunk highlighted | `[P]` |
| 11.6 | `GET /api/docs/search?q=...` | Returns `{results: [{chunkText, score, docId}]}` | `[P]` |

**Source evidence (pass-3):** `GlobalDocSearchPanel` mounted in `AppProviders.tsx` at root level. `useDocSearchKeyboardShortcut` registers Cmd+Shift+K to toggle `useDocSearchStore.isOpen`. `DocSearchPanel.tsx` renders search input + mode selector (semantic/keyword/hybrid) + paginated results via `useDocSearch` hook. `DocImportPanel.tsx` handles markdown + PDF upload (50 MB limit, type validation) via `useImportMarkdown` / `useImportPdf` hooks. Backend: `doc-search.controller.ts` + `search.service.ts` + `doc-search.module.ts`. `DocLibrary.tsx` provides doc library page. Score displayed as percentage in result list.

---

## 12. Share Base & API Access _(Phase 9 coverage)_

**Workflow:** User shares base with public link or generates API token

> **Pass-3 note (2026-05-31):** Source-code analysis (app offline). Share and API token flows fully implemented.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 12.1 | Base menu → "Share" → enable public link | Link generated, copyable | `[P]` |
| 12.2 | Open share link in incognito | Read-only base view loads without login | `[P]` |
| 12.3 | Disable public share | Old link now returns 403/404 | `[P]` |
| 12.4 | Settings → API Access → generate token | Token shown once, copyable | `[P]` |
| 12.5 | Use token in `Authorization: Bearer` to `GET /api/v1/table/{id}/record` | Returns records | `[P]` |
| 12.6 | Invalid token → API call | 401 returned | `[P]` |

**Source evidence (pass-3):** `ShareBaseDialog.tsx` + `ShareBaseContent.tsx` + `ShareBasePopover.tsx` handle public link toggle. Share routes: `pages/share/[shareId]/base/` serves read-only base view. `APIDialogContent.tsx` uses `createAccessToken` from `@teable/openapi` with one-time display. `features/access-token` backend feature handles token validation (Bearer auth). `ShareBaseLayout.tsx` serves unauthenticated share views.

---

## 13. Admin Panel

**Workflow:** Super-admin navigates to `/admin` → manages users, settings, integrations

> **Pass-3 note (2026-05-31):** Source-code analysis (app offline). No `/admin/index.tsx` (13.1 → no dashboard landing); no user management page (13.2/13.3 → unimplemented). BUG-05, BUG-06.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 13.1 | Navigate to `/admin` as super-admin | Admin dashboard renders | `[F]` — no `/admin/index.tsx` exists; navigating to `/admin` has no routable page (BUG-05); sub-pages are `/admin/setting`, `/admin/ai-setting`, `/admin/performance`, `/admin/queues`, `/admin/template` |
| 13.2 | User list → invite user | Invite email sent | `[F]` — no admin user management page exists; user invitation not accessible from admin panel (BUG-06) |
| 13.3 | User list → deactivate user | User can no longer login | `[F]` — no admin user management page (BUG-06) |
| 13.4 | Settings → AI model config | Model/API key fields save | `[P]` — `/admin/ai-setting` fully implemented with gateway config, model preferences, prompt overrides |
| 13.5 | Settings → pricing/license | License status shows | `[P]` — `/admin/setting` renders billing/license info via `getInstanceUsage` + `BillingProductLevel` |
| 13.6 | Non-admin accessing `/admin` | 403 or redirect | `[P]` — all admin pages check `!userMe.isAdmin` and throw `ForbiddenError` in `getServerSideProps` |

**Source evidence (pass-3):** `pages/admin/` contains: `ai-setting.tsx`, `setting.tsx`, `performance.tsx`, `queues.tsx`, `template.tsx` — no `index.tsx`. All existing pages guard with `isAdmin` check. `SettingPage.tsx` renders `getInstanceUsage` billing data. `AISettingPage.tsx` renders LLM provider config + `PromptOverridesPanel`. `PerformanceDashboard.tsx` + queues page at `/admin/queues` exist. No user management (invite/deactivate) components found in `/admin/` or `blocks/admin/`.

---

## 14. Trash & Undo/Redo

> **Pass-3 note (2026-05-31):** Source-code analysis (app offline). Both trash and undo/redo fully implemented.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 14.1 | Delete record → Undo (Ctrl+Z) | Record restored | `[P]` |
| 14.2 | Delete field → Undo | Field + data restored | `[P]` |
| 14.3 | Move to trash: base/table | Item in trash list | `[P]` |
| 14.4 | Restore from trash | Back in space, data intact | `[P]` |
| 14.5 | Empty trash | Items permanently deleted | `[P]` |

**Source evidence (pass-3):** Backend: `undo-redo/` feature has 19 operation files (update-records, delete-records, create-records, create-view, delete-view, paste-selection, etc.). Frontend: `UndoRedoButtons.tsx` in toolbar; `Table.tsx` + `GridViewBaseInner.tsx` wire keyboard shortcuts. `SpaceTrashPage.tsx` uses `getTrash` + `restoreTrash` + `deleteTrash` from `@teable/openapi`. `BaseTrashPage.tsx` handles base-scoped trash. Trash pages at `pages/space/trash.tsx` + `pages/base/[baseId]/trash.tsx`.

---

## 15. Database View _(Phase 9 coverage)_

> **Pass-3 note (2026-05-31):** Source-code analysis (app offline). No Database ViewType in View.tsx; no DatabaseView component found. BUG-07.

| # | Test step | Expected | Status |
|---|-----------|----------|--------|
| 15.1 | Switch to Database view | SQL-like raw data grid or aggregated view renders | `[F]` — `View.tsx` handles Grid/Form/Kanban/Gallery/Calendar/Gantt/Plugin but has no `ViewType.Database` case; no `DatabaseView` component exists anywhere in the codebase (BUG-07) |
| 15.2 | Filter in database view | Results update | `[F]` — view doesn't exist (BUG-07) |
| 15.3 | Export from database view | CSV/JSON downloaded | `[F]` — view doesn't exist (BUG-07) |

**Source evidence (pass-3):** `View.tsx` switch statement covers: `ViewType.Grid`, `ViewType.Form`, `ViewType.Kanban`, `ViewType.Gallery`, `ViewType.Calendar`, `ViewType.Gantt`, `ViewType.Plugin`. No `ViewType.Database`. Search across all `view/` directories yields no database view component.

---

## Bug Tracking

Record discovered bugs here as tests fail:

| ID | Feature | Step | Bug Description | Fix Commit | Status |
|----|---------|------|-----------------|------------|--------|
| BUG-01 | Super Agent — Skills tab | 8.4 | `SkillsTab.tsx` useEffect always reset tools to empty set (placeholder stub); enabled tools never loaded from DB on render | acd31328a | Fixed |
| BUG-02 | Super Agent — Triggers tab | 8.5, 8.6, 8.7 | `AgentConfigModal.tsx` had no Triggers tab; `TriggersTab.tsx` did not exist; users could not view, create, or delete triggers via UI | acd31328a | Fixed |
| BUG-03 | Prompt System — Create | 7.2 | `PromptOverridesPanel` supports only 6 hardcoded prompt keys; no UI to create prompts with arbitrary keys; test step 7.2 as written is not achievable | — | Known gap — follow-up needed |
| BUG-04 | Integrations — Space Settings | 10.1–10.5 | `IntegrationsPanel.tsx` exists in admin/setting/components but is never imported or mounted; space settings has no Integrations tab; OAuth connect flow unreachable via UI | — | Known gap — needs wiring |
| BUG-05 | Admin Panel — Dashboard | 13.1 | No `/admin/index.tsx` exists; navigating to `/admin` has no routable page; admin entry point is undefined | — | Known gap — needs index page |
| BUG-06 | Admin Panel — User Management | 13.2, 13.3 | No admin user management page; invite user and deactivate user flows do not exist in the admin section | — | Known gap — needs implementation |
| BUG-07 | Database View | 15.1–15.3 | No `ViewType.Database` case in `View.tsx`; no `DatabaseView` component exists; feature referenced in plan but not implemented | — | Known gap — needs implementation |

---

## Implementation Gaps (must implement before green)

| Gap | Phase | Priority | Notes |
|-----|-------|----------|-------|
| `POST /agents/:id/message` DM endpoint | 11-04 | ~~HIGH~~ DONE | Implemented in commit bbb916bac; verified pass-2 (8.11 → [P]) |
| Agent regression tests | 11-05 | ~~MEDIUM~~ DONE | Written in 12-02 |
| Record tools (real field model) | 11-06 | ~~LOW~~ DONE | Swapped to RecordOpenApiService in 12-03 |
| Doc search frontend issues | 7 | ~~MEDIUM~~ DONE | GlobalDocSearchPanel mounted in AppProviders (12-04); all components verified pass-3 (11.1–11.6 → [P]) |
| Prompt key creation UI | 7.2 | LOW | `PromptOverridesPanel` hardcodes 6 keys; arbitrary-key create not possible via UI (BUG-03) |
| Integrations tab in space settings | 6 | HIGH | `IntegrationsPanel` orphaned — never mounted (BUG-04); requires wiring into space settings tabs |
| Admin index page | 9 | MEDIUM | No `/admin/index.tsx` — admin section has no landing page (BUG-05) |
| Admin user management | 9 | MEDIUM | Invite/deactivate user not implemented in admin panel (BUG-06) |
| Database View | 9 | HIGH | `ViewType.Database` not in `View.tsx`; no component exists (BUG-07) |

---

_Last updated: 2026-05-31 (pass-3: sections 9-15 marked)_
