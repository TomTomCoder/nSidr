# Phase 19: Extension System - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

An OpenClaw/ClawHub-style way to **install third-party MCP extensions** into Teable's existing
plugin system, plus the **EXT-01 license/reuse spike**. Builds on Phase 17 (plugins declare MCP
tools; agent is MCP client). Requirements: EXT-01 (spike), EXT-02 (install third-party extensions).

**Build ON:** existing `Plugin` (registered apps at a `url`, `pluginUser`) + `PluginInstall`
(install into space/base/dashboard) + plugin marketplace (`createPlugin`) + official plugins
(chart, config). Phase 17's MCP client aggregator consumes installed extensions' tools.
</domain>

<decisions>
## Implementation Decisions

### Extension model + SDK reuse (EXT-01/02)
- **D-01:** An **extension = an MCP-capable Plugin** — **extend the existing `Plugin`/`PluginInstall`
  model** (reuse install/marketplace infra), do NOT create a separate entity.
- **D-02:** Build a **Teable-native MCP manifest** (declares an MCP server URL/tools + optional UI),
  using the **MCP standard as the contract** — inspired by OpenClaw/ClawHub but **not a direct
  SDK port** (avoids AGPL/runtime coupling). Same manifest mechanism Phase 17 (17-03) introduced
  for plugin-declared MCP tools.

### Distribution / marketplace (EXT-02)
- **D-03:** **Teable's own registry + install-by-URL** first: host MCP extensions in the existing
  plugin marketplace AND allow installing any MCP extension by pointing at its manifest/endpoint.
  **ClawHub (clawhub.ai) browse/install is a later optional bridge**, gated on the EXT-01 spike
  (their protocol + license).

### Trust & permissions (EXT-02)
- **D-04:** On install, show a **consent screen** (the tools/scopes the extension requests).
  Extension tools run as the **installing identity**, gated by **authority-matrix +
  `agent-permission.guard`**. Remote MCP servers run **out-of-process** with **Phase 18 SSRF/
  network guards** (block private/metadata IPs; validate host).

### EXT-01 spike (Claude's discretion on shape — deliverable defined here)
- **D-05:** The spike MUST produce: (a) **AGPL-compatibility go/no-go** for OpenClaw + ClawHub;
  (b) a **port-vs-reimplement recommendation** (default = reimplement native per D-01/02);
  (c) **which pieces to adopt** — MCP contract = yes; ClawHub marketplace protocol = assess for the
  later bridge; OpenClaw plugin-SDK = reference only unless license clears. Written to
  `19-SPIKE.md`. The spike gates the ClawHub bridge, not the native extension build.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase / milestone
- `.planning/REQUIREMENTS.md` — EXT-01/02
- `.planning/ROADMAP.md` §"Phase 19" — goal + success criteria
- `.planning/research/SUMMARY.md` — OpenClaw = MCP-aligned extension/ClawHub model; MCP as unifier
- `.planning/MILESTONE-CONTEXT.md` is consumed/deleted — OpenClaw findings are in research/SUMMARY.md

### Existing code (reuse)
- `apps/nestjs-backend/src/features/plugin/plugin.service.ts` — `createPlugin`, marketplace (extend for MCP manifest)
- `apps/nestjs-backend/src/features/plugin/plugin-auth.service.ts` — `pluginUser` + access tokens
- `apps/nestjs-backend/src/features/plugin/official/` — chart/config (pattern for bundled extensions)
- `Plugin` / `PluginInstall` models (`schema.prisma` ~661/686) — extend with MCP manifest fields
- **Phase 17** `.planning/phases/17-agent-mcp-enhancement/17-CONTEXT.md` (D-03 plugin MCP tools) + `17-PLAN.md` (17-03 manifest, MCP client aggregator) — the mechanism this phase distributes
- **Phase 18** SSRF guard service (18-01) — reuse for remote MCP server validation
- External: OpenClaw repo (github.com/openclaw/openclaw) + ClawHub (clawhub.ai) — spike inputs (license)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Plugin`/`PluginInstall` + `plugin.service`/`plugin-auth` — the install/marketplace + identity layer.
- Phase 17 MCP client aggregator — already consumes installed extensions' MCP tools (no re-build).
- Phase 18 SSRF guard — for remote MCP server URLs.
- Authority-matrix + `agent-permission.guard` — tool permission gating.

### Established Patterns
- Plugins are URL-hosted apps with a system `pluginUser` + access token; per-space install.
- MCP standard is the tool contract (Phase 17). Extensions add: manifest + consent + registry/URL install.

### Integration Points
- Extend `Plugin` schema with MCP manifest (mcpUrl/toolManifest/requestedScopes) + extension flag.
- New: install-by-URL flow + consent screen + registry listing UI.
- New: `19-SPIKE.md` (EXT-01 license/reuse decision).
</code_context>

<specifics>
## Specific Ideas

- Native MCP manifest inspired by OpenClaw but standard-MCP-based (not a port) — explicit.
- Own registry + install-by-URL first; ClawHub bridge deferred behind the spike.
- Consent + RBAC + SSRF; remote MCP servers out-of-process.
</specifics>

<deferred>
## Deferred Ideas

- ClawHub marketplace browse/install bridge — deferred behind EXT-01 spike (license/protocol).
- Direct OpenClaw plugin-SDK port — rejected (native MCP manifest instead) unless spike clears license.
- Admin-only install / extension signing / paid marketplace — future hardening.
- Sandboxing beyond out-of-process + SSRF (e.g., per-extension network policy) — future.

None block Phase 19.
</deferred>

---

*Phase: 19-extension-system*
*Context gathered: 2026-06-05*
