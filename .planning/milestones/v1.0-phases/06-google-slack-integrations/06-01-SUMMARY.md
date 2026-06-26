---
phase: "06"
plan: "06-01"
title: "Wave 1: Prisma models + OAuth2 client infrastructure [BLOCKING db push]"
status: completed
date_completed: "2026-05-20"
duration_minutes: 45
subsystem: oauth-integration
tags:
  - database
  - encryption
  - oauth
dependency_graph:
  requires: []
  provides:
    - OAuthIntegration Prisma model
    - OAuthIntegrationWebhook Prisma model
    - OAuthIntegrationFieldSync Prisma model
    - OAuthIntegrationTokenService
  affects:
    - 06-02
    - 06-03
    - 06-04
tech_stack:
  added:
    - Prisma ORM (models)
    - Node.js crypto module (AES-256-CBC)
  patterns:
    - Envelope encryption at application layer
key_files:
  created:
    - packages/db-main-prisma/prisma/postgres/schema.prisma (additions)
    - apps/nestjs-backend/src/features/oauth-integration/token.service.ts
    - apps/nestjs-backend/src/features/oauth-integration/oauth-integration.module.ts
  modified:
    - packages/db-main-prisma/prisma/postgres/schema.prisma (Space + User relations)
decisions:
  - Encryption at application layer (not DB layer) - allows flexibility, token values never written plaintext
  - AES-256-CBC algorithm with random IV per token - prevents pattern recognition across tokens
  - OAuthIntegration model scoped to workspace (spaceId), not agent - allows standalone use
metrics:
  tasks_completed: 2
  files_created: 3
  database_tables_added: 3
  database_enums_added: 2
---

# Phase 06 Plan 01: Prisma models + OAuth2 client infrastructure Summary

**Objective:** Create OAuthIntegration, OAuthIntegrationWebhook, OAuthIntegrationFieldSync Prisma models and implement OAuthIntegrationTokenService with AES-256 encryption.

## Execution Summary

All 2 tasks completed successfully. The foundation for Phase 06 is now in place.

### Task 1: Add OAuthIntegration Prisma models to schema and run db push

**What was built:**
- Added 3 new Prisma models: OAuthIntegration, OAuthIntegrationWebhook, OAuthIntegrationFieldSync
- Added 2 enums: OAuthIntegrationProvider (GMAIL, GCALENDAR, GDRIVE, GCHAT, GMEET, SLACK), OAuthSyncDirection (IMPORT, EXPORT, BIDIRECTIONAL)
- Updated Space model to add `oauthIntegrations` back-relation
- Updated User model to add `oauthIntegrations` back-relation
- Database migrated successfully with `npx prisma db push`
- Prisma client regenerated

**Verification:**
- Schema validation passed
- Database tables created: oauth_integration, oauth_integration_webhook, oauth_integration_field_sync
- All foreign key constraints and indexes created correctly
- Prisma client types exported from `@teable/db-main-prisma`

### Task 2: Create OAuthIntegrationTokenService + OAuthIntegrationModule

**What was built:**
- OAuthIntegrationTokenService injectable NestJS service
  - `encryptToken(token)` returns `iv:encrypted` hex string using AES-256-CBC
  - `decryptToken(encrypted)` reconstructs and decrypts original token
  - `isTokenExpired(expiry)` utility method for token expiry checks
  - `refreshAccessToken(integration)` fetches new tokens from provider and updates DB
- OAuthIntegrationModule exports token service for DI
- INTEGRATION_SECRET_KEY environment variable validation at startup (minimum 32 characters)

**Verification:**
- TypeScript compiles with zero errors
- Service instantiation validates INTEGRATION_SECRET_KEY
- Encrypt/decrypt round-trip produces identical plaintext
- Token expiry logic correctly handles null and past dates

## Deviations from Plan

None - plan executed exactly as written.

## Architecture Notes

**Encryption Strategy:**
- Tokens are stored encrypted in the database (accessToken, refreshToken columns)
- Encryption uses AES-256-CBC with random 16-byte IV per token
- IV is prepended to ciphertext: `{iv.hex()}:{ciphertext.hex()}`
- Key is derived from INTEGRATION_SECRET_KEY environment variable (first 32 bytes, UTF-8)
- No database-level encryption; security relies on application-layer implementation

**Workspace Scope:**
- OAuthIntegration belongs to a Space (workspace), not to an Agent
- Enables the integration system to function independently of Phase 4 (super-agent-system)
- Future phases can wire integrations to agents via AgentToolRegistry

**Field Sync Infrastructure:**
- OAuthIntegrationFieldSync model exists and ready for implementation
- Structure supports bi-directional sync between Teable tables and provider APIs
- Implementation deferred to a follow-on task

## Database Changes

**New Tables:**
| Table | Columns | Purpose |
|-------|---------|---------|
| oauth_integration | id, spaceId, provider, accessToken, refreshToken, tokenExpiry, scopes, userId, isActive, createdAt, updatedAt | Main integration record with encrypted tokens |
| oauth_integration_webhook | id, integrationId, event, workflowTriggerId, isActive, lastTriggeredAt, config | Webhook configuration for workflow triggers |
| oauth_integration_field_sync | id, integrationId, tableId, fieldId, syncDirection, lastSyncedAt, config | Field-level sync configuration |

**New Enums:**
- OAuthIntegrationProvider: GMAIL, GCALENDAR, GDRIVE, GCHAT, GMEET, SLACK
- OAuthSyncDirection: IMPORT, EXPORT, BIDIRECTIONAL

## Known Stubs

None - all infrastructure in place for subsequent plans.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-06-01-01 | token.service.ts | Token encryption at app layer - key never persisted to DB |
| T-06-01-02 | token.service.ts | Startup validation of INTEGRATION_SECRET_KEY length |
| T-06-01-05 | token.service.ts | Fail-fast with clear error if INTEGRATION_SECRET_KEY missing in production |

## Commits

- 16 files changed, 231 insertions(+)
- `feat(06-01): add OAuthIntegration Prisma models and token encryption service`

## Next Steps

Plans 06-02, 06-03, and 06-04 depend on this foundation:
- 06-02: Implement OAuth2 authorization flows and CRUD service
- 06-03: Create thin HTTP clients for all 6 providers
- 06-04: Build webhook engine and admin UI (with human verification checkpoint)
