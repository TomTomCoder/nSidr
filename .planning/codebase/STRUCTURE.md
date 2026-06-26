# Codebase Structure

**Analysis Date:** 2026-05-24

## Directory Layout

```
teable/
├── apps/                                    # Running applications
│   ├── nestjs-backend/                      # NestJS API server
│   │   ├── src/
│   │   │   ├── features/                    # Feature modules (domain-driven)
│   │   │   ├── configs/                     # Configuration modules
│   │   │   ├── middleware/                  # Express middleware
│   │   │   ├── ws/                          # WebSocket gateway and handlers
│   │   │   ├── shared/                      # Shared decorators and utilities
│   │   │   ├── utils/                       # Helper functions
│   │   │   ├── filter/                      # Global exception filter
│   │   │   ├── logger/                      # Logging setup
│   │   │   ├── db-provider/                 # Database connection setup
│   │   │   ├── app.module.ts                # Root NestJS module
│   │   │   ├── bootstrap.ts                 # Server startup logic
│   │   │   └── swagger.ts                   # OpenAPI documentation setup
│   │   ├── package.json
│   │   ├── tsconfig.json                    # Path aliases point to packages/
│   │   └── vitest-e2e.config.ts             # E2E test config
│   │
│   └── nextjs-app/                          # Next.js frontend
│       ├── src/
│       │   ├── pages/                       # Next.js route pages and API routes
│       │   │   ├── _app.tsx                 # Root page wrapper
│       │   ├── features/                    # Feature-specific UI modules
│       │   │   ├── app/                     # Main app UI (spaces, bases, tables)
│       │   │   ├── auth/                    # Auth UI (login, signup, OAuth)
│       │   │   └── system/                  # System-level features
│       │   ├── components/                  # Reusable React components
│       │   ├── backend/                     # Frontend-to-backend API calls
│       │   │   └── api/                     # API client instances
│       │   ├── lib/                         # Utility functions
│       │   ├── store/                       # Zustand state stores
│       │   ├── themes/                      # Tailwind theme config
│       │   ├── styles/                      # Global CSS
│       │   └── types.d/                     # Type declarations (window, etc.)
│       ├── public/                          # Static assets
│       ├── package.json
│       ├── next.config.js                   # Next.js config (proxies /socket)
│       └── tsconfig.json                    # Path aliases
│
├── packages/                                # Shared libraries
│   ├── core/                                # Type definitions, constants, interfaces
│   │   └── src/
│   │       ├── models/                      # Shared DTOs (Base, Table, Field, etc.)
│   │       ├── types/                       # TypeScript types
│   │       └── constants/                   # Enums, constants
│   │
│   ├── db-main-prisma/                      # Metadata database (Prisma)
│   │   ├── schema.prisma                    # Organizations, Bases, Tables, Fields, Views
│   │   ├── src/
│   │   │   ├── prisma.service.ts            # Prisma client wrapper
│   │   │   └── seeds/                       # Seed scripts
│   │   └── migrations/                      # Database migrations
│   │
│   ├── db-data-prisma/                      # Data table database (Prisma)
│   │   ├── schema.prisma                    # Record rows (dynamic per table)
│   │   ├── src/
│   │   │   └── prisma.service.ts
│   │   └── migrations/
│   │
│   ├── openapi/                             # OpenAPI specs and types
│   │   └── src/
│   │       ├── specs/                       # OpenAPI schema definitions
│   │       └── types/                       # Generated types from specs
│   │
│   ├── sdk/                                 # Client SDK for external integrations
│   │   └── src/
│   │       ├── client.ts                    # Main SDK client
│   │       └── resources/                   # API resource groups
│   │
│   ├── ui-lib/                              # React component library
│   │   └── src/
│   │       ├── components/                  # Reusable components (Button, Modal, etc.)
│   │       ├── hooks/                       # Custom React hooks
│   │       └── utils/                       # Component utilities
│   │
│   ├── formula/                             # Formula expression parser/evaluator
│   │   └── src/
│   │       ├── lexer.ts                     # Tokenizer
│   │       ├── parser.ts                    # AST parser
│   │       └── evaluator.ts                 # Expression evaluation
│   │
│   ├── v2/                                  # V2 API contracts (versioned)
│   │   ├── contract-http-implementation/    # HTTP handler implementations
│   │   ├── contract-types/                  # Shared contract types
│   │   └── integration/                     # Integration patterns
│   │
│   ├── icons/                               # SVG icon components
│   ├── i18n-keys/                           # i18n key types
│   ├── common-i18n/                         # i18n translations
│   └── eslint-config-bases/                 # Shared ESLint config
│
├── plugins/                                 # Plugin system
│   └── src/                                 # Plugin plugin development
│
├── scripts/                                 # Utility scripts
│   ├── generate-openapi-types.mjs           # OpenAPI type generation
│   └── validate-dual-db-cutover.mjs         # Database validation
│
├── dockers/                                 # Docker configs
│   ├── teable/                              # Main Teable image
│   └── examples/                            # Example docker-compose files
│
├── .github/                                 # GitHub Actions workflows
├── .vscode/                                 # VS Code settings
├── .planning/                               # Planning and documentation
│   └── codebase/                            # Architecture docs (this directory)
│
├── Makefile                                 # Development commands
├── package.json                             # Root workspace definition
├── pnpm-workspace.yaml                      # pnpm workspace config
├── tsconfig.base.json                       # Shared TypeScript config
├── .prettierrc.js                           # Prettier formatting
├── .eslintrc.js                             # ESLint rules
└── README.md
```

