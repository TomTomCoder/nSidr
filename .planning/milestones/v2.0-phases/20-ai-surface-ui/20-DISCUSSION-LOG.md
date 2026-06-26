# Phase 20: AI-Surface UI Simplification — Discussion Log

**Date:** 2026-06-05 · Mode: discuss (default)

> Human-reference record. Not consumed by downstream agents.

## Areas selected
User selected all four; decided via recommendation set (all "streamline & consolidate").

| Area | Selected |
|------|----------|
| Consolidation scope | **One AI settings hub** (tabs: Providers&Keys / Models / Defaults), reuse components |
| Model picker UX | **Single searchable picker** (provider + modality filter, recommended badges) |
| Per-provider key mgmt | **Inline per-provider key list** (add / test / remove) |
| AI-column config | **One compact panel** (prompt + source cols + model + output typology + live preview) |

## Notes
- Incremental-only (milestone constraint): restructure presentation, reuse the existing
  `ai-config/*` components, keep data contracts unchanged.
- Suggest generating a UI-SPEC via `/gsd:ui-phase 20` before planning (UI phase).

## Deferred
- Full design-system / ground-up rebuild; per-model key UI; non-AI settings consolidation.
