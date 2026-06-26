# Phase 22: Automations / RPA — Agent Surface — Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Mode:** Interactive — 3 decisions captured

<domain>
Expose Teable's existing **workflow** subsystem (the user-facing "automation"
surface) to agents via MCP. AUTO-01 (list + read) + AUTO-02 (trigger with args).
The workflow infrastructure already exists: `WorkflowController` at
`api/base/:baseId/workflow`, `WorkflowService`, `WorkflowExecutorService`
with `executeSteps` covering slack/email/http step types, and a
`POST :workflowId/run` endpoint. Phase 22 wires 3 new MCP tools that delegate
to the existing services — same pattern Phase 17.1 used for interface tools
and Phase 21 used for KG tools.
</domain>

<phase_boundary>
**In scope**
- 3 new MCP tools: `list_workflows`, `get_workflow`, `run_workflow`
- Tool descriptors registered in `agent-tool-registry.service.ts` using
  AI-SDK shape `{type:'function', function:{name, description, parameters}}`
- 3 new dispatch cases in `executeToolCall` switch in `agent-execution.service.ts`
  — inject `WorkflowService` directly (value import, no `import type`)
- RBAC: reuse existing `workflow|read` + `workflow|run` permission decorators'
  semantics via the underlying service methods
- vitest: per-tool unit cases + 1 integration spec mirroring `kg-tools.integration.spec.ts`
- Live UAT: agent calls `list_workflows` → sees workflows in its base;
  agent calls `run_workflow({workflowId, input?})` → response includes run
  status + step results

**Out of scope**
- CRUD on workflows from agents (create / update / delete) — UI does that today
- New workflow step types (e.g. a step that asks the agent for a decision) — future
- Workflow scheduling / cron management from agents — UI does that today
- Per-agent workflow allow-list — RBAC by the underlying permission service is sufficient for v1
- Streaming the workflow run output back through MCP — sync run completes and returns the full result
</phase_boundary>

<decisions>

### D-22-01: 3 tools — list_workflows + get_workflow + run_workflow
Smallest set that satisfies AUTO-01 + AUTO-02. Schemas:

- `list_workflows({baseId})` → `Array<{id, name, isActive, lastModifiedTime}>`. baseId is REQUIRED and the dispatcher MUST resolve it from `agent.baseId`, NEVER from `toolCall.input` (T-21-16 mitigation).
- `get_workflow({workflowId})` → full workflow record incl. `config` (steps JSON). Dispatcher resolves baseId from agent.baseId and verifies workflow belongs to that base; reject cross-base reads with `-32600`.
- `run_workflow({workflowId, input?})` → `{runId?, status, stepResults, error?}`. `input` is the per-run payload merged with workflow's runtime context (e.g. record context for trigger-style workflows). Dispatcher validates same-base; rejects cross-base with `-32600`.

### D-22-02: RBAC — reuse existing workflow permissions via service calls
The dispatchers call `WorkflowService.findAll({baseId})`,
`WorkflowService.findOne(workflowId)`, and `WorkflowExecutorService.runById(workflowId, input)`
(or the closest existing signature). The underlying services already enforce
`workflow|read` / `workflow|run` permissions through Nest guards or CLS-checked
PermissionService calls. The MCP RBAC gate (Phase 17.1 `getEffectiveBaseRole`)
fires first as the baseline.

If a service method doesn't yet enforce permissions (the existing controller
guard does it instead), the planner ADDS a service-level permission check —
the agent path mustn't bypass guards the REST path enforces.

