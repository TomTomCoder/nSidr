# Phase 24: Agent Runtime Hardening — Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 9 (7 modify + 2 new)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` | service | request-response + event-driven | itself (surgical edits) | exact |
| `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts` | service | CRUD | itself (surgical edits) | exact |
| `apps/nestjs-backend/src/features/agent/oauth/gmail-oauth.service.ts` | service | request-response | itself (surgical edits) | exact |
| `apps/nestjs-backend/src/features/agent/oauth/slack-oauth.service.ts` | service | request-response | `gmail-oauth.service.ts` | role-match |
| `apps/nestjs-backend/src/features/agent/oauth/github-oauth.service.ts` | service | request-response | `gmail-oauth.service.ts` | role-match |
| `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts` | service | CRUD + batch | itself (inject queue) | exact |
| `packages/db-main-prisma/prisma/postgres/schema.prisma` | migration | — | itself (add columns) | exact |
| NEW: `apps/nestjs-backend/src/features/agent/agent-guardrail.service.ts` | service | transform/validate | `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts` | role-match |
| NEW: `apps/nestjs-backend/src/features/agent/agent-hitl.service.ts` | service | event-driven | `agent-conversation.service.ts` | role-match |

---

## Pattern Assignments

### `apps/nestjs-backend/src/features/agent/knowledge-doc.service.ts` — ARH-05: Inject BullMQ queue

**Analog:** `apps/nestjs-backend/src/features/doc-search/doc-crud.controller.ts`

**Imports pattern** (doc-crud.controller.ts lines 1-6):
```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DOC_INGEST_QUEUE, DocIngestJobData } from './doc-ingest.processor';
```

**Constructor injection pattern** (lines 28-31):
```typescript
constructor(
  @InjectQueue(DOC_INGEST_QUEUE) private readonly queue: Queue,
  private readonly prisma: PrismaService
) {}
```

**Enqueue helper pattern** (lines 44-56):
```typescript
private async enqueueReindex(docId: string, spaceId: string): Promise<void> {
  const jobId = reindexJobId(docId);
  try {
    await this.queue.remove(jobId);
  } catch {
    // Job is active/locked — reindex already in flight; add() below is safe no-op.
  }
  await this.queue.add(
    'reindex',
    { type: 'reindex', docId, spaceId } satisfies DocIngestJobData,
    { ...REINDEX_JOB_OPTS, jobId }
  );
}
```

**REINDEX_JOB_OPTS constant** (lines 8-20):
```typescript
const REINDEX_JOB_OPTS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: true,   // must be true — see comment about jobId dedup
  removeOnFail: 50,
};
function reindexJobId(docId: string) { return `reindex-${docId}`; }
```

**Call site in `createDoc`** (lines 82-85):
```typescript
if (hasContent) {
  await this.enqueueReindex(doc.id, spaceId);
}
```

**Call site in `updateDoc`** (lines 103-105):
```typescript
if (body.content !== undefined) {
  await this.enqueueReindex(docId, spaceId);
}
```

**Note:** `KnowledgeDocService` currently constructs with only `PrismaService` (line 43). Add `@InjectQueue` as second constructor arg. `spaceId` comes from `createDoc`'s `input.spaceId`; for `updateDoc` fetch it from the existing `doc.spaceId` that is already read for RBAC check.

---

### NEW `apps/nestjs-backend/src/features/agent/agent-guardrail.service.ts` — ARH-02

**Analog:** `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.ts` (service class structure)

**Class scaffold pattern** (knowledge-doc.service.ts lines 41-43):
```typescript
@Injectable()
export class KnowledgeDocService {
  constructor(private readonly prisma: PrismaService) {}
```

**Error return pattern** (lines 48-53 of knowledge-doc.service.ts):
```typescript
if (!title || title.trim().length === 0) {
  throw new BadRequestException('title must be non-empty');
}
```

**GuardrailService target shape** (from RESEARCH.md):
```typescript
import { Injectable } from '@nestjs/common';
import { FieldService } from '../field/field.service';   // or FieldOpenApiService

@Injectable()
export class GuardrailService {
  constructor(private readonly fieldService: FieldService) {}

  async validateWrite(
    tableId: string,
    fields: Record<string, unknown>
  ): Promise<{ valid: boolean; errors: string[] }> { ... }
}
```

**Validation API to call** (packages/core/src/models/field/field.ts lines 97-118, per RESEARCH):
```typescript
abstract validateCellValue(value: unknown): ZodSafeParseResult<unknown> | undefined;
validateCellValueWithNotNull(value: unknown): ZodSafeParseResult<unknown> | undefined;
```

