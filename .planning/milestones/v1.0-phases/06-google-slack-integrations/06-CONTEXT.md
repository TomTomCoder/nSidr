# Phase 6: Google & Slack Integrations - Context

**Gathered:** 2026-05-14
**Status:** Ready to execute

<domain>
## Phase Boundary

Phase 6 delivers a complete OAuth2 integration library for six providers: Gmail, Google Calendar, Google Drive, Google Chat, Google Meet, and Slack. Scope includes:

- Prisma models for token storage, webhook registration, and field sync config
- AES-256-CBC token encryption service
- OAuth2 PKCE flows (authorize + callback) for all 6 providers
- 6 thin HTTP provider clients with typed responses
- `createProviderClient()` factory — the cross-phase integration point consumed by Phase 4 agents
- Webhook engine: inbound signature verification + EventEmitter2 event routing
- `IntegrationsPanel` admin UI with popup OAuth connect/disconnect

**Field sync** (`OAuthIntegrationFieldSync`): DB model created in Wave 1, service implementation explicitly deferred beyond Wave 4.

This phase has **no dependency on Phase 4** (Super Agent System) — it can execute standalone. Phase 4 depends on this phase's `createProviderClient()` factory.
</domain>

<decisions>
## Implementation Decisions

### Prisma Models

- **D-01:** Model names are `OAuthIntegration`, `OAuthIntegrationWebhook`, `OAuthIntegrationFieldSync` — NOT `Integration` (a conflicting model already exists at line 765 of the schema).
- **D-02:** Provider enum name: `OAuthIntegrationProvider` with values `GMAIL | GCALENDAR | GDRIVE | GCHAT | GMEET | SLACK`.
- **D-03:** Sync direction enum name: `OAuthSyncDirection` with values `IMPORT | EXPORT | BIDIRECTIONAL`.
- **D-04:** `OAuthIntegration` fields: `id (cuid)`, `spaceId FK→Space`, `provider OAuthIntegrationProvider`, `accessToken String`, `refreshToken String?`, `tokenExpiry DateTime?`, `scopes String[]`, `userId FK→User`, `isActive Boolean default true`, `createdAt`, `updatedAt`. Indexes on `spaceId` and `userId`.
- **D-05:** `OAuthIntegrationWebhook.config Json` stores `channelToken` for Google push channel verification and `channelId` for Google Calendar watch registration.
- **D-06:** `OAuthIntegrationFieldSync` fields: `id`, `integrationId FK→OAuthIntegration`, `tableId String`, `fieldId String`, `syncDirection OAuthSyncDirection`, `lastSyncedAt DateTime?`, `config Json`. Indexes on `integrationId` and `tableId`.
- **D-07:** Back-relations must be added to existing `Space` (`oauthIntegrations OAuthIntegration[]`) and `User` (`oauthIntegrations OAuthIntegration[]`) models.

### Token Encryption

- **D-08:** Algorithm: `aes-256-cbc`, IV length: 16 bytes, stored format: `${iv.toString('hex')}:${encrypted.toString('hex')}`.
- **D-09:** Key source: `process.env.INTEGRATION_SECRET_KEY` (minimum 32 characters; first 32 chars used as UTF-8 Buffer). Startup throws `InternalServerErrorException` if key is missing or too short.
- **D-10:** Encryption/decryption is application-layer only — DB columns store opaque ciphertext strings. No DB-level encryption.
- **D-11:** `refreshAccessToken()` in `OAuthIntegrationTokenService` posts to provider token endpoint and updates the `OAuthIntegration` record in DB; the refresh token is never returned to the client.

### OAuth2 Flows

