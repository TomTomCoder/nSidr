<!-- GSD:GENERATED -->
<!-- generated-by: gsd-doc-writer -->

# Development Guide

This guide covers the full developer workflow for Teable — a pnpm monorepo with a Next.js frontend (`@teable/app`) and a NestJS backend (`@teable/backend`).

---

## Prerequisites

- **Node.js** >= 20 (check `.nvmrc` if present)
- **pnpm** >= 9
- **PostgreSQL** 14+ (running locally or via Docker)
- **Redis** (required for cache, queues, and WebSockets in dev)

Install pnpm if needed:

```bash
npm install -g pnpm@latest
```

---

## Daily Dev Workflow

### Recommended: Separated mode (hot reload)

Runs Next.js on `:3000` and NestJS on `:3002` concurrently with SWC hot reload on both:

```bash
pnpm dev:separated
```

- **Next.js** → `http://localhost:3000`
- **NestJS API + WebSocket** → `http://localhost:3002`

### Backend only (serves both on :3000)

When you want NestJS to serve the frontend build as well:

```bash
cd apps/nestjs-backend && pnpm dev
```

### Light mode (pre-built backend)

Starts the backend from a pre-built `dist/` bundle (faster boot, no SWC recompile):

```bash
pnpm dev:separated:light
```

### Plugin development

```bash
pnpm build:packages            # build shared packages first
cd plugins && pnpm dev         # plugin dev server → http://localhost:3002 (default plugin port)
```

Or from root:

```bash
pnpm run:plugin
```

---

## Available Scripts

### Root-level scripts (`pnpm <script>`)

| Command | Description |
|---|---|
| `dev:separated` | Start Next.js :3000 + NestJS :3002 with SWC hot reload (recommended) |
| `dev:separated:light` | Start Next.js :3000 + pre-built NestJS :3002 (fast boot) |
| `build:packages` | Build all packages in `packages/` (run before building the app) |
| `g:build` | Build all workspaces |
| `g:build-changed` | Build only workspaces changed since `origin/main` |
| `g:lint` | Run ESLint across all workspaces in parallel |
| `g:lint-staged-files` | Run lint-staged (used by pre-commit hook) |
| `g:fix-all-files` | Auto-fix lint issues across all workspaces |
| `g:typecheck` | TypeScript type-check all workspaces (concurrency: 8) |
| `g:test` | Run all e2e and unit tests |
| `g:test-unit` | Run unit tests in parallel across all workspaces |
| `g:test-e2e` | Run e2e tests across all workspaces |
| `g:clean` | Clean global cache and all workspace build artifacts |
| `start:separated` | Run production-built app: Next.js :3000 + NestJS :3002 |
| `start:prod-local` | Full build then start in production mode (use for day-to-day local use) |
| `run:plugin` | Start plugin dev server |
| `generate-openapi-types` | Regenerate TypeScript types from the OpenAPI spec |
| `deps:check` | Check for dependency updates across all workspaces |
| `deps:update` | Update dependencies across all workspaces |
| `nuke:node_modules` | Remove all `node_modules` directories across the monorepo |

### Frontend-specific (`pnpm --filter @teable/app <script>`)

| Command | Description |
|---|---|
| `pnpm --filter @teable/app build` | Production build of the Next.js app |
| `ANALYZE=true pnpm --filter @teable/app build` | Build with bundle analyzer enabled |

---

## Build Workflow

For the first run or after pulling changes that affect shared packages:

```bash
# 1. Install dependencies
pnpm install

# 2. Build all shared packages
pnpm build:packages

# 3. Start dev servers
pnpm dev:separated
```

To build the Next.js app for production:

```bash
pnpm build:packages
pnpm --filter @teable/app build
```

To analyze bundle size:

```bash
ANALYZE=true pnpm --filter @teable/app build
```

---

## Environment Variables

The primary env file for the application is:

- **`apps/nextjs-app/.env`** — active config (not committed)
- **`apps/nextjs-app/.env.example`** — canonical reference for all variables
- **`apps/nextjs-app/.env.development`** — development overrides (committed)
- **`apps/nextjs-app/.env.development.local`** — local developer overrides (not committed, takes priority)

Copy the example file to get started:

```bash
cp apps/nextjs-app/.env.example apps/nextjs-app/.env
```

### Core variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PUBLIC_ORIGIN` | Yes | — | Public URL of the app (used in links/emails) |
| `SECRET_KEY` | Yes | `defaultSecretKey` | Master secret for JWT, sessions, and share tokens |
| `PRISMA_DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `3000` | Application port |
| `LOG_LEVEL` | No | `info` | Log verbosity: `fatal\|error\|warn\|info\|debug\|trace` |

### Cache / Redis

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_CACHE_PROVIDER` | No | `sqlite` | Cache backend: `sqlite\|memory\|redis` |
| `BACKEND_CACHE_REDIS_URI` | No | — | Redis URI (required when provider is `redis`) |
| `BACKEND_PERFORMANCE_CACHE` | No | — | Separate Redis URI for performance cache |

