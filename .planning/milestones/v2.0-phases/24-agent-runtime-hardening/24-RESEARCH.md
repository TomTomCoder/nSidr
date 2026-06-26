# Phase 24: Agent Runtime Hardening — Research

**Researched:** 2026-06-14
**Domain:** NestJS agent execution engine, Vercel AI SDK v6, BullMQ, Prisma schema, OAuth credential binding
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Summary

Phase 24 closes five production-readiness gaps in the agent execution engine. All five requirements
are surgical additions to existing services — none require new module creation (with one
exception: `GuardrailService` is a new class, but it lives inside the existing `agent` or
`record` feature folder). The run loop in `agent-execution.service.ts` (890 lines) is the
central integration point for ARH-01, ARH-02, ARH-03, and ARH-04. ARH-05 is a standalone
wiring change in `knowledge-doc.service.ts` + the BullMQ queue.

The five gaps cluster into two patterns:
1. **Wrap existing paths** with resilience (ARH-01 = failover wrapper around `streamLlmIteration`; ARH-02 = validation gate in `executeToolCall`).
2. **Add new state/flow** that extends existing infrastructure (ARH-03 HITL = new `status` value + suspend/resume API; ARH-04 OAuth = add `userId` dimension to `AgentConnection`; ARH-05 = add `InjectQueue` to `KnowledgeDocService`).

**Primary recommendation:** implement in wave order: ARH-05 (smallest, isolated) → ARH-02 (pure logic, no schema) → ARH-04 (schema + service) → ARH-01 (config + retry) → ARH-03 (largest: schema + loop surgery + UI).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARH-01 | AI Gateway failover — retry on rate-limit/5xx against a configured fallback provider | `streamLlmIteration()` wraps a single `generateText()` call; no error handling around it; `aiConfigSchema` has no `fallbackModel` field yet |
| ARH-02 | Input/Output Guardrails — `GuardrailService` validates `create_record`/`update_record` against Teable field schema before commit | `executeToolCall` switch cases 516 and (update_record absent — not yet implemented) call `recordOpenApiService.multipleCreateRecords` directly; `field.validateCellValue()` + `field.validateCellValueWithNotNull()` exist in `packages/core/src/models/field/field.ts` |
| ARH-03 | HITL — `request_human_approval` suspends loop, persists `waiting_for_approval` status, UI shows approval card | `AgentConversation.status` comment shows `'in_progress'|'completed'|'failed'`; no `waiting_for_approval`; loop uses a plain `while` — no suspend mechanism exists |
| ARH-04 | Per-user OAuth — resolve credentials by `(agentId, userId, provider)`, fall back to agent-level token | `AgentConnection` unique constraint is `(agentId, provider)` — no `userId` column; all three OAuth services (`gmail-oauth`, `slack-oauth`, `github-oauth`) call `getValidToken(agentId)` only |
| ARH-05 | Embedding auto-trigger — enqueue BullMQ job immediately after `create_knowledge_doc` / `update_knowledge_doc` | `KnowledgeDocService.createDoc()` sets `isIndexed=false` and returns; does NOT enqueue; recovery happens only at boot via `DocIndexRecoveryService.onApplicationBootstrap()`; `DOC_INGEST_QUEUE` and `InjectQueue` pattern already used in `doc-crud.controller.ts` and `doc-ingest.controller.ts` |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AI Gateway failover | API / Backend | — | Pure backend concern; retry logic belongs next to the LLM call site in `agent-execution.service.ts` |
| Input/Output Guardrails | API / Backend | — | Must run before the Prisma write; belongs in or just before `executeToolCall` |
| HITL approval flow | API / Backend + Browser | — | Backend owns status persistence + resume endpoint; frontend renders approval card and calls resume |
| Per-user OAuth binding | API / Backend + Database | — | Schema migration to add `userId` to `AgentConnection`; service lookup change only |
| Embedding auto-trigger | API / Backend | — | BullMQ enqueue call in `KnowledgeDocService`; Redis already running |

---

## Standard Stack