## Directory Purposes

**`apps/nestjs-backend/src/features/`**
- Purpose: Domain-driven feature modules (self-contained domains)
- Each feature example: `base/`, `record/`, `user/`, `auth/`, `chat/`
- Typical structure of a feature:
  ```
  features/record/
  ├── record.module.ts              # NestJS module definition
  ├── controllers/                  # REST endpoints
  │   ├── record-open-api.controller.ts
  │   └── *.controller.ts
  ├── services/                     # Business logic
  │   └── record.service.ts
  ├── repositories/                 # DB access (if using repo pattern)
  ├── dto/                          # Request/response objects
  │   ├── create-record.dto.ts
  │   └── update-record.dto.ts
  ├── entities/                     # Domain models
  ├── guards/                       # Auth/permission guards
  └── open-api/                     # OpenAPI wrapper module
  ```

**`apps/nestjs-backend/src/configs/`**
- Purpose: Configuration modules and environment setup
- Files: `base.config.ts`, `cache.config.ts`, `database.config.ts`, `security.config.ts`
- Pattern: Each config exports an interface (e.g., `IBaseConfig`) and a factory function

**`apps/nestjs-backend/src/ws/`**
- Purpose: WebSocket gateway for real-time collaboration
- Key files:
  - `ws.gateway.ts` — Main Socket.io gateway
  - `ws.adapter.ts` — Custom adapter
  - `*.handler.ts` — Message handlers (record updates, etc.)
- Pattern: Each message type has a handler that validates, calls service, broadcasts

**`apps/nextjs-app/src/pages/`**
- Purpose: Next.js file-based routes (one file = one route)
- Examples:
  - `pages/space/[spaceId].tsx` → Route: `/space/:spaceId`
  - `pages/base/[baseId]/table/[tableId].tsx` → Route: `/base/:baseId/table/:tableId`
  - `pages/api/*.ts` — API route handlers (backend integration layer)
- Pattern: Each page imports features and components, manages page-level state

**`apps/nextjs-app/src/features/`**
- Purpose: Feature-specific UI code (not domain-driven, but feature-grouped)
- Examples: `app/` (main UI), `auth/` (login/signup flows), `system/` (system settings)
- Different from backend features: Frontend features are UI-centric, not API-centric

**`apps/nextjs-app/src/components/`**
- Purpose: Reusable React components shared across features
- Organization: Folder per component type or region
- Examples: `layout/`, `store/`, `changelog/`

**`apps/nextjs-app/src/backend/`**
- Purpose: Frontend API client and request handling
- Key file: `backend/api/` — Fetch wrappers, API client instances
- Pattern: Centralized HTTP client with interceptors for auth, error handling

**`packages/core/`**
- Purpose: Shared type definitions and constants (no implementation)
- Contains: DTOs, enums, interfaces
- Used by: Both backend and frontend (no circular dependencies)

**`packages/db-main-prisma/`**
- Purpose: Metadata database schema (organizations, users, bases, tables, fields, views)
- Key file: `schema.prisma` — Defines all meta tables
- Usage: Backend imports `@teable/db-main-prisma` for organization/base queries

**`packages/db-data-prisma/`**
- Purpose: Data table schema (actual record rows stored here)
- Key file: `schema.prisma` — Generic "Record" table with dynamic fields
- Usage: Backend imports `@teable/db-data-prisma` for record CRUD

**`packages/openapi/`**
- Purpose: OpenAPI 3.0 specifications and generated types
- Key files: `specs/` — YAML/JSON spec files
- Generation: Runs `npx openapi-typescript` to generate TypeScript types
- Usage: Frontend uses generated types for API calls

## Key File Locations

**Entry Points:**
- Backend startup: `apps/nestjs-backend/src/bootstrap.ts` (called from `src/index.ts`)
- Frontend page entry: `apps/nextjs-app/src/pages/_app.tsx` (Next.js convention)
- Root module: `apps/nestjs-backend/src/app.module.ts` (NestJS entry point)

**Configuration:**
- Environment variables: Loaded by `apps/nestjs-backend/src/configs/config.module.ts`
- Next.js build: `apps/nextjs-app/next.config.js` (proxy setup, plugin config)
- TypeScript paths: `tsconfig.base.json` (shared), `apps/*/tsconfig.json` (specific)
- Prettier: `.prettierrc.js` (code formatting)
- ESLint: `.eslintrc.js` (linting rules)

**Core Logic:**
- Record service: `apps/nestjs-backend/src/features/record/services/record.service.ts`
- Base service: `apps/nestjs-backend/src/features/base/services/base.service.ts`
- Field service: `apps/nestjs-backend/src/features/field/services/field.service.ts`
- Auth service: `apps/nestjs-backend/src/features/auth/services/auth.service.ts`