- **D-12:** PKCE method: S256. Code verifier generated with `crypto.randomBytes(32).toString('base64url')`. Challenge: `sha256(verifier).digest('base64url')`.
- **D-13:** Code verifier stored in httpOnly cookie named `oauth_state_${state}`, `sameSite: 'lax'`, `maxAge: 10 minutes`.
- **D-14:** All 5 Google providers share `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Slack uses `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`.
- **D-15:** Google token endpoint: `https://oauth2.googleapis.com/token`. Slack token endpoint: `https://slack.com/api/oauth.v2.access`.
- **D-16:** Google auth URL: `https://accounts.google.com/o/oauth2/v2/auth` with `access_type=offline&prompt=consent` to guarantee refresh token issuance.
- **D-17:** Slack auth URL: `https://slack.com/oauth/v2/authorize`. Scopes joined with `,` (comma) vs space for Google.
- **D-18:** Callback closes popup with `window.opener?.postMessage({ type: 'oauth_success', provider }, '*'); window.close()` — no tokens in the postMessage payload.
- **D-19:** Provider revocation on DELETE: Google uses `https://oauth2.googleapis.com/revoke?token=<token>` (POST); Slack uses `https://slack.com/api/auth.revoke` (POST, Bearer token). Both are best-effort — failures do not prevent soft-delete.
- **D-20:** DELETE ownership check: `OAuthIntegrationService.deactivate(id, callerId)` throws `ForbiddenException` unless `callerId === integration.userId` or caller has `role=owner` in space collaborators.

### Provider Scopes (locked)

- **D-21:** `GMAIL`: `gmail.readonly`, `gmail.send`, `gmail.modify`
- **D-22:** `GCALENDAR`: `calendar.readonly`, `calendar.events`
- **D-23:** `GDRIVE`: `drive.readonly`, `drive.file`
- **D-24:** `GCHAT`: `chat.messages`, `chat.spaces.readonly`
- **D-25:** `GMEET`: `meetings.space.created`, `meetings.space.readonly`
- **D-26:** `SLACK`: `channels:read`, `chat:write`, `search:read`, `users:read`

### Provider Clients

- **D-27:** All 6 clients are thin HTTP wrappers using native `fetch` (Node 18+) — no SDK dependencies.
- **D-28:** Clients accept a plaintext (already-decrypted) `accessToken` as constructor parameter. Caller is responsible for decrypting via `OAuthIntegrationTokenService.decryptToken()` before constructing the client.
- **D-29:** Base URLs are hardcoded constants, not configurable at runtime (prevents SSRF via env override).
  - `GmailClient`: `https://gmail.googleapis.com/gmail/v1/users/me`
  - `GoogleCalendarClient`: `https://www.googleapis.com/calendar/v3`
  - `GoogleDriveClient`: `https://www.googleapis.com/drive/v3`
  - `GoogleChatClient`: `https://chat.googleapis.com/v1`
  - `GoogleMeetClient`: `https://meet.googleapis.com/v2`
  - `SlackClient`: `https://slack.com/api`
- **D-30:** `createProviderClient(provider: OAuthIntegrationProvider, accessToken: string): AnyProviderClient` factory exported from `providers/index.ts` — this is the Phase 4 integration point.

### Webhook Engine

- **D-31:** Slack signature verification: HMAC-SHA256 over `v0:${timestamp}:${rawBody}`, compared with `crypto.timingSafeEqual`. Signing secret from `SLACK_SIGNING_SECRET` env var. Failures return `{ ok: false }` silently (no 4xx detail exposed).
- **D-32:** Google webhook verification: `X-Goog-Channel-Token` header compared against `OAuthIntegrationWebhook.config.channelToken` stored at registration time. Mismatch throws `UnauthorizedException`.
- **D-33:** Gmail push uses Google Pub/Sub watch: `POST https://gmail.googleapis.com/gmail/v1/users/me/watch` with `topicName` from `GOOGLE_PUBSUB_TOPIC` env var.
- **D-34:** Google Calendar watch: `POST https://www.googleapis.com/calendar/v3/calendars/primary/events/watch` with `channelId` (randomUUID), `channelToken` (32-byte hex), `expiration` (7 days), `address` from `APP_BASE_URL` env var.
- **D-35:** Webhook events emitted on `EventEmitter2` with event name `'oauth.webhook'` — WorkflowService subscribes in a future task. Events are NOT dispatched directly to WorkflowService in Phase 6.
- **D-36:** `OAuthIntegrationWebhook.lastTriggeredAt` updated on every processed event.

### Admin UI

- **D-37:** `IntegrationsPanel` lives at `apps/nextjs-app/src/features/app/blocks/admin/setting/components/integrations/IntegrationsPanel.tsx`.
- **D-38:** Connect flow: `fetch /api/integrations/oauth/authorize/:provider?spaceId=...` → `window.open(url, 'oauth_popup', 'width=600,height=700,left=200,top=100')`.
- **D-39:** Parent window listens for `postMessage { type: 'oauth_success' }` and calls `fetchIntegrations()` to refresh the list.
- **D-40:** `ProviderIcon` component uses color-coded letter badges (no external icon dependency): Gmail `#EA4335`, GCal `#4285F4`, GDrive `#0F9D58`, GChat `#00897B`, GMeet `#00BCD4`, Slack `#4A154B`.
- **D-41:** Status badges: Connected (green), Expired (destructive red), Disconnected (outline).

