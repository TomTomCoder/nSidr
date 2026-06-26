<!-- generated-by: gsd-doc-writer -->
# Configuration Reference

Teable is configured primarily through environment variables. In development, variables are loaded from `apps/nextjs-app/.env.development` (committed defaults) and `apps/nextjs-app/.env.development.local` (local overrides, gitignored). For Docker deployments, use `dockers/examples/standalone/.env`.

---

## Environment Variables

### Core (Required)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PRISMA_DATABASE_URL` | Yes | — | PostgreSQL connection string. Format: `postgresql://user:pass@host:port/db?schema=public&statement_cache_size=1` |
| `SECRET_KEY` | Yes | — | Random secret used for JWT signing. Generate with `openssl rand -hex 32`. |
| `PUBLIC_ORIGIN` | Yes | `http://localhost:3000` | Publicly reachable base URL of the app. Used for redirects and email links. |

### Redis / Caching

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_CACHE_PROVIDER` | No | — | Set to `redis` to enable Redis caching and BullMQ job queues. |
| `BACKEND_CACHE_REDIS_URI` | No | — | Redis connection URI, e.g. `redis://127.0.0.1:6379`. Required for BullMQ/BullBoard. If absent, job queues are disabled. |

### Server Ports

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP port the NestJS backend listens on. |
| `SOCKET_PORT` | No | `3001` (dev) / `3000` (prod) | WebSocket port. In combined production mode this matches `PORT`. |

### Development / Runtime

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_SKIP_NEXT_START` | No | — | Set to `true` in dev:separated mode so NestJS does not bootstrap Next.js. |
| `NODE_OPTIONS` | No | — | Pass `--max-old-space-size=4096` to set the NestJS heap limit (4 GB recommended for production). |
| `V2_COMPUTED_UPDATE_MODE` | No | — | Set to `async`. Do NOT set to `sync` — sync mode causes an OOM crash on boot. |
| `LOG_LEVEL` | No | `info` | Logging verbosity: `debug`, `info`, `warn`, `error`. |

### Storage

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_STORAGE_PROVIDER` | No | `local` | Storage backend: `local`, `s3`, or `minio`. |
| `BACKEND_STORAGE_PUBLIC_BUCKET` | No | `public` | Bucket name for public (readable) attachments. |
| `BACKEND_STORAGE_PUBLIC_URL` | No | `http://localhost:3000/api/attachments/read/public` | Base URL where public attachments are served. |

### Database (Advanced)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PRISMA_META_DATABASE_URL` | No | — | Optional: split-database override for metadata. Inherits `PRISMA_DATABASE_URL` when unset. |
| `PRISMA_DATA_DATABASE_URL` | No | — | Optional: split-database override for table data. Inherits `PRISMA_DATABASE_URL` when unset. |
| `PUBLIC_DATABASE_PROXY` | No | `127.0.0.1:5432` | Postgres host:port exposed to users for direct DB access via the Teable interface. |

### Build-time (Next.js)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_BUILD_ENV_EDITION` | No | `EE` | Edition flag baked into the Next.js bundle. `EE` enables all Enterprise Edition features. |
| `NEXT_BUILD_ENV_CSP` | No | `false` | Enable Content Security Policy headers. |
| `NEXT_BUILD_ENV_SENTRY_ENABLED` | No | `false` | Enable Sentry error tracking in the Next.js bundle. |
| `ANALYZE` | No | — | Set to `true` before running the build command to open the bundle analyzer. |

### Integration

| Variable | Required | Default | Description |
|---|---|---|---|
| `INTEGRATION_SECRET_KEY` | No | — | Shared secret for server-to-server integration calls. Must be at least 32 characters. |
| `API_DOC_DISENABLED` | No | `false` | Set to `true` to hide the Swagger/OpenAPI documentation endpoint. |

---

## AI Provider Setup

AI is configured through the admin UI, not environment variables. Navigate to `/admin/ai-setting` after logging in as an admin.

Supported providers (configured in the UI):

- OpenAI
- Anthropic (Claude)
- Google Gemini
- Azure OpenAI
- Ollama (local)
- DeepSeek
- Mistral
- Groq
- Cohere
- Any OpenAI-compatible endpoint

No environment variables are required for AI configuration.

---

## Docker Production Config

For Docker Compose deployments, edit `dockers/examples/standalone/.env`:

```dotenv
TIMEZONE=UTC

# PostgreSQL
POSTGRES_HOST=teable-db
POSTGRES_PORT=5432
POSTGRES_DB=teable
POSTGRES_USER=teable
POSTGRES_PASSWORD=<strong-random-password>   # CHANGE THIS

# Redis
REDIS_HOST=teable-cache
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=<strong-random-password>      # CHANGE THIS

# App
PUBLIC_ORIGIN=https://your-domain.com        # <!-- VERIFY: replace with your actual domain -->
PRISMA_DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
PUBLIC_DATABASE_PROXY=your-host:42345

BACKEND_CACHE_PROVIDER=redis
BACKEND_CACHE_REDIS_URI=redis://default:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}
```

The `setup.sh` script in that directory pre-populates `PUBLIC_ORIGIN` from your local network IP.

---

## Performance Tuning

| Setting | Recommendation |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=4096` | Set before starting the NestJS backend in production. |
| `V2_COMPUTED_UPDATE_MODE=async` | Keeps computed field updates off the boot path. |
| `CALC_CHUNK_SIZE=400` | Batch size for formula recalculation. Lower if you see memory spikes on large tables. |
| `BACKEND_CACHE_PROVIDER=redis` | Enable Redis for job queue support and improved caching. |

---

## Admin Panel Configuration

The following settings are managed via the admin UI rather than environment variables:

| Route | Purpose |
|---|---|
| `/admin/setting` | Instance name, sign-up policy, SMTP, OAuth providers |
| `/admin/ai-setting` | AI provider selection and API key entry |
| `/admin/performance` | Live backend performance metrics |
| `/admin/queues` | BullBoard job queue monitor (requires Redis) |
| `/admin/template` | Template gallery management |

> BullBoard at `/api/admin/queues` is only accessible when `BACKEND_CACHE_REDIS_URI` is set and Redis is reachable.
