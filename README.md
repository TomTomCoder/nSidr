<div align="center">
  <h1 align="center">
    <img alt="teable logo" height="150" src="static/assets/images/nSidr.png">
  </h1>
  <h3 align="center"><strong>Data platform · Autonomous agents · Workflows — built on real PostgreSQL</strong></h3>
  <p align="center">Teable gives you a spreadsheet interface over a real Postgres database, plus autonomous AI agents that read, write, and act across your data and connected services (Gmail, GitHub, Slack, Google Calendar…), event-driven workflows, semantic document search, and MCP extensions — all self-hostable, no vendor lock-in.</p>
  <p align="center">
    <strong>Self-hostable</strong> · <strong>Real-time collaboration</strong> · <strong>Autonomous agents</strong> · <strong>Workflows</strong> · <strong>RAG search</strong> · <strong>SQL-powered</strong> · <strong>No vendor lock-in</strong>
  </p>
  <p align="center">Try the hosted version at <a href="https://teable.ai">teable.ai</a> or self-host in minutes.</p>
</div>

<p align="center">
  <a target="_blank" href="https://teable.ai">Home</a> | <a target="_blank" href="https://help.teable.ai">Help</a> | <a target="_blank" href="https://teable.ai/blog">Blog</a> | <a target="_blank" href="https://teable.ai/templates">Templates</a> | <a target="_blank" href="https://help.teable.ai/en/api-doc/token">API</a> | <a target="_blank" href="https://community.teable.ai">Community</a> | <a target="_blank" href="https://twitter.com/teableio">Twitter</a>
</p>

<p align="center">
  <a aria-label="Build" href="https://github.com/teableio/teable/actions?query=Build%20and%20Push%20to%20Docker+Registry">
    <img alt="build" src="https://img.shields.io/github/actions/workflow/status/teableio/teable/docker-push.yml?label=Build&logo=github&style=flat-square&labelColor=000000" />
  </a>
  <a aria-label="Coverage Status" href="https://coveralls.io/github/teableio/teable?branch=develop">
    <img alt="Coverage" src="https://coveralls.io/repos/github/teableio/teable/badge.svg?branch=develop" />
  </a>
  <a aria-label="Top language" href="https://github.com/teableio/teable/search?l=typescript">
    <img alt="GitHub top language" src="https://img.shields.io/github/languages/top/teableio/teable?style=flat-square&labelColor=000&color=blue">
  </a>
  <a aria-label="Gurubase" href="https://gurubase.io/g/teable">
    <img alt="Gurubase" src="https://img.shields.io/badge/Gurubase-Ask%20Teable%20Guru-006BFF" />
  </a>
</p>

<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="static/assets/images/teable-interface-dark.png">
    <img alt="teable interface" width="100%" src="static/assets/images/teable-interface-light.png">
  </picture>
</h1>

---

## Self-Hosted Edition — All EE Features Unlocked

> This fork unlocks all Enterprise Edition features for self-hosters at no cost. No license key, no subscription, no usage caps.

| Feature | Status |
|---|---|
| Unlimited rows per base | ✅ |
| AI field, formula AI, and AI agent chat | ✅ |
| Autonomous agents (planner · executor · memory · scheduler) | ✅ |
| Agent sidebar integration (agents as first-class nodes in base sidebar) | ✅ |
| Agent memory graph (persistent entity/relation graph, auto-extraction, daily deduplication) | ✅ |
| Agent context graph tool (live nodes, fields, reference edges exposed as agent tool) | ✅ |
| Agent current-page awareness (active table/view injected into system prompt) | ✅ |
| Self-organising knowledge (fire-and-forget entity extraction from every saved memory) | ✅ |
| Agent knowledge base linking (doc library sources as RAG context per agent) | ✅ |
| Automations / workflows (unlimited runs, event + cron triggers) | ✅ |
| Advanced permissions & authority matrix | ✅ |
| Audit log & unlimited revision history | ✅ |
| Row coloring | ✅ |
| Password-restricted shares | ✅ |
| Custom authentication providers (SSO — GitHub, Google, OIDC) | ✅ |
| Domain verification & custom domain | ✅ |
| Organization management | ✅ |
| Admin panel (users, queues, AI settings, templates) | ✅ |
| Unlimited database connections | ✅ |
| Doc library with AI semantic search (RAG / Qdrant vector DB) | ✅ |
| MCP extension servers | ✅ |
| Connected accounts (Gmail, GitHub, Slack, Google Calendar/Drive/Meet) | ✅ |
| File storage (local · AWS S3 · MinIO) | ✅ |
| Background job queues with monitoring (BullMQ) | ✅ |
| OpenTelemetry tracing (OTLP export) | ✅ |