### Module Architecture

- **D-42:** NestJS module path: `apps/nestjs-backend/src/features/oauth-integration/`
- **D-43:** `OAuthIntegrationModule` imports `EventEmitterModule`, registers `OAuthController` + `OAuthWebhookController`, provides and exports `OAuthIntegrationTokenService`, `OAuthIntegrationService`, `OAuthWebhookService`.
- **D-44:** `OAuthIntegrationModule` registered in `apps/nestjs-backend/src/app.module.ts`.
- **D-45:** OpenAPI schemas (`IIntegration`, `IIntegrationCreate`, `IIntegrationList`, `IIntegrationAuthorizeResponse`) exported from `packages/openapi/src/integration/index.ts`.

### REST Endpoints

- **D-46:** `GET /api/integrations/oauth/authorize/:provider` — returns `{ url, state }`, sets httpOnly cookie.
- **D-47:** `GET /api/integrations/oauth/callback/:provider` — exchanges code, stores integration, closes popup.
- **D-48:** `DELETE /api/integrations/:integrationId` — revokes + soft-deletes, ownership-guarded, returns 204.
- **D-49:** `POST /api/integrations/webhooks/:provider` — validates signature, emits EventEmitter2 event, returns `{ ok: boolean }`.

### Cross-Phase Integration Point (Phase 4)

- **D-50:** Phase 4 `AgentExecutionService` pattern: `OAuthIntegrationService.getById(agentConnection.integrationId)` → `OAuthIntegrationTokenService.decryptToken(integration.accessToken)` → `createProviderClient(integration.provider, plainToken)`.

### Claude's Discretion

- Error message wording for token exchange failures (beyond "Token exchange failed")
- Exact React Query cache key names for integration list queries in the frontend
- Exact placement of "Integrations" nav item in `AdminSetting.tsx` (depends on existing nav array structure discovered at execution time)
- Retry logic or backoff strategy for provider API calls (thin clients do not retry internally)
- Rate limiting implementation on the webhook controller (referenced in threat model but not specified in tasks)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prisma Schema
- `packages/db-main-prisma/prisma/postgres/schema.prisma` — Target file for appending `OAuthIntegration`, `OAuthIntegrationWebhook`, `OAuthIntegrationFieldSync` models, and patching existing `Space` and `User` models with back-relations. Existing `Integration` model at line 765 is the reason for the `OAuthIntegration` prefix.

### Token Service
- `apps/nestjs-backend/src/features/oauth-integration/token.service.ts` — `OAuthIntegrationTokenService` with `encryptToken`, `decryptToken`, `isTokenExpired`, `refreshAccessToken`. AES-256-CBC. Key from `INTEGRATION_SECRET_KEY`.

### OAuth Service + Controller
- `apps/nestjs-backend/src/features/oauth-integration/oauth-integration.service.ts` — `OAuthIntegrationService` CRUD, `getAuthorizationUrl`, `createFromOAuth`, `deactivate` with ownership check.
- `apps/nestjs-backend/src/features/oauth-integration/oauth.controller.ts` — `OAuthController` with authorize, callback, and revoke endpoints.

### Provider Clients (Phase 4 integration point)
- `apps/nestjs-backend/src/features/oauth-integration/providers/index.ts` — Barrel export + `createProviderClient(provider, accessToken)` factory. **Phase 4 AgentExecutionService imports this.**
- `apps/nestjs-backend/src/features/oauth-integration/providers/types.ts` — Typed response interfaces: `GmailMessage`, `CalendarEvent`, `CalendarEventInput`, `DriveFile`, `ChatSpace`, `MeetingSpace`, `SlackChannel`, `SlackSearchResult`.

### Webhook Engine
- `apps/nestjs-backend/src/features/oauth-integration/webhook.service.ts` — `OAuthWebhookService` with `registerWebhook`, `handleIncomingWebhook`, `getChannelToken`, Slack HMAC verification.
- `apps/nestjs-backend/src/features/oauth-integration/oauth-webhook.controller.ts` — `OAuthWebhookController` handling `POST /api/integrations/webhooks/:provider`.

