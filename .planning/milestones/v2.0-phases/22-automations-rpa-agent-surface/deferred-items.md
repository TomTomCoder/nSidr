# Phase 22 — Deferred Items

## ✅ RESOLVED (2026-06-13): kg-tools.integration.spec.ts failures (4 cases)

**Fix applied:** Updated the stale fixture in `kg-tools.integration.spec.ts` — the
test `agent` now carries `createdBy: 'usr-owner'` (the owner user the agent writes
as), matching the current `resolveAgentCallerUserId(agent, ctx)` contract
(`ctx.userId ?? agent.createdBy ?? 'system'`). The 4 assertions changed from the
stale `'agt1'` (agent id — never a valid user FK) to `'usr-owner'`. The security
invariants (attacker-supplied `spaceId`/`createdBy`/`callerId` in `toolCall.input`
are ignored) are unchanged and still asserted. **Result: 10/10 tests pass.**

---

## Pre-existing kg-tools.integration.spec.ts failures (4 cases)  — _original note, now resolved above_

**Discovered during:** Plan 22-03 (constructor expansion forced a re-run of this spec)

**Status:** Pre-existing — confirmed by stashing my plan 22-03 changes and re-running the spec against the prior tip (`eda9d90a9`): 4 of 10 tests already fail there. My constructor change is NOT the cause.

**Failing cases (all in `kg-tools.integration.spec.ts`):**
- `create_knowledge_doc > resolves spaceId from base FK and forwards agent.id as createdBy`
- `create_knowledge_doc > IGNORES agent-supplied spaceId in toolCall.input (T-21-16)`
- `update_knowledge_doc > passes resolved callerSpaceId + agent.id (T-21-16)`
- `link_docs > passes resolved callerSpaceId (T-21-16) and forwards label`

**Root cause:** The fixture builds `agent = { id: 'agt1', baseId: 'base1' }` with NO `createdBy`, and `ctx = { agentId, trigger: 'manual' }` with NO `userId`. The dispatcher calls `resolveAgentCallerUserId` which returns `ctx.userId || agent.createdBy || 'system'` → `'system'`. The test asserts `'agt1'`. The test was likely authored against an earlier dispatcher version that forwarded `agent.id`; the production code now (correctly per Phase 21 lesson) forwards a real user id.

**Decision:** Out of scope for Phase 22 — the production invariant (security: never trust `toolCall.input.spaceId`) is still asserted by `spaceId` checks in the same tests, which DO pass. The `createdBy` assertion is testing a stale contract.

**Recommended fix (future plan):** Update the fixture to set `agent.createdBy = 'usr-fixture'` and assert `createdBy: 'usr-fixture'`. Or update the test to set `ctx.userId = 'usr-fixture'` and assert against that.

**My ctor change:** I added 2 stub services (`workflowService`, `workflowExecutorService`) at the end of the `new AgentExecutionService(...)` argument list in this spec. This is required for the constructor to accept the new parameters and does not affect any KG behaviour or assertions.
