# Phase 2: Prompt System - Context

**Gathered:** 2026-05-14
**Status:** Complete

<domain>
## Phase Boundary

Phase 2 delivered a centralized AI prompt registry with database overrides per feature and per-model adapters. All 5 hardcoded French system prompt strings were extracted from `ai.service.ts` into a `PromptService` with a 3-tier lookup (model-specific DB override → global DB override → hardcoded default). Admins can view and edit all 5 prompts through a REST API and a React panel in the admin settings UI without requiring code changes or redeployment.
</domain>

<decisions>
## Implementation Decisions

### Database Model
- **D-01:** Table name is `ai_prompt_override` (Prisma model `AiPromptOverride`), appended to the end of `packages/db-main-prisma/prisma/postgres/schema.prisma`
- **D-02:** Primary key is `id String @id @default(cuid())`
- **D-03:** Unique constraint is `@@unique([promptKey, modelPattern])` — generates Prisma compound key `promptKey_modelPattern`
- **D-04:** `modelPattern` is nullable — `null` means global override; non-null means model-prefix-specific override
- **D-05:** `isActive Boolean @default(true)` — soft-disable rows without deleting them
- **D-06:** Audit fields: `createdBy String`, `lastModifiedBy String?`, `createdTime`, `lastModifiedTime @updatedAt`

### Prompt Keys
- **D-07:** Five canonical keys defined in `PROMPT_KEY` const object in `prompt.service.ts`:
  - `table.create` — table creation system prompt
  - `app.generate` — React app code generation system prompt
  - `workflow.build` — workflow automation config system prompt
  - `import.analyze` — CSV/Excel import field-type analysis system prompt
  - `chat.system` — agent/chat assistant system prompt
- **D-08:** All 5 defaults are French-language prompts stored as `PROMPT_DEFAULTS` in `prompt.service.ts`

### PromptService Lookup Order
- **D-09:** Lookup order for `PromptService.get(key, modelId?)`:
  1. DB row with matching `promptKey` + `modelPattern` where `modelId.toLowerCase().startsWith(modelPattern.toLowerCase())`
  2. DB row with matching `promptKey` + `modelPattern === null` (global DB override)
  3. Hardcoded `PROMPT_DEFAULTS[key]`
- **D-10:** `PromptService` queries `prismaService.aiPromptOverride.findMany({ where: { promptKey: key, isActive: true } })` — fetches all active overrides for a key in one query, then filters in memory

### Dynamic Prompt Injection (ai.service.ts)
- **D-11:** For `app.generate`: static preamble is DB-overridable; dynamic schema JSON is concatenated at call site as `` appGeneratePrompt + `\n\nSCHÉMA DE LA BASE (utilise ces IDs exacts):\n${schemaJson}` ``
- **D-12:** For `workflow.build`: static preamble is DB-overridable; dynamic table list is concatenated at call site as `` workflowBuildPrompt + `\nTables disponibles:\n${tableList}` ``
- **D-13:** For `table.create`, `import.analyze`, `chat.system`: entire system param is DB-overridable with no dynamic concatenation

### REST API (PromptController)
- **D-14:** Controller base path: `api/admin/ai/prompts`
- **D-15:** Three endpoints:
  - `GET /api/admin/ai/prompts` — returns `IPromptOverrideVo[]` with all 5 keys; `@Permissions('instance|read')`
  - `PUT /api/admin/ai/prompts/:key` — upsert override with `{ content, modelPattern? }`; `@Permissions('instance|update')`
  - `DELETE /api/admin/ai/prompts/:key` — removes global (null modelPattern) override; `@Permissions('instance|update')`
- **D-16:** `GET` filters to `modelPattern: null` only — returns one override per key for the admin list view
- **D-17:** `PUT` uses `prismaService.aiPromptOverride.upsert` with compound where key `promptKey_modelPattern`; sets `createdBy: 'admin'` and `lastModifiedBy: 'admin'`
- **D-18:** `DELETE` uses `prismaService.aiPromptOverride.deleteMany({ where: { promptKey: key, modelPattern: null } })`; returns `{ deleted: number }`

### Response Shape
- **D-19:** `IPromptOverrideVo` shape:
  ```typescript
  { key: string; defaultContent: string; override: { content: string; modelPattern: string | null; isActive: boolean; } | null; }
  ```

### Admin UI
- **D-20:** Component path: `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/PromptOverridesPanel.tsx`
- **D-21:** React Query key: `['admin', 'ai-prompts']`
- **D-22:** Mutations call `queryClient.invalidateQueries({ queryKey: ['admin', 'ai-prompts'] })` on success
- **D-23:** Edit dialog pre-fills with `prompt.override?.content ?? prompt.defaultContent`
- **D-24:** Badge shows `"Overridden"` (variant `secondary`) or `"Default"` (variant `outline`); fallback to span if `@teable/ui-lib/shadcn/ui/badge` is absent
- **D-25:** `PromptOverridesPanel` is rendered in `AISettingPage.tsx` inside `<div className="mt-8">` after `</AIConfigFormWizard>`

### Auth Pattern
- **D-26:** Auth decorator follows existing admin controller pattern: `@Permissions('instance|read')` for read, `@Permissions('instance|update')` for write — same guard as `AdminOpenApiController`

### Module Registration
- **D-27:** `PromptService` registered in `providers` array of `AiModule`
- **D-28:** `PromptController` registered in `controllers` array of `AiModule`
- **D-29:** `AiService` receives `PromptService` via NestJS DI as `private readonly promptService: PromptService`

