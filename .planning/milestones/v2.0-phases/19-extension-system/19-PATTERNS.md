---
phase: 19
slug: extension-system
created: 2026-06-07
source: manual-pattern-analysis
---

# Phase 19 — Existing Patterns

## File → Nearest Existing Analog

| New file | Analog file | Pattern |
|----------|-------------|---------|
| `plugin.service.ts` (extend `installByUrl`) | `apps/nestjs-backend/src/features/plugin/plugin.service.ts:116` `createPlugin` | Same Prisma tx pattern; add MCP manifest fetch + SSRF check before register |
| Prisma migration (isExtension, requestedScopes) | `packages/db-main-prisma/prisma/postgres/schema.prisma:679` (`mcpUrl`, `toolManifest` added in Phase 17) | Optional fields on Plugin; same nullable pattern |
| `extension-consent.service.ts` | `apps/nestjs-backend/src/features/agent/agent-permission.guard.ts` | Authority-matrix RBAC gating; same guard pattern |
| Extension consent UI | `apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExternalConnectionForm.tsx` | Modal form with confirm step |
| Extension marketplace list | `apps/nestjs-app/src/features/app/blocks/space-setting/integration/components/ExternalConnectionList.tsx` | List + action buttons pattern |
| `plugin-extension.controller.ts` | `apps/nestjs-backend/src/features/plugin/plugin.controller.ts` | Decorator pattern: @UseGuards + @Permissions |
| SSRF reuse | `apps/nestjs-backend/src/features/external-connection/ssrf-guard.service.ts:33` `SsrfGuardService.assertSafe()` | Import + call before any outbound connect |
| MCP discovery hook | `apps/nestjs-backend/src/features/agent/mcp/plugin-mcp-discovery.service.ts` | Already consumes mcpUrl + toolManifest — no changes needed; new fields transparent |