> 📋 Liste complète des fonctionnalités et de leurs dépendances internes : [docs/FEATURES.md](docs/FEATURES.md)

---

## Use cases

Teable is a good fit if you need any combination of these:

- **A no-code database** for teams who want the familiarity of a spreadsheet but the power of a real relational database underneath — with real SQL, real Postgres, no vendor lock-in.
- **An AI-powered operations hub** — agents that monitor your data and take action (send an email when a deal changes stage, open a GitHub issue when a bug is logged, summarize a week's records every Friday morning).
- **A lightweight ERP or CRM** — structured data, linked records, formula fields, granular permissions, and a REST API, without building it from scratch.
- **An internal knowledge base** — a doc library with full-text and AI semantic search, connected to live data in your bases.
- **A workflow automation platform** — event-driven triggers, cron jobs, multi-step agent pipelines, with human approval steps where needed.

---

## What You Can Do With Teable

### Organize data like a spreadsheet, store it like a database

Create **bases** (databases) containing multiple **tables**. Every cell you fill in goes straight into PostgreSQL — no proprietary format, no sync layer. You can connect to the same Postgres instance from any SQL client and query your data directly. There is no magic intermediary: the table you see in Teable is the table in Postgres.

### See your data the way you need it

Switch between **5 built-in views** on any table without duplicating data:

| View | Best for |
|---|---|
| **Grid** | General-purpose spreadsheet browsing and editing |
| **Kanban** | Status-based workflows, project boards |
| **Gallery** | Image-heavy records, visual catalogs |
| **Calendar** | Date-driven data, scheduling |
| **Form** | Collecting input from external users (public URL) |

### Work with data at scale

Teable is built for production data volumes, not just prototypes.

- Filter, sort, group, and search across **millions of rows** with sub-second response.
- **Aggregations** (sum, average, count, min/max) per field or across groups — displayed inline in the grid footer.
- **Formula fields** with 200+ functions (similar to spreadsheet formulas). Reference other fields, run date math, string manipulation, conditionals.
- **Linked records** — relate rows across tables, like foreign keys with a UI. Drag-and-drop to link, click-through to the related record.
- **Rollup fields** — aggregate values from linked records automatically (e.g. sum all invoice amounts linked to a customer).
- **Lookup fields** — pull any field value from a linked record into the current table without duplicating data.

### Collaborate in real-time

- Every change syncs instantly to all open sessions via WebSocket.
- **Comments** on individual records with @mentions.
- **Record history** — see every change, who made it, and when.
- **Undo/redo** at the field, record, or bulk-edit level.
- **Revision history** — restore any previous state of a record.

### Share and publish

- **Share a view** — generate a public read-only link for any view (optional password, expiry).
- **Share a base** — invite collaborators by email with granular roles (owner, editor, commenter, viewer).
- **Publish as template** — make a base publicly discoverable in the template gallery.
- **Embedded forms** — collect data via a public form URL, results land directly in your table.

### Build with SQL and the API

Because Teable stores data in real PostgreSQL, you are never locked into the UI.

- **SQL executor** — run raw SQL queries against your base directly from the UI. JOINs, aggregations, CTEs — all valid.
- **Entity-relationship diagram (ERD)** — visual schema browser showing all tables, fields, and foreign-key relations at a glance.
- **Base design view** — inspect and edit your schema (fields, types, relations) without touching SQL.
- **REST API** — every base exposes a full CRUD API automatically. Generate a personal token in Settings, then query with any HTTP client or the bundled TypeScript SDK.
- **Authority matrix** — fine-grained per-table and per-field permission control: different collaborators can have different rights on different tables within the same base.
- **External database connections** — connect to an existing Postgres database and expose its tables inside Teable without migrating any data. Great for adding a UI to a production database.

### AI agents — ask questions, automate tasks, act across services

#### Built-in assistant

Every base has a built-in **AI chat**. The assistant has live read/write access to your data and can execute actions directly. Explicit target buttons (Table, Interface, Automation, Agent, Application complète, Données fictives) let you tell the assistant exactly what to generate instead of relying on it to guess from free text — see [docs/AI-SYSTEM.md](docs/AI-SYSTEM.md) for the full architecture.

> *"Create a table for tracking customer support tickets with status, priority, and assignee"*  
> *"Find all overdue records and summarize them in a bullet list"*  
> *"Which deals have been stuck in the same stage for more than 14 days?"*

No tool configuration needed — it works out of the box once an AI provider is set up in the admin panel.

#### Dedicated agents

For automation that runs on its own, create a dedicated **Agent** (`/agent/new`). Agents use a **plan-and-execute architecture**: given an objective, the agent writes a step-by-step plan, executes each step with the available tools, checks the results, and retries or adapts if something fails.

**Triggers** — how an agent starts:
- Manual (chat message)
- Scheduled (cron expression — e.g. every day at 08:00)
- Record event (a row is created, updated, or deleted)
- Webhook (an external system calls a URL)

**Tools** — what an agent can do:
- Read, search, create, update, and delete records in any base it has access to
- Web search
- **Connected OAuth services**: Gmail (read/send emails), GitHub (issues, PRs, repos), Slack (post messages, read channels), Google Calendar (events), Google Drive (files), Google Meet (meetings)
- **MCP extensions**: install any MCP server into a space and its tools become available to agents in that space

**Safety**:
- **Human-in-the-loop (HITL)** — the agent can be configured to pause before sensitive actions (sending an email, deleting records) and wait for your explicit approval before proceeding.
- **Guardrails** — built-in checks prevent agents from taking actions outside their defined scope.

**Memory and knowledge graph** — agents maintain persistent memory across sessions via a `save_memory` tool. Each saved memory is also processed by an entity-extraction pipeline that populates a graph of `MemoryEntity` nodes and `MemoryRelation` edges. A nightly `memify` job deduplicates entities and reweights edges, so the graph self-organises over time. Agents can retrieve recent memories (`get_memory`), semantic-search them (`search_memory`), and store durable preferences — no re-explaining the same context each time.

**Context graph** — the `get_context_graph` agent tool returns a live snapshot of the current base: tables, fields (type, primary, required), automations, interfaces, agent nodes, knowledge sources, MCP connections, and foreign-key reference edges. The agent uses this to understand the full structure of the space before acting.

**Current-page awareness** — when the chat panel is open on a specific table or view, that context (`table="Leads"`, `view="Pipeline"`) is automatically injected into the agent's system prompt, so the agent can act on the right data without being told explicitly.

**Sidebar management** — agents appear as first-class nodes inside the base left sidebar under an "Agents" folder, with context-menu rename/delete actions (same pattern as tables and interfaces). Clicking an agent navigates to `/base/[baseId]/agent/[agentId]`, which renders with the full base sidebar (authority matrix, trash, design view, all resources). The agent config panel (wrench icon in chat header) supports in-place edit and a two-step delete confirmation.

**Example end-to-end flow**: An agent monitors a `Leads` table. When a new row appears with `Status = Qualified`, it searches Gmail for prior email threads with that lead, summarizes them, drafts a follow-up email for your review (HITL pause), then — after your approval — sends it and logs the action back into the `Activity` table.

### Document library

Each space has a **Doc Library** (`/space/[id]/doc-library`) — a collaborative document editor with AI-powered search.

- **Rich text editing**: headings, lists, code blocks, embeds, images.
- **Folder tree** for organizing documents into a structured hierarchy.
- **AI semantic search** — documents are automatically indexed in Qdrant (vector database). Search goes beyond exact keywords: ask a question in plain language and the search returns the most semantically relevant passages across all documents in the space. This is the same RAG (Retrieval-Augmented Generation) technique used by enterprise knowledge bases.
- Import documents from external sources.
- Agents in the space can query the doc library as a knowledge source — combine live database records with written documentation in the same agent context.

> **Requires Qdrant.** Run `docker compose -f docker-compose.qdrant.yml up -d` to enable semantic search locally.

### Integrations and extensions

**Connected accounts** — in user settings, each person links their own OAuth accounts. These become available as agent tools scoped to that user. Supported services:

| Service | What agents can do |
|---|---|
| Gmail | Read threads, search emails, send messages |
| GitHub | Read/create issues and PRs, query repos |
| Slack | Post to channels, read message history |
| Google Calendar | Create, read, and update calendar events |
| Google Drive | List, read, and create files |
| Google Meet | Create and manage meeting links |

Each user provides their own OAuth client credentials (client ID + secret) — Teable never stores a shared set of credentials for these services.

**MCP extensions** — install any [Model Context Protocol](https://modelcontextprotocol.io) server into a space. The server's tools immediately become available to all agents in that space. This is the extensibility layer: if a service publishes an MCP server, agents in Teable can use it without any code changes.

**Plugins** — embed custom UI panels (iframes with the Teable SDK) inside any base view. The plugin marketplace UI is at `/developer/plugin`.

**OAuth apps** — register a first-party OAuth application to use Teable as an identity provider for your own tools.

**Webhooks** — subscribe to record events (create, update, delete) and receive HTTP callbacks to any endpoint.

### Administration

- **Admin panel** (`/admin`) — manage users, organizations, instance settings, AI providers, background job queues, and templates.
- **AI model configuration** — connect any LLM provider from the admin UI (`/admin/ai-setting`), no env var juggling:
  - OpenAI (GPT-4o, GPT-4 Turbo, o1…)
  - Anthropic (Claude 3.5 Sonnet, Claude 4…)
  - Google Gemini, Azure OpenAI, Ollama (local models)
  - DeepSeek, Mistral, Groq, Cohere, and any OpenAI-compatible endpoint
- **Job queue monitor** (`/admin/queues`) — inspect and manage BullMQ background jobs (embedding, document ingestion, vector sync, workflow execution).
- **Trash** — deleted spaces, bases, and tables go to a recoverable trash before permanent deletion. Configurable retention period.

---

## Installation

### Quick Start (Recommended)

Teable has a **universal launcher** that auto-detects your environment and picks the best option:

```sh
git clone https://github.com/hoostn1/teable-ee.git
cd teable-ee
pnpm install

# Unix-like (macOS, Linux):
./launch

# Windows (PowerShell):
.\launch.ps1
```

The launcher will:
- 🔍 Detect your system, installed tools, and running services
- 🎯 Auto-select the fastest option available
- 🚀 Start everything with one command

**No other setup needed!** Just run `./launch` and open http://localhost:3000.

---

### Detailed Options

Choose manually if you prefer, or understand what `./launch` does behind the scenes:

| | Option 1 | Option 2 | Option 3 |
|---|---|---|---|
| **Platform** | macOS / Linux | Any OS with Docker | Any OS with Docker |
| **App runs** | Natively (Node.js) | Natively (Node.js) | In a container |
| **Services** | Local or auto-start | Docker Compose | Docker |
| **Hot-reload** | ✅ | ✅ | ❌ |
| **Requirements** | Node 20, pnpm 9, PG+Redis | Node 20, pnpm 9, Docker | Docker only |
| **Best for** | Active development | Any dev environment | CI/CD, testing, zero setup |

---

### Option 1 — Native (macOS / Linux with Homebrew or manual services)

Postgres and Redis must be running locally (auto-started via Homebrew on macOS, manual on Linux). The app runs natively — edits to the backend or frontend hot-reload instantly.

#### Setup

```sh
# Install dependencies (one time)
pnpm install
```

#### Running

```sh
# Auto-detect and launch (recommended)
./launch

# Or manually:
pnpm start:local                # standard launch
pnpm start:local:rebuild        # force backend rebuild
pnpm start:prod:local           # production mode (faster, no hot-reload)
```

#### Requirements

- **macOS:** `brew install node@20 pnpm postgresql@16 redis`
- **Linux (Debian/Ubuntu):** `apt-get install nodejs npm postgresql postgresql-contrib redis-server`
- **Node 20+, pnpm 9+**

#### Details

Web: **http://localhost:3000** · API: **http://localhost:3002**  
Logs: `/tmp/teable-backend.log` and `/tmp/teable-frontend.log`

To stop: `Ctrl+C` or `pkill -f 'nestjs-backend|next dev'`

---

### Option 2 — Docker Services + Native App (any OS)
# Stop
pkill -f 'nestjs-backend/dist/index.js'; pkill -f 'next dev'
```

---

PostgreSQL and Redis run in Docker Compose containers; the Node.js app runs natively on your machine. Hot-reloads on code changes. Works on any OS with Docker installed.

#### Setup

```sh
pnpm install  # one time
```

#### Running

```sh
# Auto-detect and launch (recommended)
./launch

# Or manually:
pnpm start:services         # start Docker Postgres + Redis
pnpm start:local            # then launch app natively (in another terminal)
```

#### Cleanup

```sh
pnpm stop:services          # stop containers, keep data
pnpm stop:services:clean    # stop and delete all data (full reset)
```

#### Requirements

- **Node 20+, pnpm 9+**
- **Docker Desktop** or Docker Engine + Compose

#### Details

Best for: dev on Linux, Windows, or non-Homebrew macOS. Faster than full Docker, easier setup than local services.

Web: **http://localhost:3000** · API: **http://localhost:3002**  
Logs: `/tmp/teable-backend.log` and `/tmp/teable-frontend.log`

---

### Option 3 — Full Docker Stack (zero local setup)

Everything runs in Docker containers. No local Node.js, pnpm, PostgreSQL, or Redis needed. Maximum portability, used for CI/CD and deployment. Slightly slower than native due to container overhead.

#### Running

```sh
# Auto-detect and launch (recommended)
./launch --force-docker

# Or manually:
pnpm start:docker:build     # build image (5-10 min, one-time)
pnpm start:docker           # start all containers
```

#### Cleanup

```sh
pnpm stop:docker            # stop containers, keep data
pnpm stop:docker:clean      # stop and delete all data
```

#### Requirements

- **Docker Desktop** or Docker Engine + Docker Compose (just Docker, no local Node.js needed)

#### Details

Web: **http://localhost:3000** · API: **http://localhost:3002**

Hot-reload is disabled in this mode (containers don't reflect local code changes until rebuilt). Suitable for:
- Testing production-like environments locally
- CI/CD pipelines
- Distributing pre-built images
- Zero local environment setup

> **Windows/WSL2:** Run all commands in a WSL2 terminal (Ubuntu/Debian) with Docker Desktop (WSL2 backend) enabled, then open http://localhost:3000 from Windows.

---

## Launcher Reference

The `./launch` (macOS/Linux) or `.\launch.ps1` (Windows) scripts auto-detect your setup and run the best option. They handle all complexity: service startup, port conflicts, image builds, readiness checks.

### Examples

```sh
./launch                    # auto-detect and run
./launch --force-docker     # always use full Docker
./launch --force-native     # always run native (must have PG+Redis)
./launch --help             # show options
```

---

### One-click cloud deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/wada5e?referralCode=rE4BjB)
[![Deploy on Sealos](https://sealos.io/Deploy-on-Sealos.svg)](https://template.sealos.io/deploy?templateName=teable)
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/QF8695)
[![Deploy to RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploylobe.svg)](https://repocloud.io/details/?app_id=273)
[![Deploy on Elestio](https://elest.io/images/logos/deploy-to-elestio-btn.png)](https://elest.io/open-source/teable)

---

### First-run setup

After launching for the first time:

1. Open **http://localhost:3000** and create your admin account.
2. Go to **Admin Panel → AI Settings** (`/admin/ai-setting`), select your LLM provider, and enter an API key. This enables AI chat, formula AI, agent execution, and document semantic search.
3. *(Optional)* Start a Qdrant instance for semantic search in the doc library:
   ```sh
   docker compose -f docker-compose.qdrant.yml up -d
   ```
   Then set `BACKEND_QDRANT_HOST=localhost` in your environment.
4. Create a **Space**, then a **Base** inside it, and start building tables.
5. *(Optional)* Create an **Agent** (`/agent/new`), connect OAuth accounts in your user settings, and set a trigger to start automating.

---

## Configuration reference

All environment variables are optional unless noted. Set them in your `.env` file (standalone) or in `docker-compose.full.yml` → `environment:`.

### AI / LLM
Configure from the Admin UI (`/admin/ai-setting`) — no env vars needed for most setups. Or set via env:

| Variable | Description |
|---|---|
| `BACKEND_AI_PROVIDER` | Default provider: `openai` \| `anthropic` \| `openai_compatible` |
| `BACKEND_OPENAI_API_KEY` | OpenAI API key |
| `BACKEND_ANTHROPIC_API_KEY` | Anthropic API key |
| `BACKEND_AI_BASE_URL` | Base URL for OpenAI-compatible endpoints (Azure, Ollama…) |
| `BACKEND_AI_MODEL` | Default model name |

### RAG / Document search (Qdrant)
Required to enable AI-powered semantic search in the Doc Library.

| Variable | Description |
|---|---|
| `BACKEND_QDRANT_HOST` | Qdrant host (default: `localhost`) |
| `BACKEND_QDRANT_PORT` | Qdrant port (default: `6333`) |
| `BACKEND_QDRANT_API_KEY` | Qdrant API key (cloud deployments) |

Use `docker compose -f docker-compose.qdrant.yml up -d` to spin up a local Qdrant instance.

### File storage
| Variable | Description |
|---|---|
| `BACKEND_STORAGE_PROVIDER` | `local` (default) \| `s3` \| `minio` |
| `BACKEND_STORAGE_S3_REGION` | AWS region |
| `BACKEND_STORAGE_S3_BUCKET` | S3 bucket name |
| `BACKEND_STORAGE_S3_ACCESS_KEY` | AWS access key ID |
| `BACKEND_STORAGE_S3_SECRET_KEY` | AWS secret access key |
| `BACKEND_STORAGE_MINIO_ENDPOINT` | MinIO endpoint URL |
| `BACKEND_STORAGE_MINIO_BUCKET` | MinIO bucket name |
| `BACKEND_STORAGE_MINIO_ACCESS_KEY` | MinIO access key |
| `BACKEND_STORAGE_MINIO_SECRET_KEY` | MinIO secret key |

### Email (optional — required for password reset and invitations)
| Variable | Description |
|---|---|
| `BACKEND_MAIL_HOST` | SMTP host |
| `BACKEND_MAIL_PORT` | SMTP port (default: `587`) |
| `BACKEND_MAIL_SECURE` | `true` for port 465 (TLS) |
| `BACKEND_MAIL_SENDER` | From address (e.g. `no-reply@example.com`) |
| `BACKEND_MAIL_AUTH_USER` | SMTP username |
| `BACKEND_MAIL_AUTH_PASS` | SMTP password |

### OAuth / SSO
| Variable | Description |
|---|---|
| `BACKEND_GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `BACKEND_GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `BACKEND_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `BACKEND_GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `BACKEND_OIDC_ISSUER` | OIDC issuer URL (generic SSO) |
| `BACKEND_OIDC_CLIENT_ID` | OIDC client ID |
| `BACKEND_OIDC_CLIENT_SECRET` | OIDC client secret |

### Observability
| Variable | Description |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint (e.g. `http://jaeger:4318`) |
| `OTEL_SERVICE_NAME` | Service name label in traces (default: `teable`) |

### Limits
| Variable | Default | Description |
|---|---|---|
| `MAX_FREE_ROW_LIMIT` | `100000` | Row cap per base (set to `0` for unlimited) |
| `MAX_ATTACHMENT_UPLOAD_SIZE` | `2147483648` (2 GB) | Max file upload size in bytes |
| `MAX_UNDO_STACK_SIZE` | `200` | Undo history depth per session |

---

## Performance tuning

| Variable | Description |
|---|---|
| `PRISMA_SLOW_QUERY_THRESHOLD_MS` | Log queries slower than N ms (e.g. `500`) |
| `PRISMA_CONNECTION_LIMIT` | Postgres connection pool size |
| `PRISMA_POOL_TIMEOUT` | Pool acquisition timeout (ms) |
| `PRISMA_TRANSACTION_TIMEOUT` | Max transaction duration (ms) |
| `PRISMA_TRANSACTION_MAX_WAIT` | Max time to wait for a transaction slot (ms) |
| `HEAP_SNAPSHOT=1` | Enable on-demand heap dump via `kill -USR2 <backend_pid>` |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (React) |
| Backend | NestJS (Node.js) |
| Database | PostgreSQL (via Prisma ORM) |
| Cache / Realtime | Redis |
| Vector DB | Qdrant (RAG embeddings for doc search) |
| Background jobs | BullMQ |
| AI providers | `ai-sdk` (OpenAI, Anthropic, Gemini, Groq, Cohere, Ollama…) |
| Observability | OpenTelemetry (OTLP export — Jaeger, Grafana, etc.) |
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript |

The backend serves both the REST API and the Next.js frontend on a single port (3000) — no separate static file server needed. The WebSocket server for real-time collaboration runs on port 3001, and the raw API is accessible on port 3002. In production, a reverse proxy (nginx, Traefik, Caddy) in front handles routing.

---

## Repository structure

```
.
├── apps/
│   ├── nextjs-app          # Frontend (Next.js)
│   └── nestjs-backend      # Backend (NestJS, 59 feature modules)
├── packages/
│   ├── core                # Shared interfaces and business logic
│   ├── sdk                 # Client SDK (used by frontend + plugins)
│   ├── openapi             # OpenAPI types and client
│   ├── db-main-prisma      # Prisma schema, migrations, generated client
│   ├── db-data-prisma      # Data-layer Prisma client
│   ├── common-i18n         # Locale files (10 languages)
│   ├── ui-lib              # Shared UI components (shadcn/ui)
│   └── v2/                 # New V2 architecture (CQRS / event sourcing)
├── plugins/                # Built-in plugin development (marketplace UI)
├── dockers/                # Dockerfiles and compose examples
└── scripts/                # Build, migration, and launch scripts
```

---

## Running tests

```sh
# Backend unit tests
cd apps/nestjs-backend && pnpm test-unit

# Frontend unit tests
cd apps/nextjs-app && pnpm test-unit
```

---

## License

Teable Community Edition (CE) is free for self-hosting under the **AGPL-3.0** license. See [./LICENSE](./LICENSE) for details.

This fork enables Enterprise Edition features (AI, authority matrix, automations, advanced admin) for self-hosters at no cost.
