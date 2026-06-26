# Teable Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Browser)                              │
│                  http://localhost:3000                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP(S) + WebSocket
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                      Frontend (Next.js)                          │
│              apps/nextjs-app (:3000 dev / prod)                 │
│  - React components, pages, layouts                             │
│  - TanStack Query for API calls                                 │
│  - WebSocket for real-time grid sync                            │
│  - TypeScript + Tailwind CSS                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP REST API
                         │ GET/POST/PUT/DELETE
┌────────────────────────┴────────────────────────────────────────┐
│                    Backend API (NestJS)                          │
│              apps/nestjs-backend (:3002)                        │
│  - 59 feature modules (records, tables, fields, auth, etc.)     │
│  - GraphQL & REST endpoints                                     │
│  - Service layer (business logic)                               │
│  - Job queues (BullMQ)                                          │
│  - WebSocket gateway (:3001)                                     │
└──────┬──────────────────────────────────────────────────┬───────┘
       │                                                   │
       │ SQL (Prisma ORM)                      SQL (Prisma ORM)
       │                                                   │
   ┌───┴─────────────────┐              ┌──────────────────┴───┐
   │   PostgreSQL        │              │   Redis (Cache)      │
   │   (Data store)      │              │   (Queues, pubsub)   │
   │   - Tables          │              │                       │
   │   - Records         │              │   Optional for        │
   │   - Users           │              │   Qdrant if enabled   │
   │   - Audit log       │              │   (vector search)     │
   │   - Vector embeddings
   │   (pgvector)        │              │                       │
   └─────────────────────┘              └──────────────────────┘
```

## Component Architecture

### Frontend (apps/nextjs-app)

**Tech Stack:**
- **Framework:** Next.js 14+ (React 18+)
- **State:** TanStack Query (React Query) for server cache
- **Store:** Zustand for client UI state
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript
- **Build:** webpack 5 (SWC transpiler)

**Key Directories:**
- `src/pages/` — Next.js pages and routes
- `src/features/` — Feature-specific modules
- `src/components/` — Reusable React components
- `src/hooks/` — Custom React hooks
- `src/stores/` — Zustand state stores

**Features:**
- Real-time grid with millions of rows (virtualization)
- 5 view types: Grid, Kanban, Calendar, Gallery, Form
- Formula editor with syntax highlighting
- Drag-and-drop for reordering, linking records
- Real-time collaboration via WebSocket

### Backend (apps/nestjs-backend)

**Tech Stack:**
- **Framework:** NestJS (Node.js, TypeScript)
- **ORM:** Prisma (PostgreSQL)
- **Auth:** JWT, OAuth, SSO (OIDC)
- **Jobs:** BullMQ + Redis
- **Real-time:** WebSocket gateway (Socket.IO)
- **Language:** TypeScript

**Feature Modules (src/features/):**
- **auth** — JWT, OAuth, OIDC, sessions
- **record** — CRUD, bulk ops, permissions
- **table** — table schema, views, calculations
- **field** — field types, formulas, lookups
- **base** — database/workspace management
- **space** — organization/team spaces
- **doc-search** — document library, semantic search (Qdrant)
- **ai** — agent execution, memory, LLM providers
- **workflow** — automations, event triggers, cron
- **plugin** — plugin system, third-party extensions
- **sharedb** — collaborative editing (Y.js)
- **external-connection** — connected databases
- **oauth** — Gmail, GitHub, Slack, Google integration

**Key Services:**
- `PrismaService` — database access layer
- `JwtService` — token management
- `PermissionService` — row/field-level access control
- `CacheService` — Redis caching
- `QueueService` — background job processing

### Database (PostgreSQL)

**Schema:**
- `users` — user accounts
- `spaces` — organizations
- `bases` — databases (folders for tables)
- `tables` — main data containers
- `fields` — column definitions
- `records` — rows (table-specific via record_${tableId})
- `views` — filtered/grouped table views
- `formulas` — calculated fields
- `automations` — workflow triggers
- `audit_logs` — action tracking
- `agents` — AI agent configs
- `memory_entity` — agent memory graph entities
- `memory_relation` — agent memory relationships
- `doc_*` — document library tables

**Extensions:**
- `pgvector` — vector embeddings for semantic search
- `uuid-ossp` — unique IDs
- `plpgsql` — stored procedures

### Packages (packages/)

**Core packages:**
- **@teable/core** — shared types, constants, utilities
- **@teable/sdk** — client SDK (React hooks, API client)
- **@teable/openapi** — OpenAPI types, auto-generated
- **@teable/ui-lib** — shadcn/ui component library
- **@teable/formula** — formula parser + executor
- **@teable/db-main-prisma** — main DB schema + migrations
- **@teable/db-data-prisma** — read-only data layer
- **@teable/v2** — experimental CQRS architecture (future)

### V2 Architecture (packages/v2/)

**Experimental event-sourcing layer:**
- Domain-Driven Design (DDD) with CQRS
- Specification pattern for complex conditions
- Visitor pattern for table operations
- Event log as source of truth
- Gradual migration path from current V1

## Launch Options Comparison

| Aspect | Native | Services | Full Docker |
|--------|--------|----------|------------|
| **Frontend** | Node.js (native) | Node.js (native) | Docker |
| **Backend** | Node.js (native) | Node.js (native) | Docker |
| **Database** | Local/Homebrew | Docker Compose | Docker |
| **Cache** | Local/Homebrew | Docker Compose | Docker |
| **Speed** | ⚡ Fastest | ⚡ Fast | 🐌 Slower |
| **Setup** | 🔨 Most complex | ⚡ Medium | ✨ Simplest |
| **Hot-reload** | ✅ Full | ✅ Full | ❌ None |
| **CI/CD** | ❌ No | ⚠️ Partial | ✅ Yes |
| **Isolation** | ❌ Low | ⚠️ Medium | ✅ High |

## Development Workflow

### Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ./launch  # auto-detects best option
   ```

