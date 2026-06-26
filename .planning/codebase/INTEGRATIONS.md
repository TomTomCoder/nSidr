# External Integrations

**Analysis Date:** 2026-05-24

## APIs & External Services

**AI/LLM Providers:**
- OpenAI (ChatGPT, GPT-4, etc.) - Via @ai-sdk/openai 3.0.54
  - SDK: `@ai-sdk/openai`
  - Auth: `OPENAI_API_KEY` environment variable
  - Used in: Formula evaluation, content generation features

- Anthropic (Claude) - Via @ai-sdk/anthropic 3.0.72
  - SDK: `@ai-sdk/anthropic`
  - Auth: `ANTHROPIC_API_KEY`
  - Used in: AI-assisted operations

- Google (Gemini, PaLM) - Via @ai-sdk/google 3.0.65
  - SDK: `@ai-sdk/google`
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY`

- Azure OpenAI - Via @ai-sdk/azure 3.0.55
  - SDK: `@ai-sdk/azure`
  - Auth: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`

- Cohere - Via @ai-sdk/cohere 3.0.31
  - SDK: `@ai-sdk/cohere`
  - Auth: `COHERE_API_KEY`

- Mistral - Via @ai-sdk/mistral 3.0.31
  - SDK: `@ai-sdk/mistral`
  - Auth: `MISTRAL_API_KEY`

- DeepSeek - Via @ai-sdk/deepseek 2.0.30
  - SDK: `@ai-sdk/deepseek`
  - Auth: `DEEPSEEK_API_KEY`

- xAI (Grok) - Via @ai-sdk/xai 3.0.84
  - SDK: `@ai-sdk/xai`
  - Auth: `XAI_API_KEY`

- AWS Bedrock - Via @ai-sdk/amazon-bedrock 4.0.97
  - SDK: `@ai-sdk/amazon-bedrock`
  - Auth: AWS credentials (IAM role or access keys)

- Together AI - Via @ai-sdk/togetherai 2.0.46
  - SDK: `@ai-sdk/togetherai`
  - Auth: `TOGETHER_API_KEY`

- OpenRouter - Via @openrouter/ai-sdk-provider 2.8.1
  - SDK: `@openrouter/ai-sdk-provider`
  - Auth: `OPENROUTER_API_KEY`
  - Used in: Multi-provider LLM access

- Ollama (Local) - Via ollama-ai-provider-v2 3.5.0
  - SDK: `ollama-ai-provider-v2`
  - Auth: None (local)
  - Used in: Local model inference

**OAuth/Authentication Providers:**
- Google OAuth 2.0 - Via passport-google-oauth20 2.0.0
  - Provider: Google Cloud Console OAuth app
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Scope: User profile, email

- GitHub OAuth - Via passport-github2 0.1.12
  - Provider: GitHub Developer Settings
  - Auth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Scope: User public profile

- OpenID Connect - Via passport-openidconnect 0.1.2
  - Auth: OIDC provider configuration
  - Auth vars: `OIDC_PROVIDER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`

## Data Storage

**Databases:**

**Primary (Metadata & Configuration):**
- PostgreSQL 12+
  - Connection: Via `pg` 8.11.5 driver
  - ORM: Prisma (@prisma/client 6.2.1)
  - Schema: `db-main-prisma` package
  - Location: `packages/db-main-prisma/`
  - Connection string env var: `DATABASE_URL`

**Secondary (User Data):**
- PostgreSQL 12+
  - Connection: Via `pg` driver
  - ORM: Prisma
  - Schema: `db-data-prisma` package
  - Location: `packages/db-data-prisma/`
  - Connection string env var: `DATA_SOURCE_URL`

**Caching & Session Storage:**
- Redis 6+
  - Client: ioredis 5.9.1
  - Keyv adapter: @keyv/redis 2.8.4
  - Connection: `REDIS_URL` environment variable
  - Used for: Session storage, cache layer, job queue
  - Fallback: @keyv/sqlite 3.6.7 for local SQLite caching

**File Storage:**
- S3-Compatible (MinIO or AWS S3)
  - SDK: @aws-sdk/client-s3 3.609.0, @aws-sdk/lib-storage 3.609.0
  - Minio client: minio 7.1.3
  - Auth: AWS credentials (access key, secret key)
  - Env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`
  - Upload presigning: @aws-sdk/s3-request-presigner 3.609.0
  - Used for: User file uploads, attachments, asset storage

**Embedded Database (Testing/Development):**
- pg-mem 3.0.5 - In-memory PostgreSQL for unit testing
- SQLite - Via Keyv for local development caching

## Authentication & Identity

**Auth Provider:**
- Custom OAuth 2.0 server + Passport.js strategy integration
  - Implementation: `apps/nestjs-backend/src/features/auth/`
  - JWT tokens for API authentication
  - Session-based authentication for web
  - Refresh token rotation support

**Authorization:**
- Role-based access control (RBAC)
- Workspace and team-level permissions

## Email & Notifications

**Email Service:**
- SMTP via Nodemailer 6.9.13
  - Configuration: `apps/nestjs-backend/src/configs/mail.config.ts`
  - Template engine: Handlebars 4.7.8
  - Provider: Configurable (SendGrid, Mailgun, etc. via SMTP)
  - Auth: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`
  - Optional: `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`

