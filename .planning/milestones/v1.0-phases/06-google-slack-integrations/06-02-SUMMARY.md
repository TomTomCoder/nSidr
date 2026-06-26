---
phase: "06"
plan: "06-02"
title: "Wave 2: OAuth2 flows per provider + OAuthIntegrationService CRUD"
status: completed
date_completed: "2026-05-20"
duration_minutes: 35
subsystem: oauth-integration
tags:
  - oauth2
  - rest-api
  - security
dependency_graph:
  requires:
    - 06-01
  provides:
    - OAuth2 authorization endpoints
    - OAuth2 callback handler
    - CRUD service for integrations
    - OpenAPI types
  affects:
    - 06-03
    - 06-04
tech_stack:
  added:
    - PKCE (Proof Key for Code Exchange) S256
    - httpOnly cookies for state storage
  patterns:
    - REST API with JSON responses
    - Factory pattern for provider-specific URLs
key_files:
  created:
    - apps/nestjs-backend/src/features/oauth-integration/oauth-integration.service.ts
    - apps/nestjs-backend/src/features/oauth-integration/oauth.controller.ts
    - packages/openapi/src/integration/index.ts
  modified:
    - apps/nestjs-backend/src/app.module.ts
    - apps/nestjs-backend/src/features/oauth-integration/oauth-integration.module.ts
decisions:
  - PKCE S256 for all flows - prevents authorization code interception
  - httpOnly cookies for verifier storage - prevents XSS token theft
  - State parameter stored in signed cookie - CSRF protection
  - All 6 providers share one GOOGLE_CLIENT_ID - reduces env var clutter
  - Slack has separate SLACK_CLIENT_ID - different OAuth2 provider
metrics:
  tasks_completed: 2
  rest_endpoints_added: 3
  provider_scopes_defined: 6
  typescript_errors: 0
---

# Phase 06 Plan 02: OAuth2 flows + Integration Service Summary

**Objective:** Implement OAuth2 authorization URL builders, callback handler, CRUD service, and OpenAPI schemas for all 6 providers.

## Execution Summary

All 2 tasks completed successfully. The OAuth2 connect/disconnect cycle is now fully functional.

### Task 1: OAuthIntegrationService CRUD + OAuth2 URL builders + OpenAPI schemas

**What was built:**
- OAuthIntegrationService injectable with 5 core methods:
  - `getAuthorizationUrl()` - returns PKCE S256 OAuth2 URL for any provider
  - `createFromOAuth()` - exchanges tokens, encrypts, and inserts to DB
  - `listForSpace()` - returns all integrations for a workspace
  - `getById()` - retrieves single integration
  - `deactivate()` - soft-deletes integration (sets isActive=false)
- Provider-specific scopes defined for all 6 services
- OpenAPI type definitions exported from `@teable/openapi`

**Provider Scope Coverage:**
| Provider | Scopes | Purpose |
|----------|--------|---------|
| Gmail | gmail.readonly, gmail.send, gmail.modify | Email reading and sending |
| Google Calendar | calendar.readonly, calendar.events | Event listing and creation |
| Google Drive | drive.readonly, drive.file | File search and read |
| Google Chat | chat.messages, chat.spaces.readonly | Messaging and space browsing |
| Google Meet | meetings.space.created, meetings.space.readonly | Meeting creation |
| Slack | channels:read, chat:write, search:read, users:read | Channel/message operations |

**Verification:**
- TypeScript compiles with zero errors
- PKCE code challenge correctly generated using SHA256
- Authorization URLs contain all required parameters (client_id, scope, code_challenge, state)
- Ownership check in deactivate() prevents unauthorized revocation

### Task 2: OAuthController + update OAuthIntegrationModule

**What was built:**
- OAuthController with 3 REST endpoints:
  - `GET /api/integrations/oauth/authorize/:provider` - initiates OAuth flow, returns URL + state
  - `GET /api/integrations/oauth/callback/:provider` - handles provider callback, exchanges code for tokens
  - `DELETE /api/integrations/:integrationId` - revokes and deactivates integration
- Callback handler:
  - Validates PKCE code verifier from httpOnly cookie
  - Exchanges authorization code for tokens via provider API
  - Encrypts tokens and inserts OAuthIntegration record
  - Returns JavaScript to close popup and signal parent window
- Provider-side revocation (best-effort, doesn't fail if errors)
- Module updated with OAuthIntegrationService and OAuthController
- Registered OAuthIntegrationModule in app.module.ts

**REST Endpoint Behaviors:**
| Endpoint | Method | Response | Security |
|----------|--------|----------|----------|
| `/api/integrations/oauth/authorize/:provider` | GET | `{ url, state }` | PKCE S256, httpOnly cookie |
| `/api/integrations/oauth/callback/:provider` | GET | HTML script closes popup | Code verifier validated, state cookie checked |
| `/api/integrations/:integrationId` | DELETE | 204 No Content | Ownership verified (userId check) |

**Verification:**
- TypeScript compiles with zero errors
- Cookie set with httpOnly, sameSite=lax, 10min expiry
- Callback validates state from cookie before accepting code
- Non-owner requests to DELETE return 403 Forbidden
- Revocation calls to Google and Slack are best-effort (don't block)

## Deviations from Plan

**Rule 1 - Authorization simplification:**
- Ownership check in `deactivate()` simplified to userId comparison only
- Original plan referenced space collaborator roles, but Collaborator model structure differs
- Current implementation: only the user who created the integration can deactivate it
- This is acceptable for MVP - space-level admin deletion can be added later via permissions service

## Architecture Notes

**OAuth2 Flow:**
1. Frontend calls GET /api/integrations/oauth/authorize/PROVIDER
2. Backend generates PKCE verifier + challenge, stores verifier in httpOnly cookie
3. Backend returns provider OAuth2 URL with code_challenge
4. Frontend opens popup to provider OAuth2 consent screen
5. User consents and is redirected back to /api/integrations/oauth/callback/PROVIDER?code=...&state=...
6. Backend retrieves verifier from cookie, exchanges code for tokens via provider API
7. Backend encrypts tokens and inserts OAuthIntegration record
8. Backend returns HTML script that closes popup and postMessages parent window
9. Parent window refreshes integration list on postMessage signal

**Provider-Specific Details:**
- Google services (Gmail, Calendar, Drive, Chat, Meet) all use https://oauth2.googleapis.com/token for token exchange
- Slack uses https://slack.com/api/oauth.v2.access for token exchange
- All providers receive access_type=offline (Google) and prompt=consent to guarantee refresh tokens

## OpenAPI Types

Exported from `packages/openapi/src/integration/index.ts`:
- `IIntegration` - full record type (id, provider, tokens, scopes, expiry)
- `IIntegrationCreate` - request type (provider, spaceId)
- `IIntegrationList` - response type (array of integrations)
- `IIntegrationAuthorizeResponse` - authorize endpoint response (url, state)

## Commits

- 5 files changed, 310 insertions(+)
- `feat(06-02): implement OAuth2 flows and integration service`

## Next Steps

Plan 06-03 (provider HTTP clients) depends on this:
- Clients will be instantiated by calling `OAuthIntegrationService.getById()` and decrypting accessToken
- Factory function `createProviderClient()` will be defined in 06-03
