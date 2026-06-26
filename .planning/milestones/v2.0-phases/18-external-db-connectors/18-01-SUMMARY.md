---
phase: 18-external-db-connectors
plan: 18-01
subsystem: external-db-connectors
tags: [security, ssrf, encryption, prisma, nestjs, react, qdrant, postgres]
dependency_graph:
  requires: [18-00]
  provides: [external-connection-foundation]
  affects: [18-02, 18-04]
tech_stack:
  added:
    - ExternalConnection Prisma model (AES-256-CBC encrypted config, spaceId FK)
    - SsrfGuardService (dns.promises resolution + IP-range denylist)
    - ExternalConnectionService (CRUD + random-IV encryption + test-on-save)
    - ExternalConnectionController (space-permission REST endpoints)
    - ExternalConnectionModule (registered in app.module.ts)
    - ExternalConnectionList + ExternalConnectionForm (React space-settings UI)
  patterns:
    - Random IV per encryption call (token.service.ts pattern, iv:ciphertext hex)
    - SSRF guard called before every persist AND every test-connection attempt
    - BadRequestException (not 500) on SSRF rejection
    - Dynamic pg import in testPostgres to avoid boot-time graph pollution
key_files:
  created:
    - apps/nestjs-backend/src/features/external-connection/ssrf-guard.service.ts
    - apps/nestjs-backend/src/features/external-connection/ssrf-guard.service.spec.ts
    - apps/nestjs-backend/src/features/external-connection/external-connection.service.ts
    - apps/nestjs-backend/src/features/external-connection/external-connection.service.spec.ts
    - apps/nestjs-backend/src/features/external-connection/external-connection.module.ts
    - apps/nestjs-backend/src/features/external-connection/external-connection.controller.ts
    - apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExternalConnectionList.tsx
    - apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExternalConnectionForm.tsx
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma
    - apps/nestjs-backend/src/app.module.ts
decisions:
  - Random IV per record (not static IV) to prevent IV-reuse attacks per 18-00-VERIFY.md
  - Not reusing internal-DSN-bound createConnection (per 18-00-VERIFY.md deviation note)
  - BadRequestException surfaced on SSRF rejection (not InternalServerErrorException)
  - Dynamic import of pg in testPostgres to avoid boot-time module graph pollution
  - Local BadgeVariant type instead of BadgeProps variant to work around worktree tsc resolution quirk
metrics:
  duration: "~90 minutes"
  completed: "2026-06-07"
  tasks_completed: 3
  files_changed: 10
---

# Phase 18 Plan 01: ExternalConnection Foundation Summary

**One-liner:** Hardened per-space external connection registry — AES-256-CBC encrypted config with random IV, mandatory SSRF guard (loopback/RFC1918/link-local/cloud-metadata + DNS rebinding), Prisma model, CRUD REST API, and space-settings React UI for Qdrant and Postgres connections.

## What Was Built

### Task 1: SSRF Guard Service (security control)

`SsrfGuardService.assertHostAllowed(host)` — the mandatory SSRF gate that every outbound connection path MUST call before opening a socket.

- IP literal detection without DNS for fast path (loopback, RFC1918, link-local, fc00::/7, fe80::/10, cloud metadata 169.254.169.254)
- Hostname path: resolves with `dns.promises.resolve4` + `resolve6`, checks ALL returned addresses (DNS-rebinding mitigation)
- Optional `EXTERNAL_DB_HOST_ALLOWLIST` env (comma-separated) for corporate deployments where internal Qdrant is needed
- `SsrfBlockedError` typed exception for structured catch
- 22 spec cases green: IP literals, hostname resolution, DNS rebinding, allowlist behavior

Commits: `2470111`

### Task 2: ExternalConnection model + CRUD service

**Prisma model** (`ExternalConnection`): spaceId FK with onDelete Cascade, type enum `qdrant|postgres`, encrypted config (Text), enabled, createdBy, timestamps, `@@index([spaceId])`.

**ExternalConnectionService**:
- `create()`: SSRF guard → AES-256-CBC encrypt with **random IV per call** (stored as `iv_hex:ciphertext_hex`) → persist
- `list()/get()`: fetch + decrypt; never returns `encryptedConfig` field to caller
- `remove()`: scope-checked delete
- `testConnection()`: SSRF guard → Qdrant REST ping (fetch with 5s timeout) OR Postgres `SELECT 1` (dynamic pg import)
- Key from `INTEGRATION_SECRET_KEY.slice(0, 32)` — mirrors `OAuthIntegrationTokenService`

**ExternalConnectionController**: space-permission-guarded REST at `api/space/:spaceId/external-connection`.

8 spec cases green: encryption roundtrip, random IV, SSRF gate before prisma.create, BadRequestException on block, SSRF gate in testConnection.

Commits: `6d44726`

