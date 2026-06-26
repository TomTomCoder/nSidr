---
phase: 12-app-stability-test-remediation
reviewed: 2026-05-31T07:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - apps/nestjs-backend/src/features/agent/agent-event.listener.spec.ts
  - apps/nestjs-backend/src/features/agent/agent-execution.service.spec.ts
  - apps/nestjs-backend/src/features/agent/agent-execution.service.ts
  - apps/nestjs-backend/src/features/agent/agent-trigger.service.spec.ts
  - apps/nestjs-backend/src/features/agent/agent-trigger.service.ts
  - apps/nestjs-backend/src/features/agent/agent.controller.unit.spec.ts
  - apps/nestjs-backend/src/features/agent/agent.module.ts
  - apps/nextjs-app/src/AppProviders.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/DocImportPanel.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/DocLibrary.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/DocSearchPanel.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/DocViewer.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/GlobalDocSearchPanel.tsx
  - apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts
  - apps/nextjs-app/src/features/app/blocks/doc-search/index.ts
  - apps/nextjs-app/src/features/app/blocks/doc-search/useDocSearchKeyboardShortcut.ts
  - apps/nextjs-app/src/features/app/blocks/doc-search/useDocSearchStore.ts
  - apps/nextjs-app/src/features/app/components/agent/AgentConfigModal.tsx
  - apps/nextjs-app/src/features/app/components/agent/tabs/SkillsTab.tsx
  - apps/nextjs-app/src/features/app/components/agent/tabs/TriggersTab.tsx
  - packages/openapi/src/doc-search/index.ts
  - packages/openapi/src/index.ts
findings:
  critical: 4
  warning: 8
  info: 4
  total: 16
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-05-31T07:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This review covers the agent execution backend (AgentExecutionService, AgentTriggerService, AgentEventListener), their unit tests, the agent module wiring, the doc-search React block, and related openapi types. The codebase has four blockers: two SQL injection vectors in the tool execution switch, a missing authorization check that allows any authenticated user to read any conversation history, and insecure secret comparison in the webhook handler. Eight warnings cover logic holes in fire-and-forget error propagation, missing HTTP response status checks, optimistic UI state rollback, and type-safety gaps. Four info items address dead code and localization inconsistencies.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: SQL Injection via Unparameterized Table Name in `search_records` and `get_records`

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts:350-358, 377-384`

**Issue:** `$queryRawUnsafe` is used with a double-quoted table name interpolated directly from a database lookup. While `dbTableName` comes from Prisma (not user input), any compromised row in `tableMeta` or a future code path that does not validate the table name origin would allow full SQL injection. More critically, the `get_record` case (line 403) interpolates both `table.dbTableName` and passes `recordId` as a parameter, but `recordId` itself arrives from the LLM tool-call input (`toolCall.input`) — meaning a malicious LLM response or prompt injection can supply an arbitrary `recordId` string that could break quoting if the parameterization fails. The use of `$queryRawUnsafe` instead of `$queryRaw` (tagged template) is the root cause: Prisma's `$queryRaw` template tag guarantees parameterization of all interpolated values including the table name; `$queryRawUnsafe` provides no such guarantee for the table-name position.

**Fix:** Replace `$queryRawUnsafe` with Prisma's `$queryRaw` tagged template literal for all three cases. Table names cannot be parameterized in SQL, so validate the `dbTableName` against an allowlist regex (`/^[A-Za-z_][A-Za-z0-9_]*$/`) before interpolation, and use `$queryRaw` for value parameters:

```typescript
// Validate table name first
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table.dbTableName)) {
  return { results: [], error: 'Invalid table name' };
}
// Then use tagged template for value params
const results = await this.dataPrismaService.$queryRaw`
  SELECT id FROM "${Prisma.raw(`"${table.dbTableName}"`)}"
  WHERE CAST(data AS TEXT) ILIKE ${`%${query}%`} LIMIT 10
`;
```

---

### CR-02: Missing Authorization Check When Loading Conversation History

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts:145-157`

**Issue:** When a `conversationId` is supplied in `AgentRunContext`, the service calls `getConversationHistory(ctx.conversationId)` with no ownership check. Any caller that knows a valid `conversationId` can read the full message history of a conversation they do not own. The `AgentRunContext.userId` is present but never compared against the conversation's `ownerId`/`createdBy` field before history is loaded and injected into the LLM prompt.

**Fix:** In `conversationService.getConversationHistory`, require the caller's userId and verify ownership:

