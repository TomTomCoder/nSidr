---
phase: 19
slug: extension-system
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-07
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (apps/nestjs-backend) |
| **Config file** | apps/nestjs-backend/vitest.config.ts |
| **Quick run command** | `cd apps/nestjs-backend && npx vitest run src/features/plugin` |
| **Full suite command** | `cd apps/nestjs-backend && npx vitest run` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (scoped to plugin feature)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-T1 | 19-01 | 1 | EXT-01 | — | 19-SPIKE.md written with clear go/no-go | smoke | `test -f .planning/phases/19-extension-system/19-SPIKE.md` | ❌ W0 | ✅ green |
| 19-02-T1 | 19-02 | 2 | EXT-02 | T-19-01 | isExtension + requestedScopes fields in schema | unit/build | `cd packages/db-main-prisma && npx prisma generate --schema prisma/postgres/schema.prisma 2>&1 | tail -5` | ✅ schema | ✅ green |
| 19-02-T2 | 19-02 | 2 | EXT-02 | T-19-01 | installByUrl: invalid MCP URL rejected; valid manifest registered | unit | `cd apps/nestjs-backend && npx vitest run src/features/plugin/plugin.service.spec.ts` | ✅ extend | ✅ green |
| 19-03-T1 | 19-03 | 2 | EXT-02 | T-19-02 | SSRF guard blocks private-IP MCP URL on install | unit | `cd apps/nestjs-backend && npx vitest run src/features/plugin/plugin.service.spec.ts` | ✅ extend | ✅ green |
| 19-03-T2 | 19-03 | 2 | EXT-02 | T-19-03 | consent screen renders requested scopes; tool blocked pre-consent | unit | `cd apps/nestjs-backend && npx vitest run src/features/plugin` | ✅ new | ✅ green |
| 19-03-T3 | 19-03 | 2 | EXT-02 | T-19-03 | UI consent flow (human-verify) | human-verify | manual UAT script | — | ⬜ human-verify DEFERRED |
| 19-04-T1 | 19-04 | 3 | EXT-02 | — | registry list renders + install action wires to installByUrl | typecheck | `yarn workspace @teable/nextjs-app typecheck` | ✅ new | ✅ green |
| 19-05-T1 | 19-05 | 4 | EXT-01, EXT-02 | T-19-01, T-19-02, T-19-03 | full unit suite green (manifest, SSRF, consent) | unit | `cd apps/nestjs-backend && npx vitest run` | ✅ new | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* Vitest, plugin.service.spec.ts, and schema generation are all pre-existing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Install-by-URL flow: paste MCP URL → consent screen → accept → tools available in agent | EXT-02 | Requires live app + sample MCP server | Start app, navigate to Space Settings → Integrations → Extensions, paste a test MCP server URL |
| SSRF rejection visible in UI | EXT-02 | Visual confirmation required | Paste a private-IP URL (e.g. http://192.168.1.1/mcp), expect error toast |

---

## Validation Sign-Off

- [x] All tasks have automated verify or human-verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned (executor fills Status column during execution)