### D-22-03: Wiring — direct WorkflowService injection in agent-execution.service.ts
3 new cases in the `executeToolCall` switch. Inject `WorkflowService` +
`WorkflowExecutorService` via constructor (value imports). No new orchestrator
service. WorkflowModule must export both services (verify in plan — if it
doesn't, add to `exports`).

**Caller user resolution:** Same as Phase 21 — use
`resolveAgentCallerUserId(agent, ctx)` helper (already in
agent-execution.service.ts) for any user-FK column writes (e.g. workflow run
audit log if there is one).

### Claude's discretion (planner picks)
- Whether `list_workflows` filters `isActive=true` by default or returns all
  (recommend: return all; agent can filter by reading `isActive` in the response)
- Response shape for `run_workflow` errors — JSON-RPC error envelope vs typed
  result with `error` field. Recommend typed result (consistent with KG tools
  that return `{error, toolName}` on tool failure)
- Whether to add an "elapsed_ms" timing field to run_workflow response
  (nice-to-have, not required)

</decisions>

<canonical_refs>

### Phase / milestone
- `.planning/ROADMAP.md` — Phase 22 entry
- `.planning/REQUIREMENTS.md` — needs AUTO-01, AUTO-02 added under a new "Automations (AUTO)" section by the planner

### Existing code to extend (not replace)
- `apps/nestjs-backend/src/features/workflow/workflow.service.ts` — CRUD + findOne/findAll
- `apps/nestjs-backend/src/features/workflow/workflow-executor.service.ts` — `executeSteps`, per-step executors (slack/email/http). Run-by-id signature is what the agent run dispatcher needs.
- `apps/nestjs-backend/src/features/workflow/workflow.controller.ts` — `:workflowId/run` POST is the REST baseline; reuse the service the controller calls
- `apps/nestjs-backend/src/features/workflow/workflow.module.ts` — verify exports include both services; add if missing
- `apps/nestjs-backend/src/features/agent/agent-tool-registry.service.ts` — register 3 new tool descriptors (AI-SDK wrapper shape; Phase 17.1 anti-pattern check)
- `apps/nestjs-backend/src/features/agent/agent-execution.service.ts` — add 3 dispatch cases. Already injects `KnowledgeDocService` + `DocLinkService` from Phase 21 — follow the same DI pattern. Use `resolveAgentSpaceId` + `resolveAgentCallerUserId` helpers if needed.
- `apps/nestjs-backend/src/features/agent/mcp/kg-tools.integration.spec.ts` — pattern for the new `workflow-tools.integration.spec.ts`

### Prior-phase lessons (must honour)
- `.planning/phases/17.1-agent-mcp-hardening-live-test-follow-ups/17.1-SUMMARY.md` — MCP tool shape `{type:'function', function:{...}}` (NOT `{name, inputSchema}`), value imports for DI
- `.planning/phases/16-ai-generation-column-polish/16-SUMMARY.md` — runtime circular import via cross-cutting service injection
- `.planning/phases/21-knowledge-graph-write-linking/21-SUMMARY.md` — FK violation when passing agent.id where user.id required; use `resolveAgentCallerUserId`

</canonical_refs>

<code_context>

### Reusable assets
- `WorkflowService.findAll(baseId)` / `findOne(workflowId)` — list + read
- `WorkflowExecutorService.executeSteps` — already exists; planner verifies whether to call this or a higher-level `runById` (whatever the REST `:workflowId/run` controller invokes)
- `registerTeableMcpTools` pattern from Phase 17.1 — pulls `getBuiltInTools()` + interface tools; KG tools were added via the registry merging pattern; workflow tools follow same pattern
- `resolveAgentSpaceId` + `resolveAgentCallerUserId` helpers already in agent-execution.service.ts

### Established patterns
- 3-decision-question phase (matches Phase 17.1, 16, 21) → CONTEXT → 5-7 plans → execute → live UAT → commit
- Every plan: read_first + acceptance_criteria + concrete action
- Grep gates: no `import type` for DI services; no `inputSchema` (Phase 17.1 shape drift); no new `@ai-sdk/*` imports outside ai/

### Anti-patterns to avoid (cumulative)
- ❌ `import type` for `@Injectable` services
- ❌ `{name, description, inputSchema}` shape for MCP tool descriptors (Phase 17.1)
- ❌ Cross-feature-dir circular service injection (Phase 16) — WorkflowService lives in features/workflow/, agent in features/agent/. Workflow doesn't depend on agent → no cycle.
- ❌ Trusting `toolCall.input.baseId` — always resolve from `agent.baseId` (T-21-16)
- ❌ Passing `agent.id` to user-FK columns — use `resolveAgentCallerUserId` (Phase 21 lesson)
- ❌ Skipping live-boot UAT — every prior phase has had ≥1 bug invisible to unit tests

### Live-UAT smoke (after Wave N)
- Boot dev:swc
- `tools/list` should return 23 tools (20 prior + 3 new workflow)
- `tools/call list_workflows` should return real workflow records for the agent's base
- `tools/call run_workflow({workflowId})` should execute and return step results

</code_context>

<deferred_ideas>
- Workflow create/update/delete via agent (full CRUD)
- Per-agent workflow allow-list config
- New "ask agent" workflow step type (workflow calls agent inline)
- Streaming workflow run output through MCP
- Workflow scheduling / cron from agents
- Per-step retry policy via agent (today executor handles it)
</deferred_ideas>

---
_Created: 2026-06-06_
_3 tools, 1 module export update, ~5 commits expected. Smallest of the Wave 1 phases._