### Claude's Discretion
- Content length validation on `PUT` body: plans recommend `@MaxLength(10000)` via class-validator if available, but accepted as low-risk for admin-only endpoint if class-validator is not configured
- Exact position of `AiPromptOverride` model in schema (appended after `BaseShare` model)
- Prisma compound key name may be `promptKey_modelPattern` or `promptKey_modelPattern_key` — executor must verify against generated client
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/db-main-prisma/prisma/postgres/schema.prisma` — `AiPromptOverride` model definition and `@@unique` constraint
- `apps/nestjs-backend/src/features/ai/prompt.service.ts` — `PROMPT_KEY`, `PROMPT_DEFAULTS`, `PromptService.get()` signature
- `apps/nestjs-backend/src/features/ai/prompt.controller.ts` — `PromptController` REST endpoints and `IPromptOverrideVo` response shape
- `apps/nestjs-backend/src/features/ai/ai.module.ts` — `PromptService` and `PromptController` registration
- `apps/nestjs-backend/src/features/ai/ai.service.ts` — 5 `generateX` methods using `promptService.get()` with dynamic concatenation pattern
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/ai-config/PromptOverridesPanel.tsx` — admin UI component
- `apps/nextjs-app/src/features/app/blocks/admin/setting/AISettingPage.tsx` — integration point for `PromptOverridesPanel`

No external specs — requirements fully captured in decisions above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`PromptService.get(key, modelId?)`** — Phase 4 (Super Agent System) depends on this service. Agent instructions should be wired through `PromptService` using either an existing key (e.g., `chat.system`) or a new key added to `PROMPT_KEY`. The service is already injectable wherever `AiModule` is imported.
- **`PROMPT_KEY` and `PROMPT_DEFAULTS`** — Exported constants; downstream phases can import and extend `PROMPT_KEY` with new keys by editing `prompt.service.ts`
- **`IPromptOverrideVo`** shape — Defined inline in `prompt.controller.ts`; can be moved to a shared OpenAPI types package if needed by frontend consumers outside the admin panel
- **React Query key `['admin', 'ai-prompts']`** — Established cache key for the prompt list; any component that writes to prompts should invalidate this key

### Integration Points
- **`AiModule`** — All prompt infrastructure lives here; any new AI feature needing DB-overridable prompts must add its key to `PROMPT_KEY` in `prompt.service.ts` and inject `PromptService`
- **`AISettingPage.tsx`** — Admin settings page; `PromptOverridesPanel` is appended after `AIConfigFormWizard`; other admin panels follow the same insertion pattern
- **`@Permissions('instance|read|update')` decorator** — All admin prompt endpoints use this auth pattern; matches the existing `AdminOpenApiController` guard convention
- **Prisma `aiPromptOverride` accessor** — Available on `PrismaService` after `prisma generate`; used in both `PromptService` and `PromptController`
</code_context>

<specifics>
## Specific Ideas

- DB table: `ai_prompt_override`
- Prisma compound unique name: `promptKey_modelPattern` (verify against generated `node_modules/.prisma/client/index.d.ts`)
- 5 prompt keys: `table.create`, `app.generate`, `workflow.build`, `import.analyze`, `chat.system`
- API base: `GET|PUT|DELETE /api/admin/ai/prompts` and `/api/admin/ai/prompts/:key`
- React Query cache key: `['admin', 'ai-prompts']`
- UI label map: `{ 'table.create': 'Table Creation', 'app.generate': 'App Generation', 'workflow.build': 'Workflow Builder', 'import.analyze': 'Import Analysis', 'chat.system': 'Chat / Agent' }`
- All 5 default prompts are in French (language of the Teable EE deployment)
- Dynamic injection pattern: static DB-overridable preamble + runtime data (schemaJson, tableList) concatenated at `ai.service.ts` call site
- `createdBy` and `lastModifiedBy` hardcoded to `'admin'` string in controller (no user ID resolution)
- Recommended content max length: 10,000 characters (class-validator `@MaxLength(10000)`)
- Human verify checkpoint in plan 03: navigate to `http://localhost:3000/admin/setting/ai`, confirm 5-row panel, edit/save/reset cycle, `curl /api/admin/ai/prompts` returns 5-item JSON array
</specifics>

<deferred>
## Deferred Ideas

- Model-specific overrides exposed in the admin UI — `PromptController.listPrompts()` only returns `modelPattern: null` rows; model-pattern rows can be created via direct API calls but the UI does not yet surface a model pattern input field
- `@MaxLength(10000)` class-validator guard on `PUT` body — deferred as low-risk for admin-only endpoint; not confirmed implemented
- Moving `IPromptOverrideVo` interface to a shared OpenAPI/types package — currently inline in `prompt.controller.ts`
</deferred>

<testing>
## Testing Strategy

Phase 2 is complete. Regression tests must cover:

### Unit Tests (Vitest)
- `prompt.service.spec.ts` — test 3-tier lookup: DB model-specific hit → DB global hit → hardcoded default; mock `prismaService.aiPromptOverride.findFirst`
- Test that all 5 keys in `PROMPT_KEY` have entries in `PROMPT_DEFAULTS`

### Integration Tests (Vitest + test DB)
- `GET /api/admin/ai/prompts` → 200 array of 5 items (all defaults, no overrides initially)
- `PUT /api/admin/ai/prompts/table.create` with valid body → 200; subsequent GET returns override
- `DELETE /api/admin/ai/prompts/table.create` → 204; subsequent GET returns default value

### E2E Tests (Playwright)
- Navigate to `/admin/setting/ai` → `PromptOverridesPanel` renders 5 rows → edit `table.create` → save → reload → verify override persists
</testing>

---

*Phase: 02-prompt-system*
*Context gathered: 2026-05-14*
