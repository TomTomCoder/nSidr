---
phase: 19-extension-system
created: 2026-06-05
type: plan
requirements: [EXT-01, EXT-02]
context: 19-CONTEXT.md
depends_on_phases: [17, 18]
---

# Phase 19 — Extension System: Plan

> Decisions (19-CONTEXT.md): extension = MCP-capable Plugin (native MCP manifest, not a port);
> own registry + install-by-URL first (ClawHub bridge deferred behind spike); consent + RBAC +
> SSRF (remote MCP servers out-of-process).

## Hard dependencies
- **Phase 17** must be built first: 17-03 (plugin MCP manifest) + the MCP client aggregator that
  consumes installed extensions' tools. Phase 19 distributes/installs into that mechanism.
- **Phase 18** SSRF guard (18-01) — reused for remote MCP server URLs.

## Grounding
- Build on `Plugin`/`PluginInstall` + `plugin.service` (`createPlugin`, marketplace) + `plugin-auth`
  (`pluginUser` + tokens) + official plugins (chart/config). No new top-level entity.
- MCP standard is the contract (Phase 17). This phase adds: manifest fields, install-by-URL,
  consent, registry UI — and the EXT-01 spike.

## Waves & Plans

### Wave 1 — Spike (EXT-01), decision gate
**19-01 — License/reuse spike → `19-SPIKE.md`.** Assess OpenClaw + ClawHub **AGPL compatibility**;
produce a **port-vs-reimplement** recommendation (default: reimplement native per D-01/02) and an
**adopt-list** (MCP contract = yes; ClawHub marketplace protocol = assess for the later bridge;
OpenClaw plugin-SDK = reference only unless license clears). *Success:* `19-SPIKE.md` with a clear
go/no-go for the ClawHub bridge and a confirmed native-manifest direction. **Gates the ClawHub
bridge only — native build (19-02+) proceeds regardless.**

### Wave 2 — Native MCP extension model (EXT-02) — depends on 19-01 direction + Phase 17
**19-02 — Plugin MCP manifest + install-by-URL.** Extend `Plugin`/`PluginInstall` schema:
`isExtension`, `mcpUrl`/`toolManifest`, `requestedScopes`. Install-by-URL flow: fetch + validate a
manifest/MCP endpoint, register as a Plugin, install into a space. *Files:* schema + migration,
`plugin.service.ts`, new install-by-URL endpoint. *Success:* installing a valid MCP extension URL
registers it and its tools become available to the Phase-17 aggregator.

**19-03 — Consent + RBAC + SSRF.** Install shows a **consent screen** (requested tools/scopes).
Extension tools run as the installing identity, gated by authority-matrix + `agent-permission.guard`.
Remote MCP servers validated by the **Phase 18 SSRF guard** and run out-of-process. *Files:*
consent UI, permission wiring, SSRF check on install + per-call. *Success:* a malicious/internal-IP
MCP URL is rejected; a user must consent before an extension's tools are usable; tools respect RBAC.

### Wave 3 — Registry UI
**19-04 — Registry listing.** Surface installable MCP extensions in the existing plugin marketplace
UI (browse + install + manage installed). *Success:* user browses available extensions and
installs one from the registry; installed list shows status + uninstall.

### Wave 4 — Tests & live verification
**19-05 — Tests.** Unit: manifest validation, SSRF on install, consent/RBAC gating. e2e/live:
install an MCP extension by URL → consent → an agent (Phase 17) invokes its tool. *Success:*
suites green; live install→consent→agent-use flow verified.

## Test strategy (per CONTEXT: test each capability live)
App running + Phase 17/18 built. Stand up a tiny example MCP server; install it by URL; verify
consent screen, SSRF rejection of a bad URL, RBAC scoping, and an agent calling the extension's tool.

## Risks / watch-for
- **Order:** Phase 19 depends on Phase 17's aggregator — don't start 19-02+ until 17 lands.
- **License:** do not port OpenClaw/ClawHub code until 19-01 clears AGPL (native manifest avoids this).
- **Security:** third-party tools = consent + RBAC + SSRF + out-of-process are non-negotiable.

## Coverage
EXT-01 → 19-01 (spike). EXT-02 → 19-02 (model+install) + 19-03 (trust) + 19-04 (registry). Tests 19-05. **2/2 ✓**