2. **Frontend changes:**
   - Edit `apps/nextjs-app/src/` files
   - Hot-reload happens automatically
   - Check http://localhost:3000

3. **Backend changes:**
   - Edit `apps/nestjs-backend/src/` files
   - Hot-rebuild via swc (fast)
   - Logs in `/tmp/teable-backend.log`

4. **Database schema changes:**
   - Modify `packages/db-main-prisma/prisma/schema.prisma`
   - Run migration: `pnpm -F @teable/db-main-prisma db:migrate:dev`
   - Generates Prisma client automatically

5. **Testing:**
   ```bash
   pnpm g:test-unit       # run all unit tests
   pnpm g:test-e2e        # run Playwright end-to-end tests
   pnpm g:lint            # lint all packages
   pnpm g:typecheck       # type-check all packages
   ```

### Production Build

```bash
pnpm g:build            # build all packages
pnpm start:prod:local   # run optimized bundle locally
```

Or via Docker:
```bash
pnpm start:docker:build
pnpm start:docker       # or deploy the image
```

## Performance Optimization

### Frontend
- **Code splitting:** Route-based chunks (Next.js automatic)
- **Bundling:** webpack 5 with tree-shaking
- **Runtime:** Lazy component loading, image optimization
- **Grid:** Virtual scrolling for 1M+ rows
- **Caching:** TanStack Query (SWR pattern)

### Backend
- **Database:** Prisma query optimization, connection pooling
- **Caching:** Redis layer for hot data (fields, tables, views)
- **Jobs:** BullMQ for async operations (email, webhooks, indexing)
- **Indexing:** PostgreSQL indexes on frequently-queried columns

### Monitoring
- **Slow queries:** `PRISMA_SLOW_QUERY_THRESHOLD_MS=500`
- **Heap profiling:** `HEAP_SNAPSHOT=1 bash scripts/launch-local.sh`
- **OpenTelemetry:** Export traces to Jaeger, Grafana (optional)

## Security

- **Auth:** JWT tokens, refreshable sessions, CSRF protection
- **Permissions:** Row-level security (RLS) via PostgreSQL + app logic
- **Field-level:** Column-level deny-list override
- **Audit log:** Immutable record of all changes (who, what, when)
- **OAuth:** Third-party SSO (GitHub, Google, custom OIDC)
- **Encryption:** TLS for transport, sensitive data encrypted at rest (optional)

## Deployment

### Self-Hosted

1. **Docker Compose (production):**
   ```bash
   docker compose -f docker-compose.full.yml up -d
   ```

2. **Kubernetes:**
   - Build image: `docker build -f dockers/teable/Dockerfile -t myregistry/teable:latest .`
   - Deploy via Helm or raw manifests

3. **Environment variables:**
   - `BACKEND_DATABASE_URL` — PostgreSQL connection
   - `BACKEND_REDIS_URL` — Redis connection
   - `BACKEND_AI_PROVIDER` — LLM (openai, anthropic, etc.)
   - `BACKEND_JWT_SECRET` — signing key
   - `BACKEND_QDRANT_HOST` — vector DB (optional)

### Cloud Platforms

- **Railway, Render, Vercel:** Use `.env.production`
- **AWS, GCP, Azure:** Container registry + managed DB

## Future Roadmap

- **V2 Migration:** Gradual move to event-sourcing CQRS
- **Real-time:** Upgrade from Socket.IO to WebSocket standard
- **Performance:** Streaming responses for large exports
- **AI:** Advanced agent planning, memory graph indexing
- **Extensibility:** Plugin marketplace with sandboxing

## Resources

- **GitHub:** https://github.com/teableio/teable-ee
- **Docs:** https://help.teable.ai
- **Community:** https://community.teable.ai
- **Issues:** Report bugs at https://github.com/teableio/teable-ee/issues