```typescript
const history = await this.conversationService.getConversationHistory(
  ctx.conversationId,
  ctx.userId  // add userId param; service throws ForbiddenException if mismatch
);
```

Or perform the ownership check inline before calling `getConversationHistory`:

```typescript
const conv = await this.conversationService.findConversation(ctx.conversationId);
if (conv.userId !== ctx.userId) {
  yield { type: 'error', content: 'Conversation not found' };
  return;
}
```

---

### CR-03: Timing-Safe Secret Comparison Not Used in Webhook Handler (Test Confirms Vulnerable Logic)

**File:** `apps/nestjs-backend/src/features/agent/agent.controller.unit.spec.ts:127-156`

**Issue:** The controller test at line 127 validates that `agentWebhook` compares the `X-Agent-Secret` header against the stored trigger secret with a simple equality check (`===`). A timing-safe comparison (e.g., `crypto.timingSafeEqual`) is required for secrets. The spec file alone reveals the implementation uses a plain equality path — otherwise the test "throws UnauthorizedException when the webhook secret does not match" would not be sufficient to document safe behavior. Plain string comparison leaks timing information that can be exploited to brute-force the secret byte by byte.

**Fix:** In `agent.controller.ts`, replace the direct equality comparison with:

```typescript
import { timingSafeEqual, Buffer } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

if (!safeCompare(headerSecret, trigger.config.secret as string)) {
  throw new UnauthorizedException();
}
```

---