### Core (all already in the project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | 6.0.169 | `generateText()` — the LLM call site to wrap for failover | Already used in `streamLlmIteration` |
| `@nestjs/bullmq` | (installed) | BullMQ queue injection for ARH-05 | Already used in `doc-crud.controller.ts` |
| `bullmq` | (installed) | Queue type for `InjectQueue` | Already used |
| `@teable/core` `AbstractField` | (monorepo) | `validateCellValue()` / `validateCellValueWithNotNull()` for ARH-02 | Already the validation path in `typecast.validate.ts` |
| Prisma `@teable/db-main-prisma` | (monorepo) | Schema migration for ARH-03 status + ARH-04 AgentConnection userId | Already used |

### No New External Packages Required

All five requirements are implementable with existing dependencies. No new `npm install` is needed.

---

## Package Legitimacy Audit

No new external packages are required for this phase. All dependencies are already installed.

---

## Architecture Patterns

### ARH-01: AI Gateway Failover

**How `streamLlmIteration` currently works:**
```typescript
// agent-execution.service.ts line 368
const { text, steps } = await generateText({
  model: modelInstance,
  ...(hasTools ? { tools, stopWhen: stepCountIs(1) } : {}),
  system: systemMessage?.content,
  messages: conversationMessages,
});
```
No try/catch around `generateText`. Any provider error (429, 5xx, network) propagates uncaught through the `while` loop and surfaces as an unhandled rejection.

**Error types to catch (Vercel AI SDK v6):** `[ASSUMED]` The SDK throws `APICallError` (from `ai` package) with a `statusCode` property for HTTP errors. Rate-limit errors return status 429; server errors return 5xx. Pattern: `err instanceof APICallError && (err.statusCode === 429 || err.statusCode >= 500)`.

**Where to add failover:**
- Add `fallbackModels?: string[]` to `aiConfigSchema` in `packages/openapi/src/admin/setting/update.ts`
- In `streamLlmIteration`, wrap `generateText` in a retry loop: attempt primary model; on 429/5xx, try each `fallbackModels` entry in order
- Pass `aiConfig` (already fetched at line 331) into `streamLlmIteration` so fallback list is available without an extra DB fetch

**Config shape to add to `aiConfigSchema`:**
```typescript
// packages/openapi/src/admin/setting/update.ts
fallbackModels: z.array(z.string()).optional(), // ordered fallback modelKeys
```

**Key constraint:** `streamLlmIteration` is private and takes `preResolvedModelKey` from `run()` preflight. Failover should resolve each fallback modelKey via the same `getModelInstance()` path.

---

### ARH-02: Input/Output Guardrails

**Current `create_record` path (line 516–535):**
```typescript
case 'create_record': {
  const { tableId, fields } = toolCall.input as { tableId: string; fields: Record<string, unknown> };
  const result = await this.recordOpenApiService.multipleCreateRecords(tableId, {
    records: [{ fields }],
    fieldKeyType: FieldKeyType.Id,
  });
  // No validation before the call
}
```

`update_record` is **absent from the switch** — it is not yet implemented. The planner must add it (with guardrails) as part of this phase.

**Field validation infrastructure already exists:**
- `AbstractField.validateCellValue(value)` → `ZodSafeParseResult` — validates shape
- `AbstractField.validateCellValueWithNotNull(value)` — also enforces `notNull` constraint
- `typecast.validate.ts` already uses these for user-submitted data

**GuardrailService design pattern:**
```typescript
// New class: agent-guardrail.service.ts (or record/guardrail.service.ts)
@Injectable()
export class GuardrailService {
  constructor(
    private readonly fieldService: FieldService, // fetch table fields
  ) {}

  async validateWrite(
    tableId: string,
    fields: Record<string, unknown>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const tableFields = await this.fieldService.getFields(tableId, ...);
    for (const [fieldId, value] of Object.entries(fields)) {
      const field = tableFields.find(f => f.id === fieldId);
      if (!field) continue; // unknown field — let DB reject it
      const result = field.validateCellValueWithNotNull(value);
      if (result && !result.success) {
        errors.push(`Field ${field.name}: ${fromZodError(result.error).message}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
