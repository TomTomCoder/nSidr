---
phase: 24
slug: agent-runtime-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-14
audited: 2026-06-14
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.17 (apps/nestjs-backend) |
| **Config file** | apps/nestjs-backend/vitest.config.ts |
| **Quick run command** | `pnpm --filter nestjs-backend test-unit -- --bail 1` |
| **Full suite command** | `pnpm --filter nestjs-backend test-unit` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run scoped to touched feature
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Wave 0 Gaps (files that must be created before tests can run)

- [x] `src/features/agent/agent-guardrail.service.spec.ts` — ARH-02 validation logic (CREATED, 5/5 green)
- [x] `src/features/agent/oauth/gmail-oauth.service.spec.ts` — ARH-04 per-user fallback (CREATED, 4/4 green)
- [x] `src/features/doc-search/knowledge-doc.service.spec.ts` — ARH-05 queue enqueue (CREATED, 12/12 green)

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| ARH-01 | Failover triggers on 429, retries fallback model | unit | `npx vitest run src/features/agent/agent-execution.service.spec.ts` | YES | green |
| ARH-01 | Failover does NOT trigger on 4xx (bad request) | unit | same | YES | green |
| ARH-02 | `create_record` with invalid field returns structured error to LLM | unit | `npx vitest run src/features/agent/agent-guardrail.service.spec.ts` | YES | green |
| ARH-02 | `update_record` with valid fields commits successfully | unit | same | YES | green |
| ARH-03 | HITL tool call sets `waiting_for_approval` status, terminates loop | unit | `npx vitest run src/features/agent/agent-execution.service.spec.ts` | YES | green |
| ARH-03 | Resume via POST approve endpoint restores conversation | unit | `npx vitest run src/features/agent/agent.controller.unit.spec.ts` | YES | green (4/4 approve cases) |
| ARH-04 | `getValidToken` returns user-scoped token when present | unit | `npx vitest run src/features/agent/oauth/gmail-oauth.service.spec.ts` | YES | green |
| ARH-04 | `getValidToken` falls back to agent-level token when no user token | unit | same | YES | green |
| ARH-05 | `createDoc` enqueues BullMQ job immediately | unit | `npx vitest run src/features/doc-search/knowledge-doc.service.spec.ts` | YES | green |
| ARH-05 | `updateDoc` enqueues BullMQ reindex job | unit | same | YES | green |

---

## Nyquist Audit Results (2026-06-14)

**Auditor run:** All 5 spec files verified to exist and executed directly.

### Results

| File | Tests | Outcome |
|------|-------|---------|
| `src/features/doc-search/knowledge-doc.service.spec.ts` | 12/12 | PASS |
| `src/features/agent/oauth/gmail-oauth.service.spec.ts` | 4/4 | PASS |
| `src/features/agent/agent-guardrail.service.spec.ts` | 5/5 | PASS |
| `src/features/agent/agent-execution.service.spec.ts` | 33/33 | PASS |
| `src/features/agent/agent.controller.unit.spec.ts` | 8/9 | PASS (1 pre-existing failure: "null webhook trigger" — unrelated to Phase 24) |

**Overall: 62/63 tests pass. All ARH-01..ARH-05 behavioral requirements covered and green.**

Pre-existing failure (`agentWebhook throws UnauthorizedException when no active webhook trigger exists for the agent`) was present before Phase 24 and is tracked separately. Not a Phase 24 regression.

---

## Security Sampling

| ASVS | Req | Check |
|------|-----|-------|
| V2 Auth | ARH-04 | OAuth token scoped to `(agentId, userId, provider)` — no cross-user access |
| V4 Access Control | ARH-03 | Approve endpoint verifies caller owns conversation (`createdBy === userId`) |
| V5 Input Validation | ARH-02 | `GuardrailService` uses `AbstractField.validateCellValueWithNotNull` as authoritative schema |
| V6 Crypto | ARH-04 | Per-user tokens stored via existing `encryptedToken` path |
