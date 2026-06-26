# Technology Stack

**Analysis Date:** 2026-05-24

## Languages

**Primary:**
- TypeScript 5.4.3 - Used across backend, frontend, and shared packages
- JavaScript - Build tooling and scripts

**Secondary:**
- SQL - PostgreSQL queries via Prisma, Knex, and Kysely
- CSS/SCSS - Styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js >=22.0.0 (required)

**Package Manager:**
- pnpm >=9.13.0 (strict requirement)
- Lockfile: pnpm-lock.yaml (enforced)

## Frameworks

**Backend:**
- NestJS 10.3.5 - Core backend framework at `apps/nestjs-backend/`
- Express 4.21.1 - HTTP server (used by Next.js embedded server)

**Frontend:**
- Next.js 16.1.6 - Full-stack framework at `apps/nextjs-app/`
- React 18.3.1 - UI library

**Build/Dev Tools:**
- webpack 5.91.0 - Module bundling for backend
- Vite - Test runner (vitest integration)
- SWC - Fast JavaScript/TypeScript compiler (unplugin-swc 1.4.4)
- esbuild 0.23.0 - Build tool

**Testing:**
- Vitest 4.0.17 - Unit and E2E test runner
- Playwright 1.57.0 - E2E testing framework
- Testing Library (@testing-library/react 14.2.2, @testing-library/dom 9.3.4) - Component testing utilities
- Happy DOM 15.11.6 - DOM implementation for tests

## Key Dependencies

**Critical Infrastructure:**
- Prisma 6.2.1 (@prisma/client, @prisma/instrumentation) - ORM with type-safe database access
  - Dual database setup: `db-main-prisma` for metadata, `db-data-prisma` for user data
- PostgreSQL (pg 8.11.5) - Primary relational database
- Redis (ioredis 5.9.1) - Caching, session storage, pub/sub
- Keyv 4.5.4 - Universal key-value store with Redis/SQLite adapters

**Real-Time & Collaboration:**
- ShareDB 5.2.2 - Real-time collaborative editing framework
- WebSocket support via @nestjs/websockets, @nestjs/platform-ws, ws 8.18.3

**AI & Language Model Integration:**
- @ai-sdk/anthropic 3.0.72 - Claude API
- @ai-sdk/openai 3.0.54 - OpenAI integration
- @ai-sdk/google 3.0.65 - Google models
- @ai-sdk/azure 3.0.55 - Azure OpenAI
- @ai-sdk/cohere 3.0.31 - Cohere
- @ai-sdk/mistral 3.0.31 - Mistral
- @ai-sdk/deepseek 2.0.30 - DeepSeek
- @ai-sdk/xai 3.0.84 - xAI (Grok)
- @ai-sdk/amazon-bedrock 4.0.97 - AWS Bedrock
- @ai-sdk/togetherai 2.0.46 - Together AI
- @openrouter/ai-sdk-provider 2.8.1 - OpenRouter compatibility
- ollama-ai-provider-v2 3.5.0 - Local Ollama support
- ai 6.0.169 - Vercel AI SDK (core)

**Authentication & Authorization:**
- Passport 0.7.0 - Authentication middleware
  - passport-jwt 4.0.1 - JWT strategy
  - passport-local 1.0.0 - Local strategy
  - passport-google-oauth20 2.0.0 - Google OAuth
  - passport-github2 0.1.12 - GitHub OAuth
  - passport-openidconnect 0.1.2 - OpenID Connect
  - passport-oauth2-client-password 0.1.2 - OAuth2 client credentials
- @nestjs/jwt 10.2.0 - JWT integration
- @nestjs/passport 10.0.3 - Passport integration
- oauth2orize 1.12.0 - OAuth 2.0 server framework
- oauth2orize-pkce 0.1.2 - PKCE support
- bcrypt 5.1.1 - Password hashing

**File & Data Processing:**
- Multer 1.4.5-lts.1 - File upload handling
- Sharp 0.33.3 - Image processing
- XLSX 0.18.5 - Excel file handling
- csv-parser 3.2.0, csv-stringify 6.5.2 - CSV processing
- papaparse 5.4.1 - CSV parsing
- Unzipper 0.12.3 - ZIP extraction
- pdf-parse 2.4.5 - PDF parsing
- Stream-json 1.9.1 - Streaming JSON parsing
- Archiver 7.0.1 - ZIP/TAR creation

**Storage:**
- Minio 7.1.3 - S3-compatible object storage client
- @aws-sdk/client-s3 3.609.0 - AWS S3
- @aws-sdk/lib-storage 3.609.0 - AWS multipart uploads
- @aws-sdk/s3-request-presigner 3.609.0 - S3 presigned URLs

**Job Queue:**
- BullMQ 5.66.5 - Job queue
- @bull-board/nestjs 7.1.5 - BullMQ UI dashboard
- @nestjs/bullmq 11.0.4 - NestJS integration

**Observability & Monitoring:**
- Sentry (@sentry/nestjs 10.22.0, @sentry/nextjs 10.33.0, @sentry/react 10.33.0) - Error tracking
- @sentry/profiling-node 10.22.0 - Performance profiling
- OpenTelemetry suite (0.201.1+) - Distributed tracing
  - @opentelemetry/sdk-node 0.201.1 - Node.js SDK
  - @opentelemetry/exporter-trace-otlp-http - HTTP trace export
  - @opentelemetry/exporter-metrics-otlp-http - HTTP metrics export
  - @opentelemetry/exporter-logs-otlp-http - HTTP logs export
  - Instrumentations: Express, HTTP, Pg, NestJS, ioRedis, Pino, Runtime
