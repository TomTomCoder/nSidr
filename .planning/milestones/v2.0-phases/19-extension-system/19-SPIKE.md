# EXT-01 License/Reuse Spike

**Phase:** 19-extension-system
**Plan:** 19-01
**Requirement:** EXT-01
**Status:** COMPLETE
**Date:** 2026-06-07

---

## Section 1 — AGPL Compatibility Analysis

### OpenClaw (github.com/openclaw/openclaw)

OpenClaw is licensed under **AGPL-3.0**.

The AGPL-3.0 "network use = distribution" clause (§13) requires that any modified or
linked version of the software made available over a network must have its complete
corresponding source code published under AGPL-3.0. Teable is a commercial SaaS product
running as a network service. Any use, linking, or porting of OpenClaw SDK code into
Teable would trigger this clause.

**Verdict: BLOCKED**

Using or porting OpenClaw SDK code in a commercial SaaS product running as a network
service is not permissible without open-sourcing Teable under AGPL-3.0. The OpenClaw SDK
may be referenced for conceptual inspiration (field naming, manifest structure) but no
code may be copied or ported.

Exception path: If OpenClaw releases a dual-license (e.g., AGPL + commercial), re-evaluate
at that time. The manifest field naming convention could then be adopted as a reference.

---

### ClawHub (clawhub.ai)

ClawHub's marketplace and install protocol is **proprietary**. No open-source client SDK
exists as of this spike. Their browse/install API terms are unpublished.

Integrating ClawHub's client-side browse API would require:
1. A published, documented API
2. A reviewed license agreement confirming SaaS use is permitted
3. No runtime coupling that would create viral license obligations

Neither (1) nor (2) is currently satisfied.

**Verdict: ASSESS — DEFERRED**

The ClawHub bridge cannot be approved or blocked at this time. Treat as deferred until
ClawHub publishes a stable API with clear license terms.

---

## Section 2 — Port-vs-Reimplement Recommendation

**Recommendation: REIMPLEMENT NATIVE**

This is confirmed per decisions D-01 and D-02 in 19-CONTEXT.md.

**Rationale:**

- The MCP standard is already in place. Phase 17 (plan 17-03) introduced `mcpUrl`,
  `toolManifest`, and the plugin-mcp-discovery mechanism. No external SDK is needed.
- Native MCP manifest approach uses the MCP spec itself as the tool contract — the spec
  is MIT-licensed (safe for commercial SaaS).
- OpenClaw SDK is BLOCKED (AGPL-3.0). Even if it were cleared, the native approach is
  simpler and has no runtime coupling risk.
- ClawHub protocol is proprietary and unpublished. Cannot be adopted.

**If OpenClaw AGPL clears (future scenario):**

The manifest field naming convention (`name`, `description`, `inputSchema`, tool
declaration structure) could be adopted as a reference for compatibility with OpenClaw
ecosystems. No code would need to be ported — MCP spec field names already align.

---

## Section 3 — Adopt List

| Item | Decision | Rationale |
|------|----------|-----------|
| MCP protocol as tool contract | YES — adopt | Already in place via Phase 17. Standard, license-free (MCP spec is MIT-licensed). |
| OpenClaw plugin-SDK code | REF ONLY — do not port | AGPL-3.0 blocks commercial SaaS use without open-sourcing Teable. No code copy. |
| ClawHub marketplace browse/install bridge | DEFERRED | API not published; license terms unknown; not blocking Phase 19 native build. |
| MCP tools/list manifest field names (name, description, inputSchema) | ADOPT | Part of the MCP spec itself (MIT-licensed spec) — safe to use as-is. |
| OpenClaw manifest structure (field naming inspiration) | REF ONLY | Can reference conceptually for future ecosystem compatibility; no code copy. |

---

## Section 4 — ClawHub Bridge Gate

The ClawHub marketplace browse/install bridge is **DEFERRED**.

Phase 19 Wave 2+ proceeds with Teable's native registry + install-by-URL. The bridge
will be re-evaluated when ClawHub publishes a stable, documented API with clear license
terms confirming that SaaS integration is permitted without viral license obligations.

No Phase 19 plan depends on the ClawHub bridge. The native build (19-02+) proceeds
independently of this gate.

---

## Section 5 — Verdict Summary

| Component | Verdict | Reason |
|-----------|---------|--------|
| OpenClaw SDK use | **BLOCKED** | AGPL-3.0; commercial SaaS network-use clause triggers source disclosure requirement |
| ClawHub bridge | **DEFERRED** | No published API; license terms unknown; assess when available |
| Native MCP manifest direction | **CONFIRMED** | MCP spec as contract; MIT-licensed; already in place via Phase 17; no license risk |