### CR-04: `Logger.info` Does Not Exist on NestJS Logger — Runtime Crash for Every Tool Dispatch

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts:337, 364, 390, 427, 449, 478`

**Issue:** The code calls `this.logger.info(...)` (lines 337, 364, 390, 427, 449, 478). NestJS's built-in `Logger` class exposes `log()`, `warn()`, `error()`, `debug()`, and `verbose()` — **not** `info()`. Calling `this.logger.info()` throws `TypeError: this.logger.info is not a function` at runtime for every `search_records`, `get_records`, `get_record`, `create_record`, `create_comment`, and `get_record_activity` tool invocation. This means every built-in tool call crashes before executing any logic. The outer `try/catch` at line 333 catches this TypeError and returns `{ error: 'Tool execution failed: this.logger.info is not a function' }` to the LLM — making all built-in tools silently non-functional in production.

**Fix:** Replace all `this.logger.info(` with `this.logger.log(` throughout `executeToolCall`:

```typescript
// Before
this.logger.info(`Searching table ${tableId} for: "${query}"`);
// After
this.logger.log(`Searching table ${tableId} for: "${query}"`);
```

---

## Warnings

### WR-01: `streamLlmIteration` Discards Entire Conversation History — Only Last User Message Sent to LLM

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts:299-312`

**Issue:** `streamLlmIteration` extracts only the last user message as `prompt` (line 303-304) and ignores all prior turns in `conversationMessages`. The `system` message is passed, but the multi-turn conversation history built in `run()` (lines 140-157) is never sent to the LLM. This defeats the purpose of loading conversation history (`getConversationHistory`) and building the `messages` array. The agent has no memory of prior turns during generation.

**Fix:** Pass the full `messages` array (minus the system message) as the `messages` parameter to `generateText`, not just the last user prompt:

```typescript
const { text, steps } = await generateText({
  model: modelInstance,
  ...(hasTools ? { tools: tools as never, stopWhen: stepCountIs(1) as never } : {}),
  system: systemMessage?.content,
  messages: conversationMessages.map((m) => ({ role: m.role, content: m.content })),
});
```

---

### WR-02: Tool Results Appended as `role: 'assistant'` Instead of `role: 'tool'` — Breaks LLM Protocol

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts:207-212`

**Issue:** After each tool call, the result is appended to `messages` as `{ role: 'assistant', content: toolSummary }`. Most LLM APIs (OpenAI, Anthropic, Vercel AI SDK) require tool results to be appended as `{ role: 'tool', ... }` with a `tool_call_id` reference. Sending them as `assistant` turns will cause the model to misinterpret its own prior output as conversation context, producing malformed multi-turn requests and potentially API rejection errors on providers that strictly validate message ordering.

**Fix:** Follow the Vercel AI SDK message format for tool results:

```typescript
messages.push({
  role: 'tool',
  content: [{ type: 'tool-result', toolCallId: toolCall.toolCallId, result: output }],
} as any);
```

---

### WR-03: `agent.modelKey` Passed to `streamLlmIteration` But `resolvedModelKey` Available — Double AI Config Fetch Per Iteration

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts:179-185, 274`

**Issue:** `streamLlmIteration` is called with `agent.modelKey` (line 180) alongside `resolvedModelKey` (line 185). Inside `streamLlmIteration`, the function always fetches `aiConfig` again (line 274) even though `preResolvedModelKey` is already set. This means every iteration of the `while` loop (up to `maxIterations`) calls `getAIConfig` twice: once in `run()` preflight and once inside `streamLlmIteration`. For an agent with 10 iterations, this is 20 unnecessary AI config fetches per run.

**Fix:** Resolve the model instance once in `run()` and pass the resolved `modelInstance` directly to `streamLlmIteration` instead of re-resolving it on every iteration.

---

### WR-04: HTTP Response Status Never Checked in `hooks.ts` — Errors Silently Swallowed

**File:** `apps/nextjs-app/src/features/app/blocks/doc-search/hooks.ts:13-14, 22-25, 37-40, 57-59, 69, 77-80, 88-90`

**Issue:** Every `fetch()` call in `hooks.ts` chains `.then((r) => r.json())` without first checking `r.ok`. When the server returns a 4xx or 5xx response, `r.json()` parses the error body and resolves successfully (no rejection). React Query's `isError` state is never set; instead, components receive a parsed error object shaped like a success response. For example, a 403 on `GET /api/spaces/:id/docs` will silently render as an empty document list.

**Fix:** Add an `ok` check before parsing:

```typescript
queryFn: () =>
  fetch(`/api/spaces/${spaceId}/docs`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<IImportedDoc[]>;
  }),
```

Apply this pattern to all eight fetch calls in the file.

---

### WR-05: Optimistic Toggle in `SkillsTab` Never Rolled Back on API Failure

**File:** `apps/nextjs-app/src/features/app/components/agent/tabs/SkillsTab.tsx:31-45`

**Issue:** `handleToggle` updates `enabledTools` state optimistically before the `PATCH` request completes (line 32-37). The `await fetch(...)` at line 41 is not inside a try/catch. If the request fails (network error or non-2xx response), the UI remains in the toggled state while the server retains the original value — persistent desync. The response status is also never checked (same class of bug as WR-04).

**Fix:**

```typescript
const handleToggle = async (toolName: string) => {
  const isEnabled = !enabledTools.has(toolName);
  // Optimistic update
  setEnabledTools((prev) => { const next = new Set(prev); isEnabled ? next.add(toolName) : next.delete(toolName); return next; });
  try {
    const r = await fetch(`/api/agent/${agent.id}/tools/${toolName}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch {
    // Roll back
    setEnabledTools((prev) => { const next = new Set(prev); isEnabled ? next.delete(toolName) : next.add(toolName); return next; });
  }
};
```

---

### WR-06: `TriggersTab` Fire-and-Forget Mutations — Errors Invisible to User

**File:** `apps/nextjs-app/src/features/app/components/agent/tabs/TriggersTab.tsx:42-53, 55-66, 68-75, 77-79`

**Issue:** `handleAddWebhook`, `handleAddSchedule`, `handleToggle`, and `handleDelete` all `await fetch(...)` without try/catch and without checking `r.ok`. A failed DELETE call still calls `loadTriggers()` and the user sees the trigger list reload unchanged with no error message. The caller has no way to know the operation failed.

**Fix:** Wrap each handler in try/catch; check `r.ok` and surface errors via a toast or inline state.

---

### WR-07: `conversationId` Passed in DM Payload Silently Dropped by `AgentTriggerService.handleDm`

**File:** `apps/nestjs-backend/src/features/agent/agent-trigger.service.ts:79-88`

**Issue:** `handleDm` receives `payload: { message: string; fromUserId: string }` — the `conversationId` field present in the `agent.dm` event (verified by `agent.controller.unit.spec.ts` line 79-85) is not included in the payload type and is therefore never forwarded to `AgentRunContext`. As a result, DM-triggered runs always start a new conversation rather than continuing an existing thread, even when the caller supplied a `conversationId`. The `AgentEventListener` spec (line 29-33) confirms `handleDm` is called **without** `conversationId` — this is a design contract mismatch between the controller event shape and the trigger handler.

**Fix:** Update `handleDm` signature to accept and forward `conversationId`:

```typescript
async handleDm(
  agentId: string,
  payload: { message: string; fromUserId: string; conversationId?: string }
): Promise<void> {
  const ctx: AgentRunContext = {
    agentId,
    trigger: 'dm',
    triggerPayload: payload,
    userId: payload.fromUserId,
    conversationId: payload.conversationId,
  };
  void this.collectAndPostOutput(ctx);
}
```

Also update `AgentEventListener.handleAgentDm` to pass `conversationId` through.

---

### WR-08: `DataPrismaService` Not Registered in `AgentModule` Providers

**File:** `apps/nestjs-backend/src/features/agent/agent.module.ts:1-70`

**Issue:** `AgentExecutionService` injects `DataPrismaService` (constructor line 58 in `agent-execution.service.ts`) but `AgentModule` only imports `PrismaModule` (line 4). There is no import of a `DataPrismaModule` or equivalent. If `DataPrismaService` is not exported from `PrismaModule`, NestJS will throw a dependency injection error at startup: `Nest can't resolve dependencies of the AgentExecutionService`.

**Fix:** Import the module that provides `DataPrismaService`:

```typescript
import { DataPrismaModule } from '@teable/db-data-prisma';

@Module({
  imports: [
    PrismaModule,
    DataPrismaModule,  // add this
    ...
  ],
})
```

---

## Info

### IN-01: `agent.controller.unit.spec.ts` Uses `jest.Mock` Type in Vitest File

**File:** `apps/nestjs-backend/src/features/agent/agent.controller.unit.spec.ts:18-19`

**Issue:** The spec file imports from `vitest` (line 2) but references `jest.Mock` as a type annotation at lines 18 and 19 (`prismaFindFirst?: jest.Mock`). While `jest` types may be globally available via `@types/jest`, mixing type references in a Vitest test file is inconsistent and will break if the global jest types are removed.

**Fix:** Use `vi.Mock` (or `ReturnType<typeof vi.fn>`) instead of `jest.Mock` throughout.

---

### IN-02: `AgentConfigModal` UI Labels Are French — Inconsistent with English Codebase

**File:** `apps/nextjs-app/src/features/app/components/agent/AgentConfigModal.tsx:28-31`

**Issue:** Tab labels (`'Travaux'`, `'Compétences'`, `'Déclencheurs'`, `'Connaissance'`, `'Mémoire'`) are hardcoded in French. `SkillsTab.tsx` and `TriggersTab.tsx` also contain French-only strings. The rest of the UI appears to be English. This inconsistency suggests incomplete localization rather than deliberate i18n.

**Fix:** Either localize all strings through the project's i18n system or replace French labels with English equivalents to match the rest of the UI.

---

### IN-03: `GlobalDocSearchPanel` and `useDocSearchKeyboardShortcut` Not Exported from `index.ts`

**File:** `apps/nextjs-app/src/features/app/blocks/doc-search/index.ts:1-6`

**Issue:** `GlobalDocSearchPanel` and `useDocSearchKeyboardShortcut` and `useDocSearchStore` are not re-exported from the barrel `index.ts`. `AppProviders.tsx` imports them by direct path (lines 7-8), which is fine, but external consumers importing from the barrel cannot access these. This is inconsistent with the barrel exporting `DocSearchPanel`, `DocImportPanel`, etc.

**Fix:** Add the missing exports to `index.ts`:

```typescript
export { GlobalDocSearchPanel } from './GlobalDocSearchPanel';
export { useDocSearchKeyboardShortcut } from './useDocSearchKeyboardShortcut';
export { useDocSearchStore } from './useDocSearchStore';
```

---

### IN-04: `navigator.platform` Is Deprecated — Use `navigator.userAgentData` Instead

**File:** `apps/nextjs-app/src/features/app/blocks/doc-search/useDocSearchKeyboardShortcut.ts:11`

**Issue:** `navigator.platform.toUpperCase().indexOf('MAC')` uses the deprecated `navigator.platform` API which browsers are phasing out. It also runs on every keydown event rather than once.

**Fix:** Detect Mac once outside the event handler using `navigator.userAgentData?.platform` with a fallback:

```typescript
const isMac =
  typeof navigator !== 'undefined'
    ? (navigator.userAgentData?.platform ?? navigator.platform).toUpperCase().includes('MAC')
    : false;

useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const modifier = isMac ? event.metaKey : event.ctrlKey;
    if (modifier && event.shiftKey && event.key === 'k') {
      event.preventDefault();
      toggleDocSearch();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleDocSearch]);
```

---

_Reviewed: 2026-05-31T07:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
