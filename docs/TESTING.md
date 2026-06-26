<!-- GSD:GENERATED -->
<!-- generated-by: gsd-doc-writer -->
# Testing

Teable uses **Vitest** for both unit and E2E tests across its pnpm monorepo. Unit tests run in parallel across all packages; E2E tests run against a seeded test database in the NestJS backend.

## Unit Tests

### Commands

| Scope | Command |
|-------|---------|
| All packages (parallel) | `pnpm g:test-unit` |
| All packages with coverage | `pnpm g:test-unit-cover` |
| NestJS backend only | `cd apps/nestjs-backend && pnpm test-unit` |
| Next.js frontend only | `cd apps/nextjs-app && pnpm test-unit` |
| Any single package | `cd packages/<name> && pnpm test-unit` |
| Watch mode (backend) | `cd apps/nestjs-backend && pnpm test-unit:watch` |

Unit test files follow the `*.{test,spec}.{js,ts}` naming convention and live alongside source files under `src/`.

Controller spec files (`*.controller.spec.ts`) are excluded from the backend unit test run by default — they are tested via E2E instead.

## E2E Tests

E2E tests live in `apps/nestjs-backend/test/` and use the `*.e2e-spec.ts` naming convention. There are 155+ spec files covering records, fields, views, aggregations, links, attachments, auth, collaboration, and more.

### Setup

E2E tests require a seeded test database. Run setup once before the first test run (or after schema changes):

```bash
cd apps/nestjs-backend
pnpm pre-test-e2e
```

This runs `prisma-db-seed --e2e` against the test database.

The E2E config (`vitest-e2e.config.ts`) forces timezone to UTC for deterministic datetime results.

### Running E2E Tests

```bash
# Run the full E2E suite
cd apps/nestjs-backend
pnpm test-e2e

# Run a specific test file
pnpm test-e2e test/record.e2e-spec.ts

# Run with coverage
pnpm test-e2e-cover
```

Example spec files:

- `test/record.e2e-spec.ts` — record CRUD and filtering
- `test/auth.e2e-spec.ts` — authentication flows
- `test/aggregation.e2e-spec.ts` — aggregation queries
- `test/basic-link.e2e-spec.ts` — table linking
- `test/collaboration.e2e-spec.ts` — multi-user scenarios
- `test/undo-redo.e2e-spec.ts` — history operations
- `test/table-import.e2e-spec.ts` / `test/table-export.e2e-spec.ts` — import/export

### Run Everything

```bash
# Run all unit + all E2E across the monorepo
pnpm g:test
```

## IDE Integration (VSCode / Cursor)

Debug configurations are defined in `.vscode/launch.json`. Open the **Run and Debug** panel and select:

| Config name | What it runs |
|-------------|-------------|
| `vitest e2e nest backend` | Active E2E spec file via `vitest-e2e.config.ts` |
| `Debug vitest e2e nest backend` | Same, with verbose reporter and no file parallelism |
| `vitest nest backend` | Active unit spec file via `vitest.config.ts` |
| `vitest next app` | Active spec file in `apps/nextjs-app` |
| `vitest core` | Active spec file in `packages/core` |
| `vitest sdk` | Active spec file in `packages/sdk` |

To debug a specific E2E test: open the spec file, then launch "vitest e2e nest backend". The config uses `${relativeFile}` so it runs whatever file is active in the editor.

## Writing New Tests

### Unit tests

Place unit test files next to the source file being tested:

```
src/
  features/
    record/
      record.service.ts
      record.service.spec.ts   ← unit test
```

Use `*.spec.ts` or `*.test.ts` extension. The vitest config picks up `**/src/**/*.{test,spec}.{js,ts}`.

### E2E tests

Place E2E test files in `apps/nestjs-backend/test/` using the `*.e2e-spec.ts` extension:

```
apps/nestjs-backend/
  test/
    my-feature.e2e-spec.ts
```

Shared test utilities are in `apps/nestjs-backend/test/utils/` and `test/data-helpers/`. Reuse these for database setup and HTTP request helpers rather than writing custom bootstrapping.

E2E tests run sequentially per file (no file parallelism in the debug config). The CI timeout is 60 seconds per test; locally it defaults to 10 seconds.

## Coverage

Coverage is collected with `@vitest/coverage-v8`. Reports are written to:

- Unit: `apps/nestjs-backend/coverage/unit/`
- E2E: `apps/nestjs-backend/coverage/e2e/`
- Merged: `apps/nestjs-backend/coverage/nestjs-backend/`

To merge and view a combined report:

```bash
cd apps/nestjs-backend
pnpm merge-cover
pnpm generate-cover
```

Coveralls integration tracks coverage over time — the badge is in the root README. No minimum thresholds are configured in the Vitest configs.

## CI

| Workflow | Trigger | Command |
|----------|---------|---------|
| `unit-tests.yml` | Push/PR to `develop` (nextjs-app, core, sdk, openapi changes) | `pnpm -F "!@teable/backend" -r --parallel test-unit` |
| `integration-tests.yml` | See workflow file | <!-- VERIFY: exact trigger and command --> |
| `v2-core-tests.yml` | See workflow file | <!-- VERIFY: exact trigger and command --> |

The unit test CI matrix runs on Node.js 22.18.0 (ubuntu-latest). It builds all packages before running tests, and generates the Prisma client first.