**Testing:**
- Backend unit tests: `apps/nestjs-backend/src/**/*.spec.ts` (co-located)
- Backend E2E tests: `apps/nestjs-backend/vitest-e2e.config.ts`
- Frontend tests: `apps/nextjs-app/src/**/*.test.ts(x)`
- Test utils: `config/tests/test-utils.ts`

**Database:**
- Main schema: `packages/db-main-prisma/schema.prisma`
- Data schema: `packages/db-data-prisma/schema.prisma`
- Migrations main: `packages/db-main-prisma/prisma/migrations/`
- Migrations data: `packages/db-data-prisma/prisma/migrations/`

## Naming Conventions

**Files:**
- Services: `*.service.ts` — Contains business logic
- Controllers: `*.controller.ts` — HTTP endpoints
- Modules: `*.module.ts` — NestJS module definition
- DTOs: `*.dto.ts` — Request/response objects
- Guards: `*.guard.ts` — Auth/permission checks
- Interceptors: `*.interceptor.ts` — Request/response manipulation
- Decorators: `*.decorator.ts` — Custom decorators
- Filters: `*.filter.ts` — Exception handling
- Tests: `*.spec.ts` (backend) or `*.test.ts` (frontend)

**Directories:**
- Feature folders: `kebab-case` (e.g., `base-share`, `doc-search`)
- Component folders: `PascalCase` (e.g., `Modal`, `TableGrid`)
- Utility folders: `lowercase` (e.g., `utils`, `helpers`)

## Where to Add New Code

**New Feature (Backend):**
1. Create folder: `apps/nestjs-backend/src/features/[feature-name]/`
2. Add files:
   - `[feature-name].module.ts` — NestJS module
   - `services/[feature-name].service.ts` — Business logic
   - `controllers/[feature-name].controller.ts` — API endpoints
   - `dto/` — Request/response objects
   - `open-api/[feature-name]-open-api.module.ts` — Public API wrapper
3. Register in `apps/nestjs-backend/src/app.module.ts` imports

**New API Endpoint (Backend):**
1. Add method to service: `apps/nestjs-backend/src/features/[feature]/services/[feature].service.ts`
2. Add controller method: `apps/nestjs-backend/src/features/[feature]/controllers/[feature].controller.ts`
3. Add DTO: `apps/nestjs-backend/src/features/[feature]/dto/[action].dto.ts`
4. If public API: Re-export in `open-api/[feature]-open-api.module.ts`

**New Page (Frontend):**
1. Create file: `apps/nextjs-app/src/pages/[route].tsx` or `apps/nextjs-app/src/pages/[folder]/[param].tsx`
2. Import features/components: `import { SomeFeature } from '@/features/app'`
3. Call backend API: `import { api } from '@/backend/api'`
4. Use store: `import { useStore } from '@/store/[store]'`

**New Component (Frontend):**
1. Create folder: `apps/nextjs-app/src/components/[ComponentName]/`
2. Add files:
   - `[ComponentName].tsx` — Component logic
   - `[ComponentName].module.css` or use Tailwind
   - `index.ts` — Export
3. Import in pages/features: `import { ComponentName } from '@/components/ComponentName'`

**New Utility/Helper:**
- Backend: `apps/nestjs-backend/src/utils/[feature]/[utility].ts`
- Frontend: `apps/nextjs-app/src/lib/[category]/[utility].ts`

**New Shared Type/Constant:**
1. Add to `packages/core/src/`
2. Re-export from `packages/core/src/index.ts`
3. Import in backend/frontend: `import { Type } from '@teable/core'`

## Special Directories

**`apps/nestjs-backend/src/shared/`**
- Purpose: Decorators, pipes, and utilities used across features
- Examples: `@ApiResponse()` decorator, validation pipes
- Generated: No
- Committed: Yes

**`apps/nextjs-app/.next/`**
- Purpose: Next.js build output
- Generated: Yes (during `npm run build`)
- Committed: No

**`packages/*/dist/`**
- Purpose: Compiled package output
- Generated: Yes (during `npm run build`)
- Committed: No (use `.gitignore`)

**`node_modules/`**
- Purpose: Installed dependencies
- Generated: Yes (by pnpm install)
- Committed: No

**`.cache/`**
- Purpose: Build cache (ESLint, Turbo, etc.)
- Generated: Yes
- Committed: No
- Can be cleared: `pnpm clean:global-cache`

## Import Aliases

**Backend (`apps/nestjs-backend/tsconfig.json`):**
```typescript
// Absolute path imports from shared packages
import { Base } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { Formula } from '@teable/formula';
```

**Frontend (`apps/nextjs-app/tsconfig.json`):**
```typescript
// Feature/component/lib aliases
import { SomeComponent } from '@/components/SomeComponent';
import { useStore } from '@/store/store';
import { api } from '@/backend/api';

// Shared packages
import { Base } from '@teable/core';
import { Button } from '@teable/ui-lib';
import { useTranslation } from '@teable/common-i18n';
```

These aliases are defined in each `tsconfig.json` under `compilerOptions.paths`.

---

*Structure analysis: 2026-05-24*
