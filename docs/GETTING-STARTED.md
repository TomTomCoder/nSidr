<!-- GSD:GENERATED -->
<!-- generated-by: gsd-doc-writer -->

# Getting Started with Teable

Teable is a self-hosted, spreadsheet-like database application (Airtable alternative) with all enterprise features unlocked.

---

## Prerequisites

Before starting, ensure you have all of the following installed:

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | `>= 22.0.0` | Required by engine spec |
| pnpm | `>= 9.13.0` | `npm i -g pnpm` |
| PostgreSQL | `15+` | Can be supplied via Docker |
| Redis | `7+` | Can be supplied via Docker |
| Docker (optional) | any | Required for Options A and B; not needed for Option C manual install |

---

## Option A — Docker (one command, fastest)

If you only want to run Teable without editing code:

```bash
cd dockers/examples/standalone
docker compose up -d
```

The app will be available at http://localhost:3000.

---

## Option B — Automated setup script (recommended for development)

This script checks prerequisites, creates `.env`, starts PostgreSQL + Redis via Docker, installs dependencies, builds shared packages, and runs database migrations.

```bash
bash scripts/setup.sh
```

After the script completes, start the dev server:

```bash
pnpm dev:separated
```

- Next.js frontend: http://localhost:3000
- NestJS backend API: http://localhost:3002

---

## Option C — Manual setup

Use this if you are managing PostgreSQL and Redis yourself (without Docker).

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd teable
```

### 2. Configure environment

```bash
cp apps/nextjs-app/.env.example apps/nextjs-app/.env
```

Open `apps/nextjs-app/.env` and set at minimum:

| Variable | Required | Description |
|----------|----------|-------------|
| `PRISMA_DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://teable:teable@127.0.0.1:5432/teable` |
| `SECRET_KEY` | Yes | Random string used for JWT, session, and share signing |
| `PUBLIC_ORIGIN` | Yes | Public URL of the app, e.g. `http://localhost:3000` |
| `BACKEND_CACHE_REDIS_URI` | Optional | Redis URI; defaults to sqlite cache if not set. e.g. `redis://default:teable@127.0.0.1:6379/0` |
| `BACKEND_STORAGE_PROVIDER` | Optional | `local` (default), `minio`, or `s3` |

### 3. Install dependencies

```bash
pnpm install --frozen-lockfile
```

### 4. Build shared packages

This step is required before running the dev server for the first time.

```bash
pnpm build:packages
```

### 5. Run database migrations

```bash
pnpm --filter @teable/db-main-prisma prisma:migrate:deploy
```

### 6. Start the dev server

```bash
pnpm dev:separated
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3002

---

## First login

1. Open http://localhost:3000 in your browser.
2. Create your admin account on the signup screen (first user becomes admin).
3. (Optional) Configure AI features at http://localhost:3000/admin/ai-setting.

---

## Available dev scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:separated` | Run Next.js (:3000) + NestJS (:3002) with hot reload on both — recommended for active development |
| `pnpm dev:separated:light` | Same as above but serves a pre-built NestJS bundle instead of compiling — faster startup |
| `pnpm start:separated` | Production-mode run: builds all workspaces then starts web (:3000) + API (:3002) |
| `pnpm start:prod-local` | Full build + `start:separated` in one command |
| `pnpm build:packages` | Build all shared packages (required once before first dev run) |
| `pnpm g:build` | Build all workspaces |
| `pnpm g:test` | Run all tests (e2e + unit) |
| `pnpm g:lint` | Lint all workspaces |
| `pnpm g:typecheck` | Type-check all workspaces |

---

## Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Port 3000 already in use | Another process is using the port | `lsof -i:3000` to find the PID, then `kill -9 <pid>`, then restart |
| Port 3002 already in use | Another process is using port 3002 | `lsof -i:3002` to find the PID, then `kill -9 <pid>`, then restart |
| NestJS runs out of memory on large datasets | Default Node.js heap is too small | Set `NODE_OPTIONS='--max-old-space-size=4096'` before starting (already set in `dev:separated` script) |
| `PRISMA_DATABASE_URL` error on startup | `.env` not created or missing variable | Ensure `apps/nextjs-app/.env` exists and `PRISMA_DATABASE_URL` points to a running PostgreSQL instance |
| Prisma migration fails | PostgreSQL not ready or connection string wrong | Verify PostgreSQL is running and the connection string in `.env` is correct, then re-run `pnpm --filter @teable/db-main-prisma prisma:migrate:deploy` |
| Stale PostgreSQL PID | Unclean shutdown left a `postmaster.pid` | Remove the stale PID file from the PostgreSQL data directory and restart the database |
| `SECRET_KEY=defaultSecretKey` warning | Default key not changed | Generate a random string (e.g. `openssl rand -hex 16`) and set it as `SECRET_KEY` in `.env` |

---

## Next steps

- See `docs/DEVELOPMENT.md` for branch conventions, code style, and PR process.
- See `docs/TESTING.md` for running unit and e2e tests.
- See `docs/ARCHITECTURE.md` for system design and component overview.
- API documentation is available at http://localhost:3000/api/docs when `API_DOC_DISENABLED=false` (the default).