**Job Queue & Async Tasks:**
- BullMQ 5.66.5 (job queue)
  - Backed by Redis
  - Dashboard: @bull-board/express, @bull-board/nestjs 7.1.5
  - Used for: Email delivery, data processing, background jobs
  - Admin UI: Accessible at `/admin/queues` (when configured)

## Monitoring & Observability

**Error Tracking:**
- Sentry
  - Frontend: @sentry/nextjs 10.33.0, @sentry/react 10.33.0
  - Backend: @sentry/nestjs 10.22.0
  - Profiling: @sentry/profiling-node 10.22.0
  - Auth: `SENTRY_DSN` (project URL)
  - Used for: Error reporting, performance monitoring, profiling

**Distributed Tracing:**
- OpenTelemetry 0.201.1+
  - SDK: @opentelemetry/sdk-node 0.201.1
  - Exporters: OTLP HTTP (traces, metrics, logs)
  - Instrumentations:
    - @opentelemetry/instrumentation-express
    - @opentelemetry/instrumentation-http
    - @opentelemetry/instrumentation-pg (PostgreSQL)
    - @opentelemetry/instrumentation-nestjs-core
    - @opentelemetry/instrumentation-ioredis
    - @opentelemetry/instrumentation-pino (logging)
    - @opentelemetry/instrumentation-runtime-node
  - Collector endpoint: `OTEL_EXPORTER_OTLP_ENDPOINT`
  - Used for: Request tracing, performance analysis, system observability

**Structured Logging:**
- Pino 4.4.1 (nestjs-pino)
  - HTTP logging: pino-http 10.5.0
  - Pretty printing: pino-pretty 11.0.0
  - Config: `apps/nestjs-backend/src/configs/logger.config.ts`
  - Log level: Configurable via `LOG_LEVEL` env var
  - Used for: Application and request logging

## CI/CD & Deployment

**Hosting:**
- Self-hosted or cloud platforms supporting Docker
- Next.js frontend on **port 3000** (user-facing UI); NestJS backend API on port 3001 (dev) / port 3000 (prod)

**CI Pipeline:**
- GitHub Actions (typical for GitHub-hosted projects)
- Commands:
  - `pnpm g:build` - Build all packages
  - `pnpm g:test-unit` - Unit tests
  - `pnpm g:test-e2e` - E2E tests with Playwright
  - `pnpm g:lint` - Linting

**Container Support:**
- Docker & Docker Compose
  - Configuration: `dockers/docker-compose.yml`
  - Multi-service setup (backend, frontend, database, cache, etc.)

## WebSocket & Real-Time

**Real-Time Collaboration:**
- ShareDB 5.2.2
  - Protocol: ShareDB operational transformation
  - Transport: WebSocket (ws 8.18.3)
  - Backend server: `apps/nestjs-backend/src/ws/`
  - Used for: Collaborative cell editing, simultaneous updates

**WebSocket Implementation:**
- @nestjs/websockets 10.3.5 - NestJS WebSocket gateway
- sockjs - Fallback transport
- WebSocket namespace: Configured per feature

## Environment Configuration

**Required Environment Variables (Core):**
- `DATABASE_URL` - Main metadata database connection string
- `DATA_SOURCE_URL` - User data database connection string
- `REDIS_URL` - Redis connection string
- `NODE_ENV` - Environment (development/test/production)
- `PORT` - Next.js frontend port (default **3000**); `BACKEND_PORT` - NestJS API port (default 3001 in dev)

**Optional Environment Variables (Integration):**
- `OPENAI_API_KEY` - OpenAI integration
- `ANTHROPIC_API_KEY` - Claude integration
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI
- `AZURE_OPENAI_API_KEY` - Azure OpenAI
- `SENTRY_DSN` - Error tracking
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry collector
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` - S3 storage
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD` - Email
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth

**Secrets Location:**
- `.env` files (local development - never committed)
- Environment variables (production)
- Secrets manager support via environment variables

## Request Filtering & Security

**Request Filtering Agent:**
- request-filtering-agent 3.2.0
  - Used for filtering HTTP requests based on criteria
  - Implementation: `apps/nestjs-backend/src/`

**Security Headers:**
- Helmet 7.1.0 - HTTP security headers
- cors 2.8.5 - CORS configuration
- next-secure-headers 2.2.0 - Next.js security headers

**Rate Limiting & Protection:**
- Redlock 5.0.0-beta.2 - Distributed locking for rate limiting
- Implemented via: `apps/nestjs-backend/src/features/`

---

*Integration audit: 2026-05-24*
