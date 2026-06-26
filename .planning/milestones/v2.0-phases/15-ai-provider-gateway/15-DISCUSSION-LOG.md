# Phase 15: AI Provider Gateway — Discussion Log

_Captured: 2026-06-06 via `/gsd:discuss-phase 15`_

This is a human-reference audit log of the discussion. The canonical decisions are in `15-CONTEXT.md`.

## Pre-discussion context loaded

- `PROJECT.md` Key Decisions row: "v2.0 AI: single gateway (Vercel AI Gateway/OpenRouter) not LiteLLM"
- `ROADMAP.md` Phase 15 table row already says "built; only GW-04 embeddings-routing gap"
- `17-CONTEXT.md` D-02: "use Vercel AI SDK v6 native MCP client support"
- Codebase scout: `ai.service.ts:28` uses `createGateway` from `ai` package; `util.ts` covers 11 providers; `LlmProviderForm.tsx` already exists for UI

## Major finding before any question

Phase 15 was scoped in the ROADMAP narrative as "stand up LiteLLM gateway" — actually most of it is already built using Vercel AI SDK. The original Goal text and the implementation diverged. Discussion focused on the real gaps (3 slices + retrofit) not a rebuild.

## Gray areas identified (4 + retrofit)

1. Gateway tech — keep Vercel AI SDK vs switch to LiteLLM
2. Per-model key override (GW-05) UX
3. Embeddings routing (GW-04) policy
4. Ollama — launch-from-app vs connect-to-existing
5. Retrofit scope (separate question) — agent path only vs all 4 callers

User selected: all four + verify-all-4-callers for retrofit.

---

## Area 1 — Gateway tech

**Question:** Keep Vercel AI SDK gateway or switch to LiteLLM?

**Options presented:**
- Keep Vercel AI SDK (current)
- Switch to LiteLLM (replace)
- Both — Vercel for runtime, LiteLLM as optional logging proxy
- Defer the choice — keep current, revisit if real need surfaces

**Selected:** Defer the choice — keep Vercel AI SDK now, revisit if a real need surfaces

**→ D-15-01 in CONTEXT.md.**

---

## Area 2 — Per-model key override (GW-05) UX

**Q2.1:** Where does user assign API key to a specific model?

**Selected:** Inline in model picker — each model row has an "Override" affordance.

**Q2.2:** Resolution order at call time?

**Selected:** Model override → provider default → fail (no env-var fallback).

**→ D-15-02 + D-15-03 in CONTEXT.md.**

---

## Area 3 — Embeddings routing (GW-04) policy

**Question:** When configured provider doesn't support embeddings, what should happen?

**Options presented:**
- Separate "embedding provider" config alongside chat provider
- Fail loudly — force user to pick embeddings-capable provider
- Keep current silent fallback to direct OpenAI

**User response:** "Choose what's best depending on what's required on the newest architecture."

**Claude's discretion (D-15-04):** Separate embedding provider config.

Rationale recorded in CONTEXT.md D-15-04: Phase 21 (KG write) + Phase 18 (VectorDB RAG) increase embedding load; embeddings are categorically different from chat (cheaper specialised models); industry-standard pattern (LangChain, LlamaIndex, OpenAI Cookbook); removes silent OpenAI fallback (consistent with D-15-03's "no silent switching").

---

## Area 4 — Ollama (GW-03) launch

**Question:** Spawn Ollama process from app, or connect to user-run Ollama?

**Options presented:**
- Connect-to-existing only
- Launch-from-app (full bundling)
- Hybrid — connect-to-existing + "Install Ollama →" docs link

**User response:** "Choose what's best for the newest architecture."

**Claude's discretion (D-15-05):** Hybrid.

Rationale recorded in CONTEXT.md D-15-05: existing `LlmProviderForm.tsx` already has Ollama URL field (connect-to-existing pattern); OOM concerns (project memory) make spawning a 4–16 GB child process risky; Phase 14 chose process separation; cross-platform binary bundling is its own quarter of work; the docs link gives the UX benefit without the engineering cost.

---

## Retrofit scope (parallel question)

**Question:** Verify all 4 callers route through gateway, or agent path only?

**Selected:** Verify all 4 callers.

**→ D-15-06 in CONTEXT.md.**

---

## Deferred ideas (preserved for future phases)

- LiteLLM standalone proxy with logging/cost dashboard (revisit trigger: observability/rate-limit needs)
- Ollama launch-from-app (binary bundling + model pull UI)
- Per-org cost caps, per-model rate limits, request audit log UI
- Cross-provider model fallback resilience

---

## Claude's discretion items flagged for the planner

- Gateway module name (`AiService` vs `AiGatewayService`)
- Gateway API shape (single `complete()` vs richer SDK-mirror)
- UI affordance for "no embedding provider configured" (toast vs disabled state)

## Anti-patterns explicitly forbidden in the plan

- `import type` for any DI-injected service (from Phase 17 bug-1)
- New provider SDK imports outside the gateway module
- Silent fallbacks anywhere in the cascade