### Module
- `apps/nestjs-backend/src/features/oauth-integration/oauth-integration.module.ts` — `OAuthIntegrationModule`. Updated across all 4 waves.
- `apps/nestjs-backend/src/app.module.ts` — Where `OAuthIntegrationModule` is registered (Wave 2 task).

### OpenAPI Schemas
- `packages/openapi/src/integration/index.ts` — `IIntegration`, `IIntegrationCreate`, `IIntegrationList`, `IIntegrationAuthorizeResponse`.

### Admin UI
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/integrations/IntegrationsPanel.tsx`
- `apps/nextjs-app/src/features/app/blocks/admin/setting/components/integrations/ProviderIcon.tsx`
- `apps/nextjs-app/src/features/app/blocks/admin/setting/AdminSetting.tsx` — Existing file; add Integrations nav entry.

### Existing Auth Patterns (read before implementing auth middleware integration)
- `apps/nestjs-backend/src/features/auth/` — Existing auth middleware; `req.user.id` is the user identity pattern used throughout.
- `apps/nestjs-backend/src/db-provider/prisma.service.ts` — `PrismaService` import path used in all NestJS services.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PrismaService` at `apps/nestjs-backend/src/db-provider/prisma.service.ts` — injected via NestJS DI in all service constructors.
- `EventEmitter2` from `@nestjs/event-emitter` — already available in the NestJS app; `OAuthIntegrationModule` imports `EventEmitterModule` and injects `EventEmitter2`.
- Existing `model Space` and `model User` in the Prisma schema — both require back-relation patches (`oauthIntegrations OAuthIntegration[]`).
- `@teable/ui-lib/shadcn/ui/button` and `@teable/ui-lib/shadcn/ui/badge` — UI components used in `IntegrationsPanel`.

### Established Patterns
- **NestJS services** inject `PrismaService` directly (not a repository layer).
- **Module exports** follow the pattern: `providers: [ServiceA, ServiceB], exports: [ServiceA, ServiceB]` — no separate export list for interfaces.
- **Auth context** on controllers: `(req as any).user?.id` to extract caller identity from existing auth middleware.
- **Node.js native fetch** (Node 18+) is used throughout — no `axios` or `node-fetch` for HTTP client calls.
- **Cookie pattern** for OAuth state: `res.cookie(name, value, { httpOnly: true, sameSite: 'lax', maxAge })`.
- **Prisma JSON query** for config fields uses `{ path: ['key'], equals: value }` pattern (see `getChannelToken`).

### Integration Points
- `OAuthIntegrationModule` → registered in `apps/nestjs-backend/src/app.module.ts` imports array.
- `createProviderClient()` factory → imported by Phase 4 `AgentExecutionService` from `../oauth-integration/providers`.
- `EventEmitter2 'oauth.webhook'` event → future `WorkflowService` subscription (not implemented in Phase 6).
- `IntegrationsPanel` → added to `AdminSetting.tsx` nav items array as `{ label: 'Integrations', path: 'integrations', component: IntegrationsPanel }`.
</code_context>

<specifics>
## Specific Ideas

### Environment Variables Required
| Variable | Required | Used By |
|---|---|---|
| `INTEGRATION_SECRET_KEY` | Yes (≥32 chars) | `OAuthIntegrationTokenService` — AES-256-CBC key |
| `GOOGLE_CLIENT_ID` | Yes | All 5 Google provider OAuth flows |
| `GOOGLE_CLIENT_SECRET` | Yes | Google token exchange and revocation |
| `SLACK_CLIENT_ID` | Yes | Slack OAuth flow |
| `SLACK_CLIENT_SECRET` | Yes | Slack token exchange |
| `SLACK_SIGNING_SECRET` | Yes | Slack webhook HMAC verification |
| `GOOGLE_PUBSUB_TOPIC` | Optional | Gmail push notification watch registration |
| `APP_BASE_URL` | Yes | Google Calendar webhook callback URL |

### Google Token Refresh URL Map
All Google providers: `https://oauth2.googleapis.com/token`
Slack: `https://slack.com/api/oauth.v2.access`

