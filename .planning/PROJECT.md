# Teable (Extended)

## What This Is

An open-source, no-code database platform (Airtable-style) extended into a unified
work OS: teams build **Tables** (databases), **Apps & Dashboards** (interfaces),
**Automations** (RPA/workflows), **Integrations** (third-party apps), a **Knowledge
graph** (markdown doc library with semantic search), and **AI Agents** (agentic, with
memory) on top of their data. Built on NestJS + Next.js + PostgreSQL, with a v2 DDD
rewrite (`packages/v2/*`) underway for the record/table core.

## Core Value

Teams can turn their structured data into working software — apps, automations,
knowledge, and AI agents — without leaving one platform. If everything else fails,
**the table/record core must stay correct and stable** (data integrity + realtime).

## Current State

**Milestone v2.0 — AI Integrations: shipped 2026-06-14.** All 10 build phases (15, 16, 17, 17.1, 18, 19, 20, 21, 22, 24) + the UI/UX replatform spike (23) are code-complete, merged, and verified. Automated coverage green across the board (≥45 plan summaries; 62/63 in Phase 24 with one pre-existing unrelated failure). Remaining work is post-merge live UAT against staging requiring provider/OAuth credentials (5 phases human-UAT pending, 3 deferred ARH UAT items in Phase 24) — none block milestone close. See archived `milestones/v2.0-ROADMAP.md`, `milestones/v2.0-REQUIREMENTS.md`, and `v2.0-MILESTONE-AUDIT.md`.

## Next Milestone

No active milestone defined. Run `/gsd-new-milestone` when ready to scope v3.0.

## Requirements

### Validated

<!-- Shipped and confirmed valuable (milestone v1.0, phases 1–13). -->

- ✓ Authority matrix (RBAC) — DB + API + UI — Phase 1
- ✓ Prompt system — Phase 2
- ✓ DB/code performance hardening — Phase 3
- ✓ Super-agent system (agentic, with memory) — Phase 4 / 11
- ✓ Gantt view (timeline, dependencies, critical path) — Phase 5
- ✓ OAuth2 integration library (Google suite, Slack) — Phase 6
- ✓ Doc import + pgvector semantic search + link graph (knowledge base) — Phase 7
- ✓ Company onboarding — Phase 8
- ✓ UI/feature testing pass — Phase 9
- ✓ Unified AI assistant (chat sidebar, SSE streaming, proposals) — Phase 10
- ✓ App stability / test remediation — Phase 12
- ✓ Doc library redesign (folder tree, markdown-aware chunking, RRF hybrid search, per-doc progress) — Phase 13
  (hardened 2026-06-04: boot-OOM root cause fixed, ingest worker decoupling, chunking + RRF — see `apps/nestjs-backend/DOC-LIBRARY-INVESTIGATION.md`)
- ✓ Process separation — NestJS API and Next.js run as distinct processes (no shared-heap OOM / GC stalls) — Phase 14 (verified live 2026-06-04)

### Active

<!-- Current scope: milestone v2.0 "AI Integrations" (phases 15–20). See REQUIREMENTS.md / ROADMAP.md. -->

- [ ] **GW-01..04** AI provider gateway (LiteLLM): per-provider keys, modality-filtered model catalog, Ollama — Phase 15
- [ ] **AICOL-01..03** AI-generation column (output typology) — Phase 16
- [ ] **AGENT-01..05** Agent MCP enhancement: interfaces + plugins + selected-doc knowledge + memory — Phase 17
- [ ] **EXTDB-01..02** External DB connectors (VectorDB-RAG + Postgres-federated) — Phase 18
- [ ] **EXT-01..02** OpenClaw/ClawHub-style extension system (MCP) — Phase 19
- [ ] **UI-01..02** AI-surface UI simplification — Phase 20

### Out of Scope

<!-- v1.0 boundaries. v2.0 vision captured in .planning/MILESTONE-CONTEXT.md. -->

- AI provider gateway / LLM library (multi-provider + modality search) — **shipped v2.0 (Phase 15)**
- Per-provider AI keys, Ollama/LM Studio in-app — **shipped v2.0 (Phase 15)**
- AI-generation column (output-typology field type) — **shipped v2.0 (Phase 16)**
- External DB connectors (VectorDB-for-RAG, Postgres federated) — **shipped v2.0 (Phase 18)**
- OpenClaw-style extension marketplace — **shipped v2.0 (Phase 19, MCP-capable plugins)**
- Full ground-up UI rebuild — explicitly rejected; Phase 23 spike confirmed Option A (incremental polish)

## Context

- Brownfield: large existing codebase (`apps/nestjs-backend`, `apps/nextjs-app`,
  `packages/*`, `packages/v2/*`). GSD scaffold was partial — this PROJECT.md was
  reconstructed 2026-06-04 from ROADMAP.md, STATE.md, and the phase history.
- Known issue: the v2 container startup is memory-heavy (bounded, not leaking).
  `V2_COMPUTED_UPDATE_MODE=sync` caused a boot-OOM (fixed); heap headroom pinned.
  See `apps/nestjs-backend/BOOT-OOM-INVESTIGATION.md`.
- v2.0 vision (AI integrations) is verified and staged in
  `.planning/MILESTONE-CONTEXT.md`, ready for `/gsd-new-milestone` after v1.0 closes.

## Constraints

- **License**: AGPL-3.0 — third-party integrations (e.g. OpenClaw) need license-compat review.
- **Tech stack**: NestJS + Next.js + PostgreSQL (pgvector) + Redis + BullMQ + ShareDB; pnpm monorepo.
- **Architecture**: v2 DDD rewrite (`packages/v2`) coexists with v1 features — keep both paths working.
- **Performance**: heavy/async workloads (ingest, embeddings, external DB) must run off the
  API hot path (decoupled worker pattern) to avoid OOM/GC stalls.
- **AI**: already uses the Vercel AI SDK — v2.0 AI gateway should build on it.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep pgvector (not a dedicated vector DB) | <10M vectors; ops simplicity; vector-DB choice is ~5–10% of RAG quality | ✓ Good |
| Decouple doc-ingest into a standalone worker process | Isolate heavy/embedding work from the OOM-prone API | ✓ Good (verified 618MB worker) |
| Disable `V2_COMPUTED_UPDATE_MODE=sync` | `sync` eager-loads the full dataset at boot → heap-limit OOM | ✓ Good |
| Process separation (API vs Next.js) | Eliminate shared-heap OOM + GC event-loop stalls | ✓ Good (Phase 14, verified live) |
| v2.0 AI: single gateway (Vercel AI Gateway/OpenRouter) not 3 features | Collapses LLM library + keys + Ollama into one integration | — Pending (v2.0) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-04 — reconstructed during `/gsd-autonomous` (milestone v1.0, Phase 14 active)*
