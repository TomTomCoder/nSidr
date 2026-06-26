# MILESTONES

Shipped milestones for Teable (Extended). Newest first.

## v1.0 — "milestone" (completed 2026-06-04)

The foundational build: Teable extended into a unified work OS. **14 phases**, all verified.

| Phase | Name | Outcome |
|-------|------|---------|
| 1 | Authority Matrix | RBAC: DB + NestJS API + Next.js UI |
| 2 | Prompt System | AI prompt management |
| 3 | DB & Code Performance | Query/perf hardening |
| 4 | Super Agent System | Agentic system with memory |
| 5 | Gantt View | Timeline, dependencies, critical path, drag-to-reschedule |
| 6 | Google & Slack Integrations | OAuth2 integration library (Google suite, Slack) |
| 7 | Doc Import & Vector Search | pgvector semantic search + link graph + knowledge base UI |
| 8 | Company Onboarding | Onboarding flow |
| 9 | UI Feature Testing & Bug Fixes | Playwright E2E sweep + fixes |
| 10 | Unified AI Workspace Assistant | Chat sidebar, SSE streaming, proposals |
| 11 | Super Agent Hardening | Agent robustness |
| 12 | App Stability & Test Remediation | Stability + test fixes |
| 13 | Doc Library Redesign | Folder tree, markdown-aware chunking, RRF hybrid search, per-doc progress; security gaps closed (IDOR scoping, XSS sanitization) |
| 14 | Process Separation | NestJS API and Next.js as distinct processes — bounded memory, no shared-heap OOM/GC stalls |

**Closeout (2026-06-04):** doc library hardened — boot-OOM root cause
(`V2_COMPUTED_UPDATE_MODE=sync`) fixed, doc-ingest worker decoupled into a standalone process
(~600 MB), markdown-aware chunking + RRF hybrid search, per-document progress bar. Process
separation verified live (web :3000 → API :3002). PROJECT.md reconstructed.

**Next milestone:** v2.0 "AI Integrations" — scope captured in `.planning/MILESTONE-CONTEXT.md`
(AI provider gateway / LLM library, per-provider keys, Ollama, AI-generation column, external
VectorDB/Postgres connectors, incremental UI simplification, OpenClaw-style extensions).