### Provider Client Methods Summary
| Client | Methods |
|---|---|
| `GmailClient` | `searchMessages(query, maxResults)`, `getMessage(id)`, `sendMessage(to, subject, body)` |
| `GoogleCalendarClient` | `listEvents(timeMin, timeMax, maxResults)`, `createEvent(input)` |
| `GoogleDriveClient` | `searchFiles(query)`, `readFile(fileId)` |
| `GoogleChatClient` | `sendMessage(spaceName, text)`, `listSpaces()` |
| `GoogleMeetClient` | `createMeetingSpace()` |
| `SlackClient` | `sendMessage(channel, text)`, `listChannels()`, `search(query)` |

### Webhook Event Name Mapping
| Provider | Emitted EventEmitter2 event name |
|---|---|
| SLACK | `slack.${event.type}` (e.g., `slack.message`) |
| GMAIL | `gmail.message.received` |
| GCALENDAR | `gcalendar.event.changed` |
| Other | `${provider.toLowerCase()}.event` |

### OAuth Popup Pattern
```
fetch /api/integrations/oauth/authorize/:provider?spaceId=X
→ window.open(url, 'oauth_popup', 'width=600,height=700')
→ provider consent screen
→ callback: store tokens, send postMessage({ type: 'oauth_success', provider })
→ parent: window.addEventListener('message') → fetchIntegrations()
```
</specifics>

<deferred>
## Deferred Ideas

- **`OAuthFieldSyncService` implementation** — `OAuthIntegrationFieldSync` model exists in DB after Wave 1, but the sync logic service is explicitly out of scope for Phase 6. No `OAuthFieldSyncService` is created.
- **WorkflowService subscription** to `oauth.webhook` EventEmitter2 events — Phase 6 only emits the events; a future task wires WorkflowService as a subscriber.
- **Rate limiting on webhook controller** — mentioned in threat model (100 req/min per IP) but not specified as a task in any plan.
- **Full audit logging** of webhook events — `lastTriggeredAt` timestamp is the only audit trail in Phase 6; dedicated audit logging deferred.
- **Google Drive / Chat / Meet webhook registration** — only Gmail and Google Calendar push registration are implemented in `OAuthWebhookService.registerWebhook()`. Other providers' webhook registration patterns are not implemented.
- **Refresh token rotation** — `refreshAccessToken()` updates the access token but does not handle refresh token rotation (some providers rotate refresh tokens on use).
- **Multi-account support** — one `OAuthIntegration` row per `(spaceId, provider, userId)` tuple; no explicit constraint prevents duplicate connections.
</deferred>

---

<testing>
## Testing Strategy

### Gate rule
`npx vitest run` + `npx tsc --noEmit` before each wave. Wave 4 requires Playwright E2E.

### Unit Tests (Vitest)
- `token.service.spec.ts` — test AES-256-CBC encrypt→decrypt roundtrip; test `InternalServerErrorException` when `INTEGRATION_SECRET_KEY` missing or < 32 chars
- `oauth.service.spec.ts` — mock `fetch`; test PKCE code verifier generation (43-128 chars, base64url); test token response parsing; test `refreshAccessToken` updates DB
- `webhook.service.spec.ts` — test Slack HMAC-SHA256 signature verification (valid sig passes, tampered sig throws 401); test Google channel token verification
- Provider client unit: mock `fetch`; test each provider method returns typed response on 200; throws on 4xx

### Integration Tests (Vitest + test DB)
- `GET /api/spaces/:spaceId/integrations` → 200 array (empty initially)
- `GET /api/oauth/:provider/authorize` → 302 redirect with PKCE params in URL
- `POST /api/oauth/:provider/callback` with valid code → 201; `OAuthIntegration` row created with encrypted tokens
- `DELETE /api/spaces/:spaceId/integrations/:id` → 204; tokens deleted from DB

### E2E Tests (Playwright — Wave 4)
- Open IntegrationsPanel → click "Connect Gmail" → OAuth popup opens → simulate callback → integration shows "Connected" badge
- Disconnect integration → status reverts to "Connect" button

### What NOT to test
- Actual Google/Slack OAuth server responses (use mocked tokens in tests)
- AES key management (tested in token.service.spec.ts unit test)
</testing>

*Phase: 06-google-slack-integrations*
*Context gathered: 2026-05-14 (testing added 2026-05-15)*
