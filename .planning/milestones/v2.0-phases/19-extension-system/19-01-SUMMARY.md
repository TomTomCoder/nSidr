---
phase: 19-extension-system
plan: 19-01
type: spike
status: COMPLETE
date: 2026-06-07
requirements: [EXT-01]
artifacts:
  - .planning/phases/19-extension-system/19-SPIKE.md
decisions:
  - OpenClaw SDK BLOCKED (AGPL-3.0; commercial SaaS network-use clause)
  - ClawHub bridge DEFERRED (no published API; license terms unknown)
  - Native MCP manifest direction CONFIRMED (MCP spec as contract; no license risk)
next: 19-02 (Plugin schema extension + installByUrl)
---

# Phase 19 Plan 01: EXT-01 License/Reuse Spike Summary

**One-liner:** AGPL/license spike confirming native MCP manifest approach — OpenClaw SDK blocked, ClawHub deferred, MCP spec adopted.

## Status: COMPLETE

## Artifact Produced

`.planning/phases/19-extension-system/19-SPIKE.md` — EXT-01 decision document with 5 sections:
1. AGPL Compatibility Analysis (OpenClaw + ClawHub)
2. Port-vs-Reimplement Recommendation
3. Adopt List (table)
4. ClawHub Bridge Gate statement
5. Verdict Summary

## Decisions Made

| Decision | Verdict | Notes |
|----------|---------|-------|
| OpenClaw SDK use | BLOCKED | AGPL-3.0; network-use clause requires open-sourcing Teable |
| ClawHub bridge | DEFERRED | No published API; license terms unknown; re-evaluate when available |
| Native MCP manifest | CONFIRMED | MCP spec (MIT-licensed) as contract; already in place via Phase 17 |
| OpenClaw code/field names | REF ONLY | Conceptual reference only; no code copy |

## What This Gates

- **Native build (19-02+): NOT gated** — proceeds with Teable's own registry + install-by-URL
- **ClawHub bridge: GATED** — deferred until ClawHub publishes stable API + license terms

## Next Plan

**19-02** — Plugin schema extension + installByUrl flow

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `19-SPIKE.md` exists at `.planning/phases/19-extension-system/19-SPIKE.md`
- [x] Contains all 5 required sections
- [x] AGPL verdict explicit: OpenClaw = BLOCKED, ClawHub = DEFERRED
- [x] Adopt-list table present
- [x] ClawHub bridge explicitly DEFERRED
- [x] Native MCP manifest direction CONFIRMED
