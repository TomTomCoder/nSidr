# Architecture

**Analysis Date:** 2026-05-24

## System Overview

Teable is a full-stack database management system with a NestJS backend and Next.js frontend, both running on a single Node.js process. The architecture uses PostgreSQL as the primary database, Redis for caching/sessions, and WebSockets for real-time collaboration via ShareDB.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (React SPA)                             │
│         `apps/nextjs-app/src` — Pages, Components, Features                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  Pages:                                                                      │
│  - `pages/space/*` (Workspace/Base views)                                   │
│  - `pages/base/*` (Table/View management)                                   │
│  - `pages/auth/*` (Authentication flows)                                    │
│  - `pages/setting/*` (User/Organization settings)                           │
│  - `pages/admin/*` (Admin panel)                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                         API Layer (HTTP)                                     │
│                 Socket Proxy via next.config.js rewrites                    │
│                        /socket → port 3001 (dev WebSocket only)             │
├──────────────────────────────────────────────────────────────────────────────┤
│                    NestJS Backend (Express Server)                           │
│            `apps/nestjs-backend/src` — Controllers, Services                │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│  Core Modules:   │  Feature Modules │ Infrastructure   │ Real-Time Layer    │
│  - Base          │ - Organization   │ - Config         │ - WebSocket (WS)   │
│  - Space         │ - User/Auth      │ - Middleware     │ - ShareDB          │
│  - Table/View    │ - Record         │ - Filters        │ - Socket.io        │
│  - Field         │ - Chat/Comments  │ - Pipes          │ - Undo/Redo        │
│  - Collaborator  │ - Attachments    │ - Observability  │                    │
│                  │ - AI/Chat        │ - Logger         │                    │
└────────────┬─────┴────────┬─────────┴────────┬────────┴────────┬───────────┘
             │              │                  │                 │
             ▼              ▼                  ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Shared Packages                                        │
│  @teable/core — Type definitions, interfaces, constants                    │
│  @teable/openapi — OpenAPI specs and types                                 │
│  @teable/db-main-prisma — Primary database schema (Meta)                   │
│  @teable/db-data-prisma — Data table schema (Tables)                       │
│  @teable/sdk — Client SDK for external integrations                        │
│  @teable/ui-lib — React component library                                  │
│  @teable/formula — Formula expression parser/evaluator                     │
│  @teable/icons — SVG icon components                                       │
│  @teable/v2-* — V2 API contracts and implementations                       │
└──────────────────────────────────────────────────────────────────────────────┘
             │              │                  │                 │
             ▼              ▼                  ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          External Services                                   │
│  PostgreSQL (Primary data store)                                             │
│  Redis (Sessions, cache, Bull queues)                                        │
│  S3/Attachment storage                                                       │
│  Email (Nodemailer)                                                          │
│  AI APIs (OpenAI, Anthropic, Azure, Bedrock, etc.)                          │
│  OAuth Providers (Google, GitHub, OpenID Connect)                           │
│  Sentry (Error tracking)                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Next.js App** | Web UI, routing, client-side state, API calls | `apps/nextjs-app` |
| **NestJS Backend** | REST API, real-time sync, business logic, DB queries | `apps/nestjs-backend` |
| **Features (Backend)** | Domain-specific modules (Auth, Records, Spaces, etc.) | `apps/nestjs-backend/src/features/` |
| **Core Package** | Type definitions, constants, shared interfaces | `packages/core` |
| **DB Main Prisma** | Metadata schema (organizations, tables, fields, views) | `packages/db-main-prisma` |
| **DB Data Prisma** | Data table schema (record rows) | `packages/db-data-prisma` |
| **SDK** | External API client for integration | `packages/sdk` |
| **UI Library** | Reusable React components | `packages/ui-lib` |
| **Formula Package** | Expression parsing and evaluation | `packages/formula` |
| **WebSocket Layer** | Real-time collaboration via ShareDB | `apps/nestjs-backend/src/ws/` |

## Pattern Overview

**Overall:** Monorepo with modular NestJS backend and Next.js frontend. In development, Next.js serves the UI on **port 3000** (user-facing) and NestJS backend API runs on **port 3001**. In production, NestJS serves both the API and Next.js frontend on port 3000. Real-time collaboration uses ShareDB with WebSocket bridge.

**Key Characteristics:**
- **Monorepo structure:** pnpm workspaces across `apps/` and `packages/`
- **Feature-driven backend:** Each feature (users, bases, records) is a self-contained NestJS module
- **API-first design:** OpenAPI specs generated from code, SDK auto-generated
- **Dual database pattern:** Meta database (PostgreSQL main) + data database (PostgreSQL data)
- **Real-time sync:** ShareDB for operational transformation on records
- **Plugin architecture:** Support for custom plugins via plugin system
- **AI-integrated:** Multiple AI provider support (OpenAI, Anthropic, etc.)

## Layers