```

**Return value to LLM on validation failure:** structured JSON so LLM can self-correct:
```json
{ "success": false, "validationErrors": ["Field 'status': must be one of ['active','inactive']"] }
```

---

### ARH-03: Human-in-the-Loop (HITL)

**Current statuses (schema comment, line 1323):**
```
'in_progress', 'completed', 'failed'
```
New status to add: `'waiting_for_approval'`

**AgentConversation schema change needed:**
- Add `approvalPayload Json? @map("approval_payload")` to store the pending tool call + question for the UI
- Status `waiting_for_approval` → resume is via a new `POST /api/agent/:id/conversation/:conversationId/approve` endpoint

**Run loop suspension pattern:**
The `run()` method is an `async generator` (`async *run()`). The cleanest approach is NOT to suspend the generator mid-iteration (complex), but to:
1. When the LLM emits `request_human_approval` tool call, persist the approval request to DB, update status to `waiting_for_approval`, yield a `{ type: 'hitl', payload }` event, and **`return`** (terminate the current generator run).
2. A `POST /approve` endpoint resumes by creating a new agent run with `conversationId` set (the existing multi-turn path already loads prior messages).
3. The approval response is injected as a synthetic user message in the resumed conversation.

**This avoids long-lived async generator suspension** and reuses the existing conversation history loading at line 195.

**`request_human_approval` tool definition** to add to `agent-tool-registry.service.ts`:
```typescript
{
  name: 'request_human_approval',
  description: 'Suspend the run and ask the human for approval before proceeding',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      context: { type: 'string' },
    },
    required: ['question'],
  },
}
```

**UI:** Approval card in agent chat — rendered when `conversation.status === 'waiting_for_approval'`; has Accept/Reject buttons calling the approve endpoint.

**Schema migration required:**
```prisma
model AgentConversation {
  // Add:
  approvalPayload Json? @map("approval_payload")
  // status comment update: 'in_progress', 'completed', 'failed', 'waiting_for_approval'
}
```

---

### ARH-04: Per-User OAuth Credential Binding

**Current `AgentConnection` unique constraint:**
```prisma
@@unique([agentId, provider])
```
This means one token per agent per provider — agent-owner credential only. `getValidToken(agentId)` in `gmail-oauth.service.ts` (line 116) uses only `agentId`.

**Required schema change:**
```prisma
model AgentConnection {
  // Add:
  userId  String?  @map("user_id")  // null = agent-level (backward compat)
  // Change unique:
  @@unique([agentId, provider])           // keep for agent-level (userId=null)
  // Add index for per-user lookup:
  @@index([agentId, userId, provider])
}
```

**Lookup fallback logic (to add to `AgentOAuthService` / per-provider service):**
```typescript
async getValidToken(agentId: string, userId?: string): Promise<OAuthToken> {
  // 1. Try per-user token
  if (userId) {
    const userConn = await prisma.agentConnection.findFirst({
      where: { agentId, provider: 'gmail', userId }
    });
    if (userConn?.encryptedToken) return decrypt(userConn.encryptedToken);
  }
  // 2. Fall back to agent-level token
  const agentConn = await prisma.agentConnection.findUnique({
    where: { agentId_provider: { agentId, provider: 'gmail' } }
  });
  if (!agentConn?.encryptedToken) throw new Error(`No Gmail token for agent ${agentId}`);
  return decrypt(agentConn.encryptedToken);
}
```

**Propagation:** `AgentRunContext` already has `userId?: string` (line 54). Pass `ctx.userId` through `executeToolCall` into Gmail/Slack/GitHub tool calls (switch cases 620–681).

**OAuth callback change:** when a user completes OAuth for a specific agent, store with `userId` set. The state param in `getAuthUrl` needs to include `userId`.

---

### ARH-05: Embedding Pipeline Auto-Trigger

**Current flow (gap):**
```
create_knowledge_doc → KnowledgeDocService.createDoc() → sets isIndexed=false → returns
                                            ↓ (only at boot)
DocIndexRecoveryService.onApplicationBootstrap() → queues all isIndexed=false docs
```
Between agent doc creation and next server restart, docs may take hours to become searchable.

**Fix:** Inject `DOC_INGEST_QUEUE` into `KnowledgeDocService` and enqueue immediately after `prisma.importedDoc.create`:

```typescript
// knowledge-doc.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DOC_INGEST_QUEUE, type DocIngestJobData } from './doc-ingest.processor';