### Storage

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_STORAGE_PROVIDER` | No | `local` | Storage backend: `local\|minio\|s3` |
| `BACKEND_STORAGE_PUBLIC_URL` | No | `http://localhost:3000/api/attachments/read/public` | Public URL for attachments |

### Auth / Social sign-in

| Variable | Required | Default | Description |
|---|---|---|---|
| `SOCIAL_AUTH_PROVIDERS` | No | — | Comma-separated list: `github,google,oidc` |
| `BACKEND_GITHUB_CLIENT_ID` | No | — | GitHub OAuth app client ID |
| `BACKEND_GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `BACKEND_OIDC_CLIENT_ID` | No | — | OIDC client ID |

### Build-time variables (Next.js)

| Variable | Default | Description |
|---|---|---|
| `NEXT_BUILD_ENV_TYPECHECK` | `false` | Enable TypeScript type-check during build |
| `NEXT_BUILD_ENV_SOURCEMAPS` | `false` | Generate source maps |
| `NEXT_BUILD_ENV_SENTRY_ENABLED` | `false` | Enable Sentry error reporting |
| `NEXT_BUILD_ENV_CSP` | `true` | Enable Content Security Policy headers |

See `apps/nextjs-app/.env.example` for the full list including email config, limits, OTEL, and Cloudflare Turnstile.

---

## Database Change Workflow

The Prisma schema is generated from a Mustache template. Never edit `schema.prisma` directly.

```bash
# 1. Edit the template
#    packages/db-main-prisma/prisma/template.prisma

# 2. Regenerate schema.prisma from the template
make gen-prisma-schema

# 3. Create a new migration (interactive — prompts for a migration name)
make db-migration

# 4. Apply the migration and switch DB mode (starts Postgres via Docker if needed)
make switch-db-mode
```

### Key Makefile targets

| Target | Description |
|---|---|
| `make gen-prisma-schema` | Generate `schema.prisma` from `template.prisma` for all DB variants |
| `make db-migration` | Create a new Prisma migration (interactive prompt for name) |
| `make switch-db-mode` | Switch DB mode, apply migrations, start Docker Postgres if needed |
| `make db.push` | Push schema to DB without creating a migration file |
| `make postgres.mode` | Generate Prisma client and deploy all pending migrations |
| `make docker.up <service>` | Start a Docker Compose service |
| `make docker.down` | Stop all Docker Compose services |
| `make docker.status` | Show status of all Docker services |

---

## Code Style

- **ESLint** is configured per package. Run globally with:

  ```bash
  pnpm g:lint
  ```

  Auto-fix:

  ```bash
  pnpm g:fix-all-files
  # or per-file:
  eslint --fix <file>
  ```

- **lint-staged** runs automatically on `git commit` via Husky (`pnpm g:lint-staged-files`).

- **TypeScript** is checked separately:

  ```bash
  pnpm g:typecheck
  ```

---

## Commit Conventions

Teable uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages must follow the format:

```
<type>: <short description>
```

Supported types:

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Code restructuring (no behavior change) |
| `style` | Formatting, whitespace (no logic change) |
| `chore` | Build, tooling, dependency updates |
| `test` | Adding or updating tests |

Commitlint is enforced via the `commit-msg` Husky hook.

---

## Port Layout

| Service | Dev (separated) | Production |
|---|---|---|
| Next.js frontend | `:3000` | `:3000` |
| NestJS API | `:3002` | `:3000` (same process) |
| WebSocket | `:3002` | `:3000` |
| Plugin dev server | `:3002` | — |
| BullBoard (queue UI) | `/api/admin/queues` | `/api/admin/queues` |

---

## Admin Panel

The admin panel is available at `/admin/*` and includes:

- Site settings and AI model configuration
- Job queue dashboard powered by BullBoard at `/api/admin/queues`
- Performance statistics and monitoring

---

## Debugging Tips

### Port conflict after NestJS restart

If NestJS crashes and leaves a stale process on `:3002`:

```bash
lsof -i:3002 | grep LISTEN
kill -9 <pid>
```

### Stale Postgres PID

If Postgres fails to start after an unclean shutdown:

```bash
rm /usr/local/var/postgresql@<version>/postmaster.pid
# or for Homebrew:
brew services restart postgresql@<version>
```

### Frontend not picking up backend changes

After changing code in a shared package, rebuild it before restarting the dev servers:

```bash
pnpm build:packages
pnpm dev:separated
```

### Performance profiling

- Bundle analysis: `ANALYZE=true pnpm --filter @teable/app build`
- Performance stats in admin: `/admin` → Performance tab
- Backend performance cache is Redis-backed via `BACKEND_PERFORMANCE_CACHE`

### Dev vs production performance

`dev:separated` recompiles each Next.js route on first visit, which can be 5–40x slower per route than a production build. For realistic performance testing use:

```bash
pnpm start:prod-local
```

---

## See Also

- `docs/DOCUMENTATION.md` — project documentation index
- `CONTRIBUTING.md` — PR and contribution guidelines
- `Makefile` — run `make help` to list all available targets
