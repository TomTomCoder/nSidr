<!-- GSD:GENERATED -->
<!-- generated-by: gsd-doc-writer -->

# Teable — Architecture

Teable is a self-hosted, spreadsheet-like database application (Airtable alternative) built as a TypeScript monorepo. It presents users with a collaborative, real-time spreadsheet UI backed by a relational PostgreSQL database, with AI-assisted field generation, automations, and an extension/plugin system.

---

## System Overview

The system is a full-stack monorepo managed with **pnpm workspaces** and **Turborepo**. A single NestJS backend process serves both the REST/WebSocket API and the Next.js frontend in production. In development, the two servers run on separate ports to avoid HMR conflicts. PostgreSQL is the primary data store, Redis provides caching and job queuing (BullMQ), and Socket.io delivers real-time collaboration.

---

## High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend  (apps/nextjs-app)                    │  │
│  │  React 18 · TanStack Query · Zustand · Tailwind/shadcn  │  │
│  └────────────────────────┬────────────────────────────────┘  │
└───────────────────────────┼────────────────────────────────────┘
            HTTP REST / WebSocket (Socket.io)
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  NestJS Backend  (apps/nestjs-backend)                          │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │  REST API   │  │ WS Gateway │  │  NextController           │ │
│  │  (features/)│  │ (ws/)      │  │  (serves Next.js build)  │ │
│  └──────┬──────┘  └─────┬──────┘  └──────────────────────────┘ │
│         │               │                                        │
│  ┌──────▼───────────────▼──────┐   ┌──────────────────────────┐ │
│  │  Core Feature Modules        │   │  BullMQ Workers           │ │
│  │  (auth, record, table, field │   │  IMPORT_QUEUE             │ │
│  │   base, space, ai, workflow, │   │  AI_GENERATION_QUEUE      │ │
│  │   oauth, plugin, undo-redo…) │   │  doc/vector workers       │ │
│  └──────────────┬──────────────┘   └──────────────────────────┘ │
└─────────────────┼───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │    Redis 7+  │
│  (Prisma ORM)│   │  cache/queue │
└──────────────┘   └──────────────┘
        │
┌───────▼──────────────────────────┐
│  packages/db-main-prisma          │
│  (schema · migrations · client)  │
└───────────────────────────────────┘

External:
  ┌──────────────────────────────────────────┐
  │  AI Providers (OpenAI · Anthropic ·      │
  │  Gemini · Ollama · custom OpenAI-compat) │
  └──────────────────────────────────────────┘

  ┌──────────────────────────────────────────┐
  │  Plugin Dev Server  (plugins/)  :3002    │
  └──────────────────────────────────────────┘
