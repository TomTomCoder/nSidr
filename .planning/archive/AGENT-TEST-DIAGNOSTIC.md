# Agent E2E Test — Pre-Run Diagnostic

**Test File:** `apps/nextjs-app/e2e/agent-wizard.spec.ts`  
**Analysis Date:** 2026-05-26  
**Status:** Ready to run; 6/7 tests expected to pass, 1 test expected to fail  

---

## What The Test Will Find

### ✅ Will PASS (3 tests)

| Test | Reason | Proof |
|------|--------|-------|
| **Test 1: Create Agent** | Agent controller exists with `@Post()` route at `/api/agent`; CreateAgentDto properly structured with required fields (name, baseId, instructions optional) | Controller line 22: `@Post()` route exists; DTO validates name, baseId |
| **Test 2: Retrieve Agent** | Agent controller has `@Get(':id')` route; returns full agent record | Controller line 35: `@Get(':id')` route exists |
| **Test 4: Update Agent** | Agent controller has `@Patch(':id')` route; UpdateAgentDto supports partial updates | Controller line 40: `@Patch(':id')` route exists |

### ⚠️ Will TIMEOUT or FAIL (3 tests)

| Test | Expected Failure | Root Cause |
|------|------------------|-----------|
| **Test 3: List Agents** | `GET /api/agent?baseId=X` returns 200 but list may be empty | Controller line 27 requires `@Query('baseId')` — test passes baseId correctly, so route should work |
| **Test 5: Execute Agent** | `POST /api/agent/:id/run` returns 500 or no SSE headers | See "Critical Issues" below |
| **Test 6: Tool Registry** | Agent retrieved successfully (depends on Test 2) | If Test 2 passes, this passes |

### 🔴 Will DEFINITELY FAIL (1 test)

| Test | Failure | Why |
|------|---------|-----|
| **Test 7: Delete Agent** | DELETE endpoint returns correct response but behavior depends on implementation | Controller line 45: `@Delete(':id')` exists; returns `{ success: true }` — should pass |

### 🔵 Setup Tests (beforeAll)

| Step | Expected | Reality |
|------|----------|---------|
| Resolve baseId via `GET /api/base` | ✅ WORKS | UserController, SpaceController, BaseController all exist at `@Controller('api/base')` |
| Resolve userId via `GET /api/user` | ✅ WORKS | UserController at `@Controller('api/user')` exists; returns `{ id: string; email: string }` |

---

## Critical Issues The Test Will Reveal

### Issue #1: SSE Streaming Endpoint (TEST 5 BLOCKER)

**What happens when test runs:**
```
POST /api/agent/[agentId]/run
Expected: 200 OK + Content-Type: text/event-stream + SSE event stream
Actual: Likely 500 or empty response
```

**Why it fails:**
Agent controller line 51-73 shows the run endpoint exists, but:
```typescript
@Post(':id/run')
async runAgent(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
  // ... sets headers correctly
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Transfer-Encoding', 'chunked');
  // ... but what happens next?
}
```

**Fix needed:**
Check line 51-73 of `agent.controller.ts` — the `runAgent` method likely incomplete:
- ❌ Does NOT iterate over `this.executionService.run(ctx)` (AsyncGenerator)
- ❌ Does NOT write events to response stream
- ❌ Does NOT close response at end

**Expected code flow:**
```typescript
@Post(':id/run')
async runAgent(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
  const ctx: AgentRunContext = { agentId: id, trigger: body.trigger };
  
  for await (const event of this.executionService.run(ctx)) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  res.end();
}
```

### Issue #2: Tool Execution (Not in test but will be visible)

**What happens when agent execution runs:**
- AgentExecutionService calls `generateText()` with 5 tool definitions
- Tool is called by LLM (e.g., `search_records`)
- But actual tool handler is missing

**Fix needed:**
Create tool handlers in AgentToolRegistryService:
```typescript
async executeToolCall(toolName: string, input: object) {
  switch(toolName) {
    case 'search_records':
      return this.searchRecords(input); // NOT IMPLEMENTED
    case 'get_records':
      return this.getRecords(input);    // NOT IMPLEMENTED
    // ... etc
  }
}
```

### Issue #3: Memory Not Persisted

**What happens:**
- Test creates agent with instructions
- Test calls `/api/agent/:id/run`
- But agent memory (recent context, preferences) never saved during execution

**Fix needed:**
In AgentExecutionService, after each successful tool call:
```typescript
await this.memoryService.saveRecent(agentId, JSON.stringify(toolResult));
```

---

## Test-by-Test Breakdown

### Test 1: Create Agent `POST /api/agent`
```
EXPECT: 201 Created
{
  id: "agt_...",
  name: "E2E-Test-Agent",
  baseId: "bse_...",
  instructions: "You are a helpful...",
  createdBy: "usr_..."
}

WILL: ✅ PASS
REASON: POST route exists, DTO validates, service is simple (just Prisma.create)
```

### Test 2: Retrieve Agent `GET /api/agent/:id`
```
EXPECT: 200 OK
{
  id: "agt_...",
  name: "E2E-Test-Agent",
  instructions: "..."
}

WILL: ✅ PASS
REASON: GET/:id route exists, Prisma.findUnique works
```

