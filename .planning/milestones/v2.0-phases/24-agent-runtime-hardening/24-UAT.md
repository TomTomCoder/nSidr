---
status: complete
phase: 24-agent-runtime-hardening
source: [24-01-SUMMARY.md, 24-02-SUMMARY.md, 24-03-SUMMARY.md, 24-04-SUMMARY.md, 24-05-SUMMARY.md, 24-06-SUMMARY.md]
started: 2026-06-14
updated: 2026-06-14
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running backend/frontend. Run `pnpm start:local`.
  Backend and frontend boot without errors. `/tmp/teable-backend.log` shows no FATAL or ERROR lines. App accessible at http://localhost:3000.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Backend + frontend restart cleanly with the 2 new schema migrations applied (add_user_id_to_agent_connection, add_approval_to_agent_conversation). No boot errors.
result: pass (2026-06-14) — cold start clean: backend "Nest application successfully started" @ 17:46:16, 0 ERROR/FATAL lines, web:3000=200, api:3002/health=200

### 2. ARH-05 — Doc auto-indexed after agent creation
expected: Create a knowledge doc via an agent (or direct API call to `create_knowledge_doc`). Within ~5 seconds, the doc is returned by `search_knowledge_base` without restarting the server.
result: pass (2026-06-14) — POST /api/spaces/.../docs returned 201 in 27ms; keyword search for marker phrase found doc in 1073ms (well under 5s). docId cmqdz47ga0010sg4yjbk7q05t, score 0.644.

### 3. ARH-04 — Per-user OAuth credential shown in agent OAuth UI
expected: In an agent's OAuth settings, connecting a third-party account (Gmail/Slack/GitHub) as the current user creates a user-scoped credential. A second user who hasn't connected their own account falls back to the agent-level credential (no error).
result: deferred (2026-06-14) — requires OAuth provider client IDs configured in env + 2 users; no agent exists in QA base. Unit/integration tests green per 24-VALIDATION.md.

### 4. ARH-02 — Guardrail blocks invalid field value
expected: Trigger an agent to write an invalid value to a typed field (e.g. text to a number field). Instead of a crash/raw DB error, the agent receives a structured validation error and can self-correct (the run continues rather than dying).
result: deferred (2026-06-14) — guardrail path is exercised only inside the agent runtime's tool handler; no agent exists in QA base + would require live LLM provider key. GuardrailService.spec green per 24-VALIDATION.md (validateWrite covers type mismatch, missing required, unknown field).

### 5. ARH-01 — AI Gateway failover visible in logs
expected: With `fallbackModels` configured in base AI settings, simulate a primary provider failure (e.g. set an invalid API key for the primary). Agent run retries on the fallback model. Backend log shows `warn` entries with "retryable LLM error" and the fallback model key.
result: deferred (2026-06-14) — requires two configured AI provider keys + agent run + simulated failure. Vitest covers gateway retry/fallback path per 24-VALIDATION.md.

### 6. ARH-03 — HITL approval card appears in chat
expected: An agent configured to call `request_human_approval` before a destructive action shows an approval card inline in the chat UI. The card displays the question text. Clicking Approve resumes the run; clicking Reject with a reason closes the conversation.
result: pass — verified separately during 24-06 frontend UAT (commit abdae2d30 "docs(24-06): ARH-03 HITL frontend UAT complete"); requires live agent run for in-session replay.

## Summary

total: 6
passed: 3
issues: 0
pending: 0
deferred: 3
skipped: 0
notes: |
  Tests 1 (cold start), 2 (ARH-05 doc auto-index — verified via API: 1073ms < 5s SLA), and 6 (ARH-03 HITL — verified at 24-06) passed.
  Tests 3 (OAuth), 4 (guardrail), 5 (failover) deferred — each requires a configured agent + live LLM/OAuth credentials not present on dev box. Automated coverage 62/63 green per 24-VALIDATION.md covers the regression surface; recommend in-session UAT against staging post-merge.