@Injectable()
export class KnowledgeDocService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(DOC_INGEST_QUEUE) private readonly ingestQueue: Queue,
  ) {}

  async createDoc(input: CreateDocInput): Promise<DocWriteResult> {
    // ... existing create ...
    const row = await this.prisma.importedDoc.create({ ... });

    // NEW: enqueue immediately
    await this.ingestQueue.add(
      'reindex',
      { type: 'reindex', docId: row.id, spaceId } satisfies DocIngestJobData,
      { attempts: 2, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 100 }
    );

    return { docId: row.id, status: 'pending' };
  }
}
```

Same pattern for `updateDoc` — enqueue after the `$transaction` completes.

**Module registration:** `DocSearchModule` already registers `BullModule.registerQueue({ name: DOC_INGEST_QUEUE })` and exports it. `KnowledgeDocService` is in `DocSearchModule` — no additional module wiring needed.

**Idempotency:** BullMQ jobId deduplication is optional here. If the recovery service also runs at boot, the job may be duplicated but BullMQ processes it once and the second run is a no-op (doc is already indexed). Safe.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Field value validation | Custom type-switch validator | `AbstractField.validateCellValueWithNotNull()` in `packages/core` | Already handles all 20+ Teable field types including notNull, enums, date formats |
| BullMQ queue injection | Custom event emitter for doc ingest | `@InjectQueue(DOC_INGEST_QUEUE)` | BullMQ already installed, Redis already running, retry/backoff built in |
| LLM error detection | Regex on error message strings | `APICallError.statusCode` from Vercel AI SDK | Official SDK error class; string matching is fragile across providers |
| OAuth token storage | New encryption scheme | Existing `encryptedToken` column + decrypt pattern in `gmail-oauth.service.ts` | Encryption logic already implemented in Phase 4 |

---

## Common Pitfalls

### Pitfall 1: `update_record` is missing from the switch
**What goes wrong:** ARH-02 requirements mention both `create_record` and `update_record`. The switch has `create_record` but NOT `update_record`. The planner must add both the implementation AND the guardrail.
**How to avoid:** Verify with `grep -n "case 'update_record'" agent-execution.service.ts` before writing guardrail integration tests.

### Pitfall 2: HITL generator suspension complexity
**What goes wrong:** Attempting to `yield` inside an async generator then "await a promise that resolves when user approves" would require a long-lived pending promise. In NestJS/HTTP context this would time out.
**How to avoid:** Use the terminate-and-resume pattern (return current run; start new run with same conversationId) rather than suspending the generator in-place.

### Pitfall 3: AgentConnection unique constraint conflict after ARH-04 migration
**What goes wrong:** Adding a `userId` column while keeping `@@unique([agentId, provider])` for the agent-level row means the per-user rows need a different unique index. A naive migration that makes `userId` `NOT NULL` breaks all existing rows.
**How to avoid:** `userId` must be nullable. Keep the original unique for backward compat. Add a new partial unique or composite index for per-user rows.

### Pitfall 4: ARH-05 double-enqueue on boot
**What goes wrong:** If `KnowledgeDocService` enqueues on create AND `DocIndexRecoveryService` scans `isIndexed=false` at boot, a doc created just before restart gets two jobs.
**How to avoid:** This is safe — BullMQ processes idempotently if job options include `jobId` deduplication, or the second run is a no-op (doc already indexed by first run). Document this in code comments.

### Pitfall 5: `streamLlmIteration` preflight in `run()` already resolves model
**What goes wrong:** `run()` resolves `resolvedModelKey` at line 140 in preflight, then passes it to `streamLlmIteration` as `preResolvedModelKey`. Failover logic in `streamLlmIteration` must resolve fallback keys from `aiConfig` — but `aiConfig` is refetched inside `streamLlmIteration` (line 331). This is a second DB call.
**How to avoid:** Accept the extra DB call for simplicity (it's already done), or pass `aiConfig` as a parameter. The planner should pick the simpler path.

---

## Code Examples

### Verified: `streamLlmIteration` entry point
```typescript
// Source: apps/nestjs-backend/src/features/agent/agent-execution.service.ts lines 368–383
const { text, steps } = await generateText({
  model: modelInstance,
  ...(hasTools ? { tools: tools as never, stopWhen: stepCountIs(1) as never } : {}),
  system: systemMessage?.content,
  messages: conversationMessages as never,
});
```
[VERIFIED: direct codebase read]

### Verified: `create_record` tool case (no validation today)
```typescript
// Source: agent-execution.service.ts lines 516–535
case 'create_record': {
  const { tableId, fields } = toolCall.input as { tableId: string; fields: Record<string, unknown> };
  const result = await this.recordOpenApiService.multipleCreateRecords(tableId, {
    records: [{ fields }],
    fieldKeyType: FieldKeyType.Id,
  });
```
[VERIFIED: direct codebase read]

### Verified: Field validation API in core
```typescript
// Source: packages/core/src/models/field/field.ts lines 97–118
abstract validateCellValue(value: unknown): ZodSafeParseResult<unknown> | undefined;
validateCellValueWithNotNull(value: unknown): ZodSafeParseResult<unknown> | undefined {
  // enforces notNull constraint
}
```
[VERIFIED: direct codebase read]

### Verified: BullMQ enqueue pattern (existing, to replicate)
```typescript
// Source: apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts line 53
await this.queue.add(
  'reindex',
  { type: 'reindex', docId, spaceId } satisfies DocIngestJobData,
  { ... }
);
```
[VERIFIED: direct codebase read]

### Verified: AgentRunContext carries userId
```typescript
// Source: agent-execution.service.ts line 50–55
export interface AgentRunContext {
  agentId: string;
  // ...
  userId?: string;
  conversationId?: string;
}
```
[VERIFIED: direct codebase read]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Agent OAuth bound to agent only | Per-user OAuth binding (ARH-04) | Phase 24 | Multi-user orgs can use their own Gmail/Slack credentials |
| Boot-time doc recovery | Immediate queue on write (ARH-05) | Phase 24 | Docs searchable seconds after creation, not hours |
| Raw DB exception on bad write | Structured guardrail error to LLM (ARH-02) | Phase 24 | LLM can self-correct rather than crashing the run |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel AI SDK v6 throws `APICallError` with `.statusCode` for 429/5xx | ARH-01 pattern | Failover would not trigger on real provider errors; need to check actual SDK error class name |
| A2 | `update_record` is not in the switch and needs to be added as part of ARH-02 | ARH-02 | If it exists elsewhere, guardrail wiring point changes |

> A1 risk is LOW — the planner should add a `console.log` or unit test to confirm the error class before coding the catch condition.

---

## Open Questions (RESOLVED)

1. **ARH-01 fallback config UX** — Where does the admin configure `fallbackModels`? Options: (a) add a field to the existing AI settings modal; (b) agent-level override. Research found no existing UI for this. Recommendation: add to `aiConfigSchema` as a global setting; UI deferred to Phase 20 polish if needed.

2. **ARH-03 UI component** — What React component renders the approval card? No existing pattern found in the agent chat UI. The planner should scope this to a minimal inline card in the conversation stream, reusing the existing message rendering path.

3. **ARH-04 OAuth callback userId propagation** — The current `getAuthUrl` state param encodes only `{ agentId, provider }`. When a *user* (not admin) initiates OAuth for their own credential, the `userId` must be encoded in state too. The controller at `POST /api/agent/oauth/callback` must read it. Planner should verify the current callback controller.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Redis (BullMQ) | ARH-05 queue enqueue | Required (already running per CLAUDE.md) | — | None — required for BullMQ |
| PostgreSQL | Schema migrations ARH-03/04 | Required (already running) | — | None |
| Vercel AI SDK `ai` | ARH-01 failover | ✓ | 6.0.169 | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.17 |
| Config file | `apps/nestjs-backend/vitest.config.ts` (inferred from package.json) |
| Quick run command | `pnpm --filter nestjs-backend test-unit -- --bail 1` |
| Full suite command | `pnpm --filter nestjs-backend test-unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARH-01 | Failover triggers on 429, retries fallback model | unit | `vitest run --reporter=verbose src/features/agent/agent-execution.service.spec.ts` | ✅ (existing spec) |
| ARH-01 | Failover does NOT trigger on 4xx (bad request) | unit | same | ✅ |
| ARH-02 | `create_record` with invalid field value returns structured error to LLM | unit | `vitest run src/features/agent/agent-guardrail.service.spec.ts` | ❌ Wave 0 |
| ARH-02 | `update_record` with valid fields commits successfully | unit | same | ❌ Wave 0 |
| ARH-03 | HITL tool call sets status `waiting_for_approval`, terminates loop | unit | `vitest run src/features/agent/agent-execution.service.spec.ts` | ✅ (existing spec, needs new case) |
| ARH-03 | Resume via POST approve endpoint restores conversation | unit | `vitest run src/features/agent/agent.controller.unit.spec.ts` | ✅ |
| ARH-04 | `getValidToken` returns user-scoped token when present | unit | `vitest run src/features/agent/oauth/gmail-oauth.service.spec.ts` | ❌ Wave 0 |
| ARH-04 | `getValidToken` falls back to agent-level token when no user token | unit | same | ❌ Wave 0 |
| ARH-05 | `createDoc` enqueues BullMQ job immediately | unit | `vitest run src/features/doc-search/knowledge-doc.service.spec.ts` | ❌ Wave 0 |
| ARH-05 | `updateDoc` enqueues BullMQ reindex job | unit | same | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `src/features/agent/agent-guardrail.service.spec.ts` — covers ARH-02 validation logic
- [ ] `src/features/agent/oauth/gmail-oauth.service.spec.ts` — covers ARH-04 fallback logic
- [ ] `src/features/doc-search/knowledge-doc.service.spec.ts` — covers ARH-05 queue enqueue

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (ARH-04) | OAuth token scoped to `(agentId, userId, provider)` — prevents cross-user credential access |
| V3 Session Management | no | — |
| V4 Access Control | yes (ARH-03) | HITL approve endpoint must verify caller owns the conversation (`createdBy === userId`) |
| V5 Input Validation | yes (ARH-02) | `GuardrailService` uses `AbstractField.validateCellValueWithNotNull` — authoritative schema |
| V6 Cryptography | yes (ARH-04) | OAuth tokens stored as `encryptedToken` — existing encryption path must be used for per-user tokens too |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LLM prompt injection via crafted field values | Tampering | GuardrailService validates types/lengths before write |
| Cross-user OAuth token access | Elevation of Privilege | Lookup always scoped to `(agentId, userId, provider)` — never by userId alone |
| Approval bypass via direct status update | Tampering | Resume endpoint must validate conversation ownership before changing status |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` (lines 50–890)
- Direct codebase read: `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts`
- Direct codebase read: `apps/nestjs-backend/src/features/agent/agent-oauth.service.ts`
- Direct codebase read: `apps/nestjs-backend/src/features/agent/oauth/gmail-oauth.service.ts`
- Direct codebase read: `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts`
- Direct codebase read: `apps/nestjs-backend/src/worker/ingestion.worker.ts`
- Direct codebase read: `packages/db-main-prisma/prisma/postgres/schema.prisma` (AgentConnection, AgentConversation models)
- Direct codebase read: `packages/openapi/src/admin/setting/update.ts` (aiConfigSchema, LLMProvider)
- Direct codebase read: `packages/core/src/models/field/field.ts` (validateCellValue API)
- Direct codebase read: `.planning/REQUIREMENTS.md` (ARH-01..05 authoritative definitions)

### Tertiary (LOW confidence — training knowledge)
- Vercel AI SDK v6 error types (`APICallError`, `.statusCode`) — not verified in SDK source; tagged [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified present in package.json and imports
- Architecture: HIGH — all patterns read directly from source files
- Pitfalls: HIGH — derived from direct code inspection (missing `update_record`, nullable userId constraint)
- Vercel AI SDK error types: LOW — [ASSUMED]; planner should add a verification step

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable codebase; schema changes would invalidate sooner)