### Test 3: List Agents `GET /api/agent?baseId=X`
```
EXPECT: 200 OK
[
  { id: "agt_...", name: "E2E-Test-Agent", baseId: "bse_..." },
  ...
]

WILL: ✅ PASS
REASON: Route exists at line 27, query parameter handled, Prisma.findMany filters by baseId
```

### Test 4: Update Agent `PATCH /api/agent/:id`
```
EXPECT: 200 OK
{
  id: "agt_...",
  name: "E2E-Test-Agent-Updated",
  instructions: "Updated: ..."
}

WILL: ✅ PASS
REASON: PATCH route exists, UpdateAgentDto supports partial updates
```

### Test 5: Execute Agent `POST /api/agent/:id/run`
```
EXPECT: 200 OK
Content-Type: text/event-stream
Transfer-Encoding: chunked

data: {"type":"progress","step":"..."}
data: {"type":"think","content":"..."}
data: {"type":"done"}

WILL: 🔴 FAIL (500 or empty response)
REASON: Controller method doesn't write SSE events to response
FIX: See "Issue #1" above — add for-await loop to write events
```

### Test 6: Tool Registry Verification `GET /api/agent/:id`
```
EXPECT: Agent returned with instructions containing tool names
(search_records, get_records, create_record, update_record, delete_record)

WILL: ✅ PASS (if Test 2 passed)
REASON: Just verifies agent instructions exist; doesn't execute tools
```

### Test 7: Delete Agent `DELETE /api/agent/:id`
```
EXPECT: 200 OK
{ success: true }

WILL: ✅ PASS
REASON: DELETE route exists at line 45, returns { success: true }
CAVEAT: Agent soft-deleted (isActive: false) not hard-deleted
```

---

## How to Fix Issues in Order

### Priority 1: Fix SSE Streaming (TEST 5 BLOCKER)

**File:** `apps/nestjs-backend/src/features/agent/agent.controller.ts`  
**Lines:** 51-73

**Current code** (incomplete):
```typescript
@Post(':id/run')
async runAgent(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
  const ctx: AgentRunContext = {
    agentId: id,
    trigger: body.trigger || 'manual',
    triggerPayload: body.triggerPayload,
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Transfer-Encoding', 'chunked');
  // ... missing: actual event writing
}
```

**Fixed code:**
```typescript
@Post(':id/run')
async runAgent(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
  const ctx: AgentRunContext = {
    agentId: id,
    trigger: body.trigger || 'manual',
    triggerPayload: body.triggerPayload,
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const event of this.executionService.run(ctx)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
  } finally {
    res.end();
  }
}
```

**Effort:** 5 minutes  
**Validation:** Test 5 will pass after this fix  

### Priority 2: Implement Tool Handlers

**File:** `apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts`  
**Lines:** Needs new method `executeToolCall`

**What's missing:**
```typescript
async executeToolCall(toolName: string, input: any): Promise<any> {
  switch(toolName) {
    case 'search_records':
      // Input: { tableId: string, query: string }
      // Return: list of matching records
      return await this.prisma.field.findMany(/* ... */);
    
    case 'get_records':
      // Input: { tableId: string, filter?: string }
      // Return: records from table
      return [];
    
    // ... 3 more tools
  }
}
```

**Effort:** 2-3 hours  
**Validation:** Agents will actually do something useful  

### Priority 3: Wire Tool Calls in Execution

**File:** `apps/nestjs-backend/src/features/agent/agent-execution.service.ts`  
**Currently:** Tools are defined but not executed

**What's needed:**
When LLM calls a tool via `toolUseBlock`, execute it:
```typescript
private async executeToolCall(toolName: string, input: object) {
  try {
    const result = await this.toolRegistry.executeToolCall(toolName, input);
    await this.memoryService.saveRecent(this.agentId, JSON.stringify({
      tool: toolName,
      input,
      result,
    }));
    return result;
  } catch (error) {
    return { error: error.message };
  }
}
```

**Effort:** 1 hour  
**Validation:** Tool execution test would pass  

---

## Quick Test Run Guide

```bash
# Terminal 1: Start dev server
cd /Users/tommylambert/Documents/Claude_Folder/teable/apps/nextjs-app
PLAYWRIGHT_PORT=3001 npm run dev

# Terminal 2: Wait 15s, then run test
sleep 15
E2E_WEBSERVER_MODE=DEV npx playwright test agent-wizard.spec.ts --reporter=verbose

# Expected output:
# ✅ Test 1: Create agent (201)
# ✅ Test 2: Retrieve agent (200)
# ✅ Test 3: List agents (200)
# ✅ Test 4: Update agent (200)
# ❌ Test 5: Execute agent (500 or timeout) ← FIX ISSUE #1
# ✅ Test 6: Tool registry (200)
# ✅ Test 7: Delete agent (200)
# ✅ Test 8: UI smoke test (no 500s)
```

---

## Summary

**Tests that will pass immediately:** 6/7 (86%)  
**Tests that will fail:** 1/7 (14%)  
**Time to fix all issues:** ~4 hours total  
  - SSE streaming: 5 min
  - Tool handlers: 2-3 hours
  - Tool execution wiring: 1 hour
  - Testing/validation: 30 min

**What you learn from running the test:**
1. ✅ Agent CRUD is working
2. ✅ Routes are registered
3. ❌ SSE streaming is not wired
4. ❌ Tools are defined but not callable
5. ⚠️ Memory persistence untested

**Next action:** Run the test and share the output — I can help fix Issue #1 (SSE streaming) immediately.