**Web Frontend (Next.js):**
- Purpose: User interface, state management, client-side data caching
- Location: `apps/nextjs-app/src`
- Contains: Pages, React components, feature-specific UI, state stores
- Depends on: NestJS API, shared packages (@teable/*)
- Used by: Web browser clients

**API Gateway (NestJS Controllers):**
- Purpose: HTTP endpoint handling, request validation, response formatting
- Location: `apps/nestjs-backend/src/features/*/controllers/`
- Contains: REST controller routes, OpenAPI decorators, request/response DTOs
- Depends on: Service layer, validation pipes, guards
- Used by: Frontend, external API consumers, mobile clients

**Service Layer (NestJS Services):**
- Purpose: Business logic, database operations, domain rules
- Location: `apps/nestjs-backend/src/features/*/services/`
- Contains: Database queries, calculations, integrations with other services
- Depends on: Repositories, external APIs, other services
- Used by: Controllers, scheduled jobs, real-time handlers

**Repository/Data Layer:**
- Purpose: Database abstraction
- Location: `apps/nestjs-backend/src/features/*/repository/` (or directly in services via Prisma)
- Contains: Query builders, database access patterns
- Depends on: Prisma clients from `@teable/db-main-prisma` and `@teable/db-data-prisma`
- Used by: Service layer

**Real-Time Layer (WebSocket):**
- Purpose: Live collaboration via operational transformation
- Location: `apps/nestjs-backend/src/ws/`
- Contains: ShareDB connection handlers, operation log streaming, socket adapters
- Depends on: ShareDB, service layer for state verification
- Used by: Frontend clients via WebSocket

**Shared Packages:**
- Purpose: Type definitions, utilities, reusable logic across frontend and backend
- Location: `packages/*`
- Contains: DTOs, interfaces, constants, enums, client SDK
- Depends on: External libraries (zod, etc.)
- Used by: Both frontend and backend

## Data Flow

### Primary Request Path (REST API)

1. Browser sends HTTP request (`pages/base/[baseId].tsx` calls API) → Next.js middleware/pages
2. Next.js routes to backend via proxy (socket rewrite for `/socket`, API calls to `/api`)
3. Backend NestJS controller receives request (`features/*/controllers/*.ts`)
4. Controller validates input with Zod pipes (`src/zod.validation.pipe.ts`)
5. Controller calls service layer (`features/*/services/*.ts`)
6. Service queries database via Prisma (`@teable/db-main-prisma` or `@teable/db-data-prisma`)
7. Service applies business logic (filters, calculations, permissions)
8. Service returns DTOs to controller
9. Controller responds with HTTP 200 + JSON body
10. Next.js receives and stores data in client state (Zustand/React Query)
11. Frontend re-renders components with new data

**Example:** Fetch records from a table
- Request: `GET /api/v1/base/{baseId}/table/{tableId}/record`
- Controller: `RecordOpenApiController.readRecords()`
- Service: `RecordService.readRecords()` — builds query via DB filters
- Response: `{ records: [...], total: N }`

### Real-Time Collaboration Path (WebSocket)

1. Frontend connects WebSocket to `/socket` (proxied to NestJS on 3001 in dev, same port 3000 in prod)
2. NestJS WS gateway accepts connection (`ws/ws.gateway.ts`)
3. Client subscribes to record changes via `@SubscribeMessage('subscribe')` → `RecordService.watchChanges()`
4. User edits record → Frontend sends `@SendMessage('updateRecord')`
5. WS gateway receives, validates, calls service
6. Service writes to database (records table)
7. ShareDB operation log generated and published
8. All connected clients receive operation via broadcast
9. Frontend applies operation locally via `applyOperation()`
10. UI updates optimistically and reconciles with server state

**Example:** Edit cell value
- Event: `updateRecord` with `{ recordId, fieldId, value }`
- Service: `RecordService.updateRecord()` → writes to data database
- Broadcast: All subscribers get operation event
- Client: Receives operation, updates local cache, re-renders

### Authentication Path

1. User navigates to `/auth/login` or clicks OAuth provider button
2. Frontend calls `/api/v1/auth/login` with credentials or OAuth code
3. Backend `AuthController.login()` validates and generates JWT
4. Response includes `accessToken` (JWT) and optional `refreshToken`
5. Frontend stores in cookie (HTTP-only) via cookie handler
6. Subsequent API calls include `Authorization: Bearer {token}`
7. NestJS `JwtGuard` middleware validates token on each request (`features/auth/guards/jwt.guard.ts`)
8. If invalid, responds with 401 → Frontend redirects to login

### Initialization Path (Page Load)

1. Browser requests `https://app.teable.io/` (or **localhost:3000** in dev)
2. Next.js SSR or ISR renders initial HTML (`pages/_app.tsx`)
3. React hydrates with initial state from getServerSideProps/getStaticProps
4. Frontend connects WebSocket to backend
5. Redux/Zustand store initializes with user data from session
6. Page-specific features lazy-load additional data via API calls
7. UI becomes fully interactive

## Key Abstractions

**Feature Module:**
- Purpose: Encapsulates a domain area (e.g., "Record", "Chat", "Collaborator")
- Examples: `features/record`, `features/chat`, `features/collaborator`
- Pattern: Each feature has `*.module.ts`, `*.service.ts`, `*.controller.ts`, DTOs, guards, entities
- Benefits: Modularity, easy testing, clear boundaries

**OpenAPI Module:**
- Purpose: Exposes core feature APIs with OpenAPI documentation
- Examples: `features/record/open-api/record-open-api.module.ts`
- Pattern: Wrapper module that re-exports service and controller for external consumption
- Benefits: Consistent versioning (v1, v2), auto-generated SDK

**Database Schema Package:**
- Purpose: Prisma schema + generated client for type-safe queries
- Examples: `@teable/db-main-prisma` (meta), `@teable/db-data-prisma` (records)
- Pattern: Each schema is a separate package with its own Prisma client instance
- Benefits: Schema isolation, independent migrations, type safety

**Plugin System:**
- Purpose: Allow third-party code to extend functionality
- Location: `features/plugin/`
- Pattern: Plugins run in secure sandbox, receive sandboxed API
- Benefits: Extensibility without modifying core code

**Event Emitter:**
- Purpose: Pub/sub system for internal events
- Location: `src/event-emitter/`
- Pattern: Services publish events when state changes (e.g., `record:updated`)
- Benefits: Loose coupling, easy to hook into workflows

## Entry Points

**Backend:**
- Location: `apps/nestjs-backend/src/bootstrap.ts`
- Triggers: `npm start` or `npm run dev`
- Responsibilities: 
  - NestFactory creates NestJS app from `AppModule`
  - Registers global middleware (helmet, validation pipes, exception filters)
  - Sets up Swagger documentation
  - Starts HTTP server on port from env (default 3001)
  - Enables graceful shutdown hooks

**Frontend:**
- Location: `apps/nextjs-app/src/pages/_app.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities:
  - Initializes React context and providers (Zustand stores, i18n, theme)
  - Wraps all pages with layout components
  - Sets up global error boundaries
  - Loads theme CSS

**Workspace Configuration:**
- Location: `pnpm-workspace.yaml` (or `package.json` workspaces)
- Purpose: Defines monorepo structure, links packages
- Files: `apps/`, `packages/`, `plugins/`

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. CPU-intensive operations (AI, exports) offloaded to job queues (Bull).
- **Global state:** Minimal module-level state. Services are NestJS singletons per dependency injection. Redis used for distributed state.
- **Circular imports:** Prevented via feature module boundaries. Core package has no dependencies on features.
- **Database connections:** Two Prisma clients (`db-main`, `db-data`) managed separately. Migrations run independently.
- **WebSocket scalability:** ShareDB requires Redis adapter for multi-process deployments. Dev uses in-memory.
- **Session storage:** Redis required for production (configured via `REDIS_URL` env var).
- **Port binding:** NestJS backend and Next.js frontend run on same process. WebSocket proxied from `/socket` → NestJS backend server.

## Anti-Patterns

### Direct Database Queries in Controllers

**What happens:** Controller uses Prisma directly instead of calling service
```typescript
// BAD
@Get(':id')
async getRecord(@Param('id') id: string) {
  return this.prisma.record.findUnique({ where: { id } });
}
```

**Why it's wrong:** Duplicates business logic, breaks layer isolation, makes testing hard

**Do this instead:** Call service layer
```typescript
// GOOD
@Get(':id')
async getRecord(@Param('id') id: string) {
  return this.recordService.getById(id);
}
```
Location: `apps/nestjs-backend/src/features/*/controllers/*.ts` should import from `services/`

### Mixing Frontend and Backend Code

**What happens:** Importing NestJS modules or server-only code in React components
```typescript
// BAD
import { RecordService } from '@teable/backend/features/record/services';
```

**Why it's wrong:** Breaks Next.js bundling, exposes backend secrets to client

**Do this instead:** Call backend via HTTP/WebSocket
```typescript
// GOOD
const records = await fetch('/api/v1/record').then(r => r.json());
```
Location: Frontend code should only import from `apps/nextjs-app/` and shared `packages/`

### Monolithic Feature Modules

**What happens:** Feature module has 10+ service classes, 100+ KB of code
```typescript
// BAD: recording/recording.module.ts with mixed concerns
```

**Why it's wrong:** Hard to test, understand, or modify; violates single responsibility

**Do this instead:** Break into focused sub-features or repositories
```typescript
// GOOD: recording/recording.module.ts imports sub-services
export class RecordingModule {
  imports: [RecordingRepositoryModule, RecordingQueryModule];
}
```
Location: Check `apps/nestjs-backend/src/features/` for well-factored examples like `record/` (split by concerns)

---

*Architecture analysis: 2026-05-24*