**Error response shape to return to LLM** (RESEARCH.md ARH-02):
```json
{ "success": false, "validationErrors": ["Field 'status': must be one of ['active','inactive']"] }
```

**Integration point in `executeToolCall`** (agent-execution.service.ts lines 516-534):
```typescript
case 'create_record': {
  const { tableId, fields } = toolCall.input as { tableId: string; fields: Record<string, unknown> };
  // INSERT BEFORE the multipleCreateRecords call:
  const check = await this.guardrailService.validateWrite(tableId, fields);
  if (!check.valid) {
    return { success: false, validationErrors: check.errors };
  }
  const result = await this.recordOpenApiService.multipleCreateRecords(tableId, {
    records: [{ fields }],
    fieldKeyType: FieldKeyType.Id,
  });
```

---

### `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — ARH-01: Failover wrapper

**Analog:** itself — wrap the existing `generateText` call at lines 363-368.

**Current `streamLlmIteration` generateText call** (lines 363-368):
```typescript
const { text, steps } = await generateText({
  model: modelInstance,
  ...(hasTools ? { tools: tools as never, stopWhen: stepCountIs(1) as never } : {}),
  system: systemMessage?.content,
  messages: conversationMessages as never,
});
```

**Existing error pattern in `run()`** (lines 154-167 — config guard block):
```typescript
try {
  // ...
} catch (configError) {
  const isConfigError = (configError as Error).message?.includes('...');
  yield { type: 'error', content: errorMessage };
  await this.conversationService.markConversationFailed(conversationId);
  return;
}
```

**Failover pattern to apply around `generateText`:**
```typescript
// In streamLlmIteration — wrap the generateText call:
let lastError: Error | null = null;
const modelKeys = [resolvedModelKey, ...(aiConfig.fallbackModels ?? [])];
for (const key of modelKeys) {
  try {
    const instance = await this.aiService.getModelInstance(key, aiConfig.llmProviders);
    const { text, steps } = await generateText({ model: instance, ... });
    // success — break
    return { text: text || null, toolCalls: ... };
  } catch (err) {
    const isRetryable = (err as any)?.statusCode === 429 || (err as any)?.statusCode >= 500;
    if (!isRetryable || key === modelKeys[modelKeys.length - 1]) throw err;
    lastError = err as Error;
    this.logger.warn(`Model ${key} failed (${(err as any).statusCode}), trying fallback`);
  }
}
throw lastError!;
```

**aiConfigSchema addition** (`packages/openapi/src/admin/setting/update.ts`):
```typescript
fallbackModels: z.array(z.string()).optional(),
```

---

### `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts` — ARH-03: HITL status

**Analog:** itself — add new status + methods alongside existing `markConversationComplete/Failed`.

**Existing status update pattern** (lines 72-83):
```typescript
async markConversationComplete(conversationId: string): Promise<void> {
  await this.prismaService.agentConversation.update({
    where: { id: conversationId },
    data: { status: 'completed' },
  });
}
async markConversationFailed(conversationId: string): Promise<void> {
  await this.prismaService.agentConversation.update({
    where: { id: conversationId },
    data: { status: 'failed' },
  });
}
```

**New method to add** (copy pattern of markConversationFailed):
```typescript
async markConversationWaitingForApproval(
  conversationId: string,
  approvalPayload: object
): Promise<void> {
  await this.prismaService.agentConversation.update({
    where: { id: conversationId },
    data: { status: 'waiting_for_approval', approvalPayload },
  });
}
```

**Ownership check pattern** (agent-execution.service.ts lines 197-200):
```typescript
const conv = await this.conversationService.findConversation(ctx.conversationId);
if (conv && ctx.userId && conv.userId !== ctx.userId) {
  yield { type: 'error', content: 'Conversation not found' };
  return;
}
```

---

### NEW `apps/nestjs-backend/src/features/agent/agent-hitl.service.ts` — ARH-03 resume endpoint logic

**Analog:** `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts`

**Class structure pattern** (lines 16-19):
```typescript
@Injectable()
export class AgentConversationService {
  private readonly logger = new Logger(AgentConversationService.name);
  constructor(private readonly prismaService: PrismaService) {}
```

**findConversation pattern** (lines 86-96):
```typescript
async getConversationHistory(conversationId: string) {
  const conversation = await this.prismaService.agentConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdTime: 'asc' } } },
  });
  return conversation;
}
```

**Terminate-and-resume pattern** (RESEARCH.md ARH-03): on `request_human_approval` tool call:
1. Call `markConversationWaitingForApproval(conversationId, { question, context })`
2. Yield `{ type: 'hitl', payload: { question, context } }`
3. `return` (terminate generator)

