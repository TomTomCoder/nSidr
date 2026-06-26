---
phase: 15
slug: ai-provider-gateway
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-07
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (apps/nestjs-backend) |
| **Config file** | apps/nestjs-backend/vitest.config.ts |
| **Quick run command** | `cd apps/nestjs-backend && npx vitest run src/features/ai` |
| **Full suite command** | `cd apps/nestjs-backend && npx vitest run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (scoped to ai feature)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green + `bash scripts/check-no-direct-ai-sdk.sh` exits 0
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-T1 | 15-01 | 1 | (W0) | T-15-01 | grep guard authored; ai exports verified | smoke | `bash scripts/check-no-direct-ai-sdk.sh` | ❌ W0 | ⬜ pending |
| 15-01-T2 | 15-01 | 1 | GW-05, GW-04 | T-15-01 | per-model apiKey stripped from public schema | unit/build | `yarn workspace @teable/openapi build` | ❌ W0 | ⬜ pending |
| 15-01-T3 | 15-01 | 1 | GW-05, GW-04 | T-15-02, T-15-05 | cascade fail-loud names model; embed routes via gateway | unit | `npx vitest run src/features/ai/ai.service.spec.ts` | ❌ W0 | ⬜ pending |
| 15-02-T1 | 15-02 | 2 | GW-04 | T-15-03, T-15-05 | embeddings via gateway; no env/openai fallback | unit | `npx vitest run src/features/ai/unified-ai.service.spec.ts` | ✅ extend | ⬜ pending |
| 15-03-T1 | 15-03 | 2 | GW-02, GW-03 | T-15-04 | ollama /api/tags proxy; SSRF reject; modality flags | unit | `npx vitest run src/features/setting/setting.service.spec.ts` | ✅ extend | ⬜ pending |
| 15-03-T2 | 15-03 | 2 | GW-03, GW-04, GW-05 | T-15-01 | install link, inline override, embedding picker | typecheck | `yarn workspace @teable/nextjs-app typecheck` | ✅ extend | ⬜ pending |
| 15-03-T3 | 15-03 | 2 | GW-02/03/04/05 | T-15-01, T-15-04 | UI verified (human) | human-verify | manual UAT script | — | ⬜ pending |
| 15-04-T1 | 15-04 | 3 | GW-01, GW-04 | T-15-06 | text-gen routes via gateway; no @ai-sdk import | unit | `npx vitest run src/features/setting/open-api/setting-open-api.service.spec.ts` | ✅ extend | ⬜ pending |
| 15-04-T2 | 15-04 | 3 | GW-01, GW-04 | T-15-06 | image-gen routes via gateway; dispatch flag asserted | unit | `npx vitest run src/features/setting/open-api/setting-open-api.service.spec.ts` | ✅ extend | ⬜ pending |
| 15-05-T1 | 15-05 | 4 | GW-01, GW-04 | T-15-06, T-15-07 | agent model via gateway; value-import DI | unit | `npx vitest run src/features/agent/agent-execution.service.spec.ts` | ✅ extend | ⬜ pending |
| 15-05-T2 | 15-05 | 4 | GW-01, GW-04 | T-15-06 | [BLOCKING] no provider SDK outside features/ai/ | smoke | `bash scripts/check-no-direct-ai-sdk.sh` | ✅ (Plan01) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements (created in Plan 15-01)

- [ ] `scripts/check-no-direct-ai-sdk.sh` — grep guard for D-15-06 exit criterion
- [ ] `ai` package export verification (`embedMany` present, Assumption A1)
- [ ] Cascade test stubs in `ai.service.spec.ts`: "cascade: model override wins", "cascade: provider default used when no override", "cascade: fail loud names model"
- [ ] Embedding-routing test fixture (`llmProviders[]` with provider key + model-level override)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ollama local model answers without cloud key | GW-03 | Requires a running Ollama daemon + pulled model | Boot app, select Ollama model, send prompt |
| Inline per-model override saves + persists; key absent from public GET | GW-05 | Visual + network-tab inspection | Plan 15-03 Task 3 checkpoint script |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 15-01)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned (executor fills Status column during execution)