- Pino (nestjs-pino 4.4.1) - Structured logging
- pino-http 10.5.0, pino-pretty 11.0.0 - HTTP logging

**Email:**
- @nestjs-modules/mailer 1.11.2 - Email handling
- Nodemailer 6.9.13 - SMTP client
- Handlebars 4.7.8 - Email templates

**Validation & Serialization:**
- Zod 4.1.8 - Runtime schema validation
- zod-validation-error 4.0.2 - Zod error formatting
- class-validator 0.14.1 - Decorator-based validation
- class-transformer 0.5.1 - Object transformation
- @valibot/to-json-schema 1.3.0 - JSON schema conversion

**API Documentation:**
- Swagger (@nestjs/swagger 7.3.0) - API documentation
- OpenAPI support for type generation

**Data Query & Manipulation:**
- Knex 3.1.0 - Query builder
- Kysely 0.28.9 - Type-safe query builder
- nest-knexjs 0.0.22 - NestJS Knex integration
- node-sql-parser 5.3.8 - SQL parsing

**UI Components & Libraries:**
- TailwindCSS 3.4.1 - Utility CSS framework
- Radix UI (@radix-ui/react-icons 1.3.0) - Accessible component primitives
- shadcn/ui patterns - Component composition
- Recharts 2.12.3 - React charting
- ECharts 5.5.0 - Data visualization
- FullCalendar (@fullcalendar/react 6.1.15) - Calendar widget
- Glide Data Grid (@glideapps/glide-data-grid 6.0.3) - High-performance data grid
- React DnD (@dnd-kit/core 6.1.0, @hello-pangea/dnd 16.6.0) - Drag and drop
- React Hook Form 7.51.1 - Form state management
- React Grid Layout 1.4.4 - Dashboard grid layout
- ReactFlow 11.11.1 - Node/edge diagram editor
- Lucide React 0.363.0 - Icon library
- Emoji Mart 5.5.2 - Emoji picker

**Frontend State & Data:**
- TanStack React Query 5.90.16 - Server state management
- TanStack React Table 8.11.7 - Headless table component
- Zustand 4.5.2 - Client state management
- React Use 17.5.1 - React hooks library

**Utilities:**
- Lodash 4.17.21 - Utility functions
- date-fns 4.1.0, dayjs 1.11.10, date-fns-tz 3.2.0 - Date manipulation
- Effect 3.19.1 - Functional effect system
- ts-pattern 5.0.8 - Pattern matching
- Axios 1.7.7 - HTTP client
- node-fetch 2.7.0 - Fetch API for Node.js
- p-limit 3.1.0 - Promise concurrency control

**Internationalization:**
- i18next 23.10.1, react-i18next 14.1.0 - Translation framework
- nestjs-i18n 10.5.1 - NestJS integration
- next-i18next 15.2.0 - Next.js integration

**Development Utilities:**
- ESLint 8.57.0 - Code linting
- Prettier 3.2.5 - Code formatting
- TypeScript 5.4.3 - Type checking
- ts-node 10.9.2 - TypeScript execution
- ts-loader 9.5.1 - Webpack TypeScript loader

## Configuration

**Environment:**
- dotenv-flow 4.1.0 - Multi-environment .env support
- .env files for development, test, production configurations

**Backend Config Files:**
- `apps/nestjs-backend/src/configs/` - Configuration modules
  - auth.config.ts - Authentication settings
  - cache.config.ts - Redis/Keyv configuration
  - storage.ts - S3/MinIO setup
  - mail.config.ts - Email service configuration
  - oauth.config.ts - OAuth provider settings
  - threshold.config.ts - Performance thresholds

**Validation:**
- env.validation.schema.ts - Zod-based environment variable validation
- AJV 8.12.0 - JSON schema validator

## Build & Deployment Configuration

**Backend Build:**
- webpack 5.91.0 - Main bundler with custom configs
- webpack.dev.js, webpack.swc.js - Development configurations
- copy-webpack-plugin 12.0.2 - Asset copying

**Frontend Build:**
- next.config.js - Next.js build configuration
- sentry.client.config.ts, sentry.server.config.ts - Error tracking setup
- next-bundle-analyzer - Bundle analysis tools

**Docker:**
- Docker Compose configuration at `dockers/` with multi-container setup

## Platform Requirements

**Development:**
- Node.js >=22.0.0
- pnpm >=9.13.0
- Git
- PostgreSQL 12+ (for local development)
- Redis (optional, can use SQLite for Keyv)

**Production:**
- Node.js >=22.0.0
- PostgreSQL database (dual-database setup)
- Redis cache layer
- S3-compatible storage (MinIO or AWS S3)
- SMTP for email (optional)
- OpenTelemetry collector (optional)

**Deployment Targets:**
- Docker containers (primary)
- Linux/macOS servers with Node.js runtime
- Cloud platforms (AWS, Azure, GCP) supported via respective SDKs

---

*Stack analysis: 2026-05-24*
