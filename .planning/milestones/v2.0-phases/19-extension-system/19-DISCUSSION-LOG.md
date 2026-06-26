# Phase 19: Extension System — Discussion Log

**Date:** 2026-06-05 · Mode: discuss (default)

> Human-reference record. Not consumed by downstream agents.

## Areas selected
User selected three gray areas (left spike-deliverable to Claude); decided via recommendation set.

| Area | Selected |
|------|----------|
| Extension model + SDK reuse | **Extend Plugin model + Teable-native MCP manifest** (MCP standard contract; inspired by OpenClaw, not a port) |
| Distribution / marketplace | **Own registry + install-by-URL first**; ClawHub bridge deferred behind spike |
| Trust & permissions | **Consent screen + RBAC scoping + Phase-18 SSRF guards**; remote MCP servers out-of-process |
| EXT-01 spike (Claude-defined) | Deliverable: AGPL go/no-go + port-vs-reimplement rec + adopt-list (MCP yes; ClawHub assess) → `19-SPIKE.md` |

## Notes
- Builds directly on Phase 17 (plugins declare MCP tools; MCP client aggregator already consumes them).
- Reuses Phase 18 SSRF guard for remote MCP server URLs.

## Deferred
- ClawHub browse/install bridge (spike-gated); direct OpenClaw SDK port; admin-only install / signing / paid marketplace; deeper sandboxing.