### Task 3: Space-settings UI

`ExternalConnectionList`: shows existing connections (name, type badge, enabled state) with remove button; inline success/error feedback on add.

`ExternalConnectionForm`: type selector (qdrant/postgres), conditional field sets (host/port/url/apiKey for Qdrant; host/port/database/user/password/SSL for Postgres). Submit calls create endpoint which runs test-on-save; SSRF rejection message surfaced inline. Secrets never re-rendered in edit mode (form always starts empty).

Zero TypeScript errors on ExternalConnection components.

Commits: `f081270`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] vitest could not find spec files in worktree**
- Found during: Task 1
- Issue: Worktree has no node_modules; vitest include pattern only matches within its rootDir
- Fix: Created node_modules symlinks from worktree to main repo for all packages and apps
- No files committed (infrastructure fix)

**2. [Rule 1 - Bug] lint-staged auto-fixer broke constant self-reference**
- Found during: Task 2 spec lint
- Issue: When lint-staged auto-fixed sonarjs/no-duplicate-string by replacing string literals with a variable name, it also replaced the constant's own initializer, creating a self-reference runtime error
- Fix: Used `/* eslint-disable sonarjs/no-duplicate-string */` file-level directive
- Files modified: `external-connection.service.spec.ts`

**3. [Rule 2 - Security] Random IV enforcement per 18-00-VERIFY.md**
- 18-00 explicitly noted that static IV Encryptor creates IV-reuse vulnerability
- Implemented inline encryptConfig/decryptConfig using crypto.randomBytes(16) per-call
- Not using the Encryptor class from encryptor.ts (which takes a fixed IV) — intentional

**4. [Rule 3 - Blocker] BadgeVariant tsc resolution quirk in worktree**
- Found during: Task 3 TypeScript check
- Issue: Importing BadgeProps from @teable/ui-lib/shadcn failed to expose variant prop in worktree tsc
- Fix: Defined local `type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'`

## Live Connectivity Checkpoint (Deferred)

Docker is not available in the executor environment. Live connectivity against 18-00 fixtures was not verified at commit time.

**Manual verification steps:**
```bash
# Start fixtures
docker compose -f docker-compose.qdrant.yml up -d
docker compose -f docker-compose.ext-pg.yml up -d

# Start backend
cd apps/nestjs-backend && pnpm dev

# Test SSRF rejection (must return 400)
curl -X POST http://localhost:3001/api/space/<spaceId>/external-connection \
  -H "Content-Type: application/json" \
  -d '{"name":"bad","type":"qdrant","config":{"host":"127.0.0.1","port":6333}}'

# Test Qdrant (use EXTERNAL_DB_HOST_ALLOWLIST=localhost for local dev)
EXTERNAL_DB_HOST_ALLOWLIST=localhost \
curl -X POST http://localhost:3001/api/space/<spaceId>/external-connection \
  -H "Content-Type: application/json" \
  -d '{"name":"local-qdrant","type":"qdrant","config":{"host":"localhost","port":6333}}'

# Test Postgres
EXTERNAL_DB_HOST_ALLOWLIST=localhost \
curl -X POST http://localhost:3001/api/space/<spaceId>/external-connection \
  -H "Content-Type: application/json" \
  -d '{"name":"ext-pg","type":"postgres","config":{"host":"localhost","port":5433,"database":"extdb","user":"extuser","password":"extpass"}}'
```

## Known Stubs

None. The service is fully wired: model → encryption → SSRF guard → test-connection → REST controller → UI.

## Threat Flags

None beyond what was declared in the plan threat model. All four declared mitigations were implemented:
- T-18-01-SSRF: SsrfGuardService.assertHostAllowed guards both create and testConnection
- T-18-01-I: AES-256-CBC random-IV encryption; encryptedConfig never returned to client
- T-18-01-E: @Permissions('space|update') on all mutating endpoints
- T-18-01-T: ExternalConnectionType enum enforced at Prisma level

## Self-Check: PASSED

Files present:
- apps/nestjs-backend/src/features/external-connection/ssrf-guard.service.ts — FOUND
- apps/nestjs-backend/src/features/external-connection/external-connection.service.ts — FOUND
- apps/nestjs-backend/src/features/external-connection/external-connection.module.ts — FOUND
- apps/nestjs-backend/src/features/external-connection/external-connection.controller.ts — FOUND
- apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExternalConnectionList.tsx — FOUND
- apps/nextjs-app/src/features/app/blocks/space-setting/integration/components/ExternalConnectionForm.tsx — FOUND

Commits present:
- 2470111 (SSRF guard) — FOUND
- 6d44726 (model + service) — FOUND
- f081270 (UI) — FOUND

Tests: 30/30 passing (22 SSRF + 8 service)
TypeScript: 0 ExternalConnection errors