```

---

## Layer Breakdown

### Frontend — `apps/nextjs-app`

| Directory | Purpose |
|-----------|---------|
| `src/pages/` | Next.js file-based routing: `space/`, `base/`, `admin/`, `auth/`, `share/`, `setting/`, `developer/`, `invite/`, `oauth/` |
| `src/features/` | Feature slices: `app`, `auth`, `i18n`, `system` |
| `src/components/` | Shared UI components |
| `src/store/` | Zustand global state slices |
| `src/backend/` | Browser-side API client wrappers (calls to NestJS REST) |
| `src/lib/` | Utility helpers |

**Key dependencies:** React 18.3, Next.js, TanStack Query (staleTime=60s), Zustand, Tailwind CSS, shadcn/ui, Socket.io client, echarts (lazy-loaded), emoji-mart (lazy-loaded).

### Backend — `apps/nestjs-backend`

| Directory | Purpose |
|-----------|---------|
| `src/features/` | ~50 domain feature modules (see full list below) |
| `src/ws/` | Socket.io gateway (`ws.gateway.ts`; `ws.gateway.dev.ts` for dev mode) |
| `src/worker/` | BullMQ worker bootstraps: doc-worker, vector-sync-worker, embedding worker |
| `src/db-provider/` | Database provider abstraction |
| `src/share-db/` | ShareDB operational transform layer (real-time record editing) |
| `src/middleware/` | HTTP middleware (compression, logging, etc.) |
| `src/cache/` | Redis cache service |
| `src/configs/` | Environment-validated configuration modules |
| `src/global/` | Global guards, pipes, filters |
| `src/observability/` | OpenTelemetry tracing (`instrument.ts`, `tracing.ts`) |

**Key NestJS feature modules:**

`access-token` · `agent` · `aggregation` · `ai` · `app-builder` · `attachments` · `auth` · `authority-matrix` · `base` · `base-share` · `base-sql-executor` · `calculation` · `chat` · `collaborator` · `comment` · `dashboard` · `data-loader` · `database-view` · `doc-search` · `export` · `external-connection` · `field` · `graph` · `health` · `import` · `integrity` · `invitation` · `mail-sender` · `model` · `monitoring` · `next` · `notification` · `oauth` · `organization` · `pin` · `plugin` · `queue` · `record` · `selection` · `setting` · `share` · `space` · `table` · `template` · `trash` · `undo-redo` · `usage` · `user` · `view` · `workflow`

### Data Layer — `packages/db-main-prisma`

- Prisma schema at `prisma/postgres/schema.prisma`
- Generates the Prisma client consumed by the NestJS backend
- Owns all database migrations
- Requires PostgreSQL 15+

### Shared Packages — `packages/`

| Package | Purpose |
|---------|---------|
| `core` | Shared interfaces, field type definitions, utility functions |
| `sdk` | Extension/plugin SDK; TanStack Query client hooks for external use |
| `common-i18n` | i18n locale strings shared across apps |
| `i18n-keys` | Generated i18n key types |
| `ui-lib` | shadcn/ui component library (consumed by both Next.js app and plugins) |
| `db-main-prisma` | Prisma schema, migrations, generated client |
| `db-data-prisma` | Secondary Prisma schema (data isolation layer) |
| `formula` | Formula parsing and evaluation engine |
| `openapi` | OpenAPI spec types and validation |
| `icons` | Shared icon set |
| `eslint-config-bases` | Shared ESLint configurations |
| `v2` | V2 API compatibility layer |

---

## Port Layout

| Mode | Service | Port |
|------|---------|------|
| Development | Next.js frontend (HMR) | 3000 |
| Development | NestJS API + WebSocket | 3001 |
| Development | Plugin dev server | 3002 |
| Production | NestJS (serves Next.js + API + WS) | 3000 |

In production, `NextController` in `apps/nestjs-backend/src/features/next/` intercepts all non-API routes (`/admin/*`, `/space/*`, `/base/*`, etc.) and delegates rendering to `NextService`, which bootstraps the compiled Next.js app in-process.

---

## Data Flow — Typical Record Edit

1. User edits a cell in the browser (Next.js app).
2. The frontend sends a ShareDB OT op over the Socket.io WebSocket connection.
3. `WsGateway` (`src/ws/ws.gateway.ts`) receives the op and passes it to the ShareDB adapter.
4. The `calculation` module recomputes dependent formula fields and rollups.
5. Prisma writes the updated record to PostgreSQL.
6. The change is broadcast to all connected collaborators via Socket.io.
7. TanStack Query on connected clients receives the invalidation and refetches or merges optimistic updates.

For async work (CSV import, AI field generation):

1. The REST API endpoint enqueues a job to `IMPORT_QUEUE` or `AI_GENERATION_QUEUE` in Redis.
2. A BullMQ worker (`src/worker/`) processes the job out-of-band.
3. Progress and results are pushed to the client via Socket.io notifications.
4. BullBoard admin UI is available at `/api/admin/queues`.

---

## Authentication & Authorization

- **JWT-based auth**: NestJS guards validate Bearer tokens on all protected routes.
- **`@Public()` decorator**: Marks routes as open (no token required).
- **OAuth**: Full OAuth2 provider support (`src/features/oauth/`, `src/features/oauth-integration/`).
- **Authority matrix**: Fine-grained role/permission system (`src/features/authority-matrix/`).
- **Access tokens**: Long-lived API tokens for programmatic access (`src/features/access-token/`).

---

## AI Integration

- Configured via the admin panel at `/admin/ai-setting`.
- Supports multiple LLM providers: OpenAI, Anthropic, Gemini, Ollama, and any OpenAI-compatible endpoint.
- AI field generation queued through `AI_GENERATION_QUEUE` (BullMQ/Redis).
- Doc search and vector embeddings handled by dedicated workers in `src/worker/` (embedding worker, vector-sync worker, ingestion worker).

---

## Real-Time Collaboration

- **Socket.io** handles all WebSocket connections.
- In development, the WS server runs on port 3001 (`ws.gateway.dev.ts`) to avoid conflicts with Next.js HMR on port 3000.
- In production, WS and HTTP share port 3000 on the same NestJS process.
- ShareDB provides operational transform for concurrent record editing.

---

## Performance Design Decisions

| Decision | Rationale |
|----------|-----------|
| NestJS gzip compression middleware | Reduces payload size for large record sets |
| Lazy-loaded echarts + emoji-mart | Saves ~2 MB from initial bundle |
| `React.memo` on list row components | Prevents re-renders in large grid views |
| TanStack Query `staleTime=60s` | Reduces redundant API fetches for reference data |
| BullMQ async queues | Prevents blocking the request thread for heavy import/AI jobs |
| SWC compiler for NestJS | Faster TypeScript compilation in dev and CI |

---

## Build System

- **Turborepo** orchestrates the monorepo build pipeline with caching.
- **pnpm workspaces** manage package dependencies and linking.
- NestJS is compiled with **SWC** for fast builds.
- Next.js uses the standard Next.js build (`next build`).
- Plugin dev server runs independently via `packages/` plugin tooling on port 3002.

---

## Directory Structure Rationale

```
teable/
├── apps/
│   ├── nestjs-backend/   # API server + production frontend host
│   └── nextjs-app/       # Next.js frontend (dev standalone, prod in-process)
├── packages/
│   ├── core/             # Shared domain types and utilities
│   ├── sdk/              # Public extension SDK
│   ├── db-main-prisma/   # Single source of truth for DB schema
│   ├── ui-lib/           # Component library shared by app + plugins
│   ├── formula/          # Isolated formula engine (testable independently)
│   └── ...               # i18n, icons, openapi, eslint configs
├── plugins/              # Plugin dev environment and built-in plugins
└── docs/                 # Project documentation
```

The separation of `apps/` and `packages/` enforces a clear dependency direction: apps may depend on packages, but packages must not depend on apps. The `core` package is the innermost layer with no app-level dependencies.