Resume via `POST .../approve` endpoint: create new agent run with existing `conversationId` + inject approval as synthetic user message.

---

### OAuth services (Gmail / Slack / GitHub) — ARH-04: userId param

**Analog:** `apps/nestjs-backend/src/features/agent/oauth/gmail-oauth.service.ts`

**Current `getValidToken` signature** (line 116):
```typescript
async getValidToken(agentId: string): Promise<GmailToken>
```

**Current agent-level lookup** (lines 117-119):
```typescript
const connection = await this.prismaService.agentConnection.findUnique({
  where: { agentId_provider: { agentId, provider: 'gmail' } },
});
```

**New signature with fallback** (RESEARCH.md ARH-04):
```typescript
async getValidToken(agentId: string, userId?: string): Promise<GmailToken> {
  if (userId) {
    const userConn = await this.prismaService.agentConnection.findFirst({
      where: { agentId, provider: 'gmail', userId },
    });
    if (userConn?.encryptedToken) return this.decryptToken(userConn.encryptedToken) as GmailToken;
  }
  // Fall back to agent-level token (existing path)
  const connection = await this.prismaService.agentConnection.findUnique({
    where: { agentId_provider: { agentId, provider: 'gmail' } },
  });
  if (!connection?.encryptedToken) throw new Error(`No Gmail connection found for agent ${agentId}`);
  return this.decryptToken(connection.encryptedToken) as GmailToken;
}
```

**Encryption/decryption pattern** (lines 228-257 — private methods, do NOT change, reuse as-is).

**Call propagation point** in `agent-execution.service.ts` (lines 624-631): pass `ctx.userId` through `executeGmailTool`:
```typescript
return await executeGmailTool(
  toolCall.name,
  toolCall.input,
  agent.id,
  this.gmailOAuthService,
  this.httpService,
  ctx.userId   // ADD: propagate to allow per-user lookup
);
```

---

### `packages/db-main-prisma/prisma/postgres/schema.prisma` — ARH-03 + ARH-04 migrations

**Analog:** itself — targeted column additions.

**AgentConversation change** (add after existing fields):
```prisma
model AgentConversation {
  // existing fields ...
  approvalPayload Json?  @map("approval_payload")
  // status comment update: 'in_progress' | 'completed' | 'failed' | 'waiting_for_approval'
}
```

**AgentConnection change** (add userId column + new index):
```prisma
model AgentConnection {
  // existing fields ...
  userId  String?  @map("user_id")   // null = agent-level (backward compat)
  // existing: @@unique([agentId, provider])   // KEEP for agent-level rows (userId=null)
  // ADD:
  @@index([agentId, userId, provider])
}
```

**CRITICAL constraint note:** `userId` MUST be nullable. The existing `@@unique([agentId, provider])` applies to agent-level rows only. Do NOT add a second unique covering userId — use a plain `@@index` for the per-user lookup path, as the service uses `findFirst` not `findUnique` for per-user rows.

---

## Shared Patterns

### Logger pattern
**Source:** `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts` lines 17-18
**Apply to:** All new service files
```typescript
private readonly logger = new Logger(AgentConversationService.name);
```

### Injectable constructor pattern
**Source:** `apps/nestjs-backend/src/features/agent/agent-conversation.service.ts` lines 16-19
**Apply to:** `GuardrailService`, `AgentHitlService`
```typescript
@Injectable()
export class FooService {
  private readonly logger = new Logger(FooService.name);
  constructor(private readonly prismaService: PrismaService) {}
```

### Test file structure
**Source:** `apps/nestjs-backend/src/features/doc-search/knowledge-doc.service.spec.ts` lines 1-39
**Apply to:** All Wave 0 spec files
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
// hand-rolled prisma mock with typed signatures
function makePrismaMock() { ... }
describe('ServiceName', () => {
  let svc: ServiceName;
  beforeEach(() => {
    svc = new ServiceName(makePrismaMock() as never);
  });
```

### Tool case error return pattern
**Source:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` lines 631-639
**Apply to:** All new tool cases in executeToolCall
```typescript
} catch (e) {
  this.logger.error(`Tool error: ${(e as Error).message}`);
  return {
    error: `Operation failed: ${(e as Error).message}`,
    hint: 'Human-readable hint for the LLM to self-correct',
  };
}
```

---

## No Analog Found

All files have close analogs in the codebase.

---

## Metadata

**Analog search scope:** `apps/nestjs-backend/src/features/agent/`, `apps/nestjs-backend/src/features/doc-search/`, `packages/db-main-prisma/`
**Files scanned:** 9 source files read directly
**Pattern extraction date:** 2026-06-14
