# Testing Patterns

**Analysis Date:** 2026-05-24

## Test Framework

**Runner:**
- Vitest (all packages except plugin)
- Jest-compatible API (uses same assertion library as Jest)
- Config: workspace-specific `vitest.config.ts` per package/app
- Coverage provider: v8 (built-in)

**Assertion Library:**
- Jest-style assertions: `expect()`, `toEqual()`, `toBeDefined()`, etc.
- Compatible across Vitest and Jest test suites
- ESLint plugin `eslint-plugin-jest` enforces Jest best practices

**Run Commands (from root):**
```bash
pnpm g:test                   # Run all tests (unit + e2e)
pnpm g:test-unit             # Run all unit tests (parallel)
pnpm g:test-unit-cover       # Unit tests with coverage
pnpm g:test-e2e              # Run all E2E tests (Playwright)
pnpm g:test-e2e-cover        # E2E with coverage

# Workspace-specific (from package directory)
pnpm test-unit:watch         # Watch mode for development
pnpm test-unit               # Run once, bail on first failure
```

## Test File Organization

**Location:**
- **Unit tests (co-located):** `src/**/*.test.ts`, `src/**/*.spec.ts`
- **Integration tests (co-located):** Part of `src/**/*.test.ts` with different describe blocks
- **E2E tests (separate):** `apps/nextjs-app/e2e/**/*.ts` (Playwright tests)
- **Fixtures (co-located):** Utility files in same directory as tests

**Naming:**
- Suffix pattern: `.test.ts` (most common) or `.spec.ts` (alternative)
- Test files grouped in `__tests__/` subdirectories in some packages
- Example: `packages/core/src/asserts/__tests__/asserts.test.ts`

**Structure:**
```
packages/[name]/
├── src/
│   ├── module.ts
│   ├── module.test.ts          # Co-located unit test
│   └── __tests__/
│       └── integration.test.ts  # Alternative: grouped in subdirectory
└── vitest.config.ts            # Package-level config
```

## Test Structure

**Suite Organization (Vitest/Jest pattern):**
```typescript
import { describe, expect, it } from 'vitest';

describe('Module name', () => {
  describe('Feature area', () => {
    it('should do X when Y', () => {
      expect(result).toBeDefined();
    });
  });
});
```

**Patterns:**

1. **Setup in beforeEach, teardown in afterEach:**
```typescript
beforeEach(() => {
  pipe = new ZodValidationPipe(simpleSchema);
});

afterEach(() => {
  // cleanup code
});
```

2. **Assertion style:**
```typescript
expect(() => {
  assertNonEmptyString('cool');
}).not.toThrow();

expect(() => {
  assertNonEmptyString(' ', 'message');
}).toThrow('message');
```

3. **Test error conditions:**
```typescript
try {
  pipe.transform(invalidData, {} as any);
  fail('Should have thrown');
} catch (error) {
  const message = (error as BadRequestException).message;
  expect(message).toContain('Validation error');
}
```

## Mocking

**Framework:** Vitest built-in mocking via `vi` object

**Patterns:**
- Use `import { vi } from 'vitest'` for mocks and spies
- Mock external modules: `vi.mock('@teable/package')`
- Spy on functions: `vi.spyOn(module, 'function')`
- Common in testing pipes, services, and API calls

**What to Mock:**
- External API calls
- Database operations (replace with test fixtures)
- File system operations
- NestJS services in integration tests

**What NOT to Mock:**
- Pure utility functions (test them directly)
- Core business logic (test end-to-end when possible)
- Standard library functions
- Test fixtures themselves

## Fixtures and Factories

**Test Data:**

Factory pattern from `zod.validation.pipe.spec.ts`:
```typescript
const simpleSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const validData = {
  name: 'John',
  age: 30,
};

const invalidData = {
  name: 'John',
  age: 'thirty', // Wrong type
};
```

**Faker for generated data:**
- Package: `@faker-js/faker` v8.4.1 (in devDeps)
- Use for randomized test data in integration/E2E tests
- Prevents test brittleness from hardcoded values

**Location:**
- Inline within test file for simple fixtures
- Separate `fixtures/` directory for shared fixtures
- E2E fixtures in `apps/nextjs-app/e2e/fixtures/` (auth setup, test data)

## Coverage

**Requirements:** Coverage reported but not enforced via `--coverage` flag

**View Coverage:**
```bash
# Unit test coverage
pnpm test-unit-cover --coverage

# E2E test coverage
pnpm test-e2e-cover --coverage

# Merge coverage reports
pnpm merge-cover       # Combines unit + e2e coverage
pnpm generate-cover    # Generates HTML report
```

**Configuration by package:**
- Next.js app (`vitest.config.ts`):
  - Include: `src/**/*.{js,jsx,ts,tsx}`, `config/**/*.{js,jsx,ts,tsx}`
  - Provider: v8

- NestJS backend (`vitest.config.ts`):
  - Include: `src/**/*.{js,ts}`
  - Report dir: `./coverage/unit`
  - Provider: v8

- Formula/SDK packages: Similar include patterns with source coverage

## Test Types

**Unit Tests:**
- Scope: Single function or class in isolation
- Location: Co-located with source in `src/**/*.test.ts`
- Approach: Direct function calls, mocked dependencies
- Example: `asserts.test.ts` tests assertion helper functions
- Run: `pnpm g:test-unit` (parallel across workspaces)

**Integration Tests:**
- Scope: Multiple components working together
- Location: Same file as unit tests or separate describe blocks
- Approach: Test pipes, services, database interactions with test data
- Example: `zod.validation.pipe.spec.ts` tests validation end-to-end
- Database: Uses test PostgreSQL database (seeded via `pre-test-e2e`)

**E2E Tests (Playwright):**
- Scope: Full user workflows in browser
- Location: `apps/nextjs-app/e2e/**/*.ts`
- Framework: Playwright v1.x (installed via `pnpm install:playwright`)
- Approach: Browser automation, login flows, UI interactions
- Config: `apps/nextjs-app/playwright.config.ts`
- Setup: Auth fixture runs first, saves session for test reuse
- Run: `pnpm g:test-e2e` (runs webserver and tests)

## Playwright Configuration (E2E)

**Setup Phase:**
```typescript
{
  name: 'setup',
  testMatch: /fixtures\/auth\.ts/,
}
```
- Runs auth login once, saves `storageState` for subsequent tests
- All feature tests depend on `setup` project
- Avoids repeating login for every E2E test

**Browser Coverage:**
- Desktop Chrome (primary)
- Mobile Chrome (Pixel 5 viewport)
- Firefox and Safari commented out (can be enabled)

**Environment:**
- Web server: Runs on port **3000** (Next.js UI); NestJS backend on port 3001
- Mode: DEV (next dev), START (next start), or BUILD_AND_START (full build)
- Timeout: 30s in dev, 90s-180s in CI
- Retries: 1 in dev, 3 in CI
- Workers: Parallel in dev, serial in CI

**Artifacts:**
- Screenshots on failure
- Videos of test runs
- HTML reports with full traces
- Output dir: `e2e/.out/`

## CI/CD Testing Setup

**GitHub Actions:**
- Config: `.github/workflows/` (CI files)
- Test matrix: Runs on Linux (matrix testing)
- Commands: `pnpm g:test-unit-cover`, `pnpm g:test-e2e-cover`
- Coverage: Collected and reported

**Pre-commit Hooks:**
- `lint-staged` runs on staged files before commit
- Runs ESLint fixes on `**/*.{js,jsx,ts,tsx}` files
- Runs Prettier on `**/*.{json,md,mdx,css,html,yml,yaml,scss}`
- Enforced: No focused tests (`jest/no-focused-tests`), max 25 warnings

**Pre-test Database Setup:**
- `pnpm pre-test-e2e` seeds PostgreSQL with test data
- Uses Prisma seed script: `@teable/db-main-prisma prisma-db-seed --e2e`
- Cleanup not automatic (persistent between test runs)

## Common Patterns

**Async Testing:**
- Vitest/Jest auto-handles Promise returns
- Use `async/await` in test functions
- Example from NestJS backend tests:
```typescript
it('should pass through valid data unchanged', async () => {
  const result = await pipe.transform(validData, {} as any);
  expect(result).toEqual(validData);
});
```

**Error Testing:**
```typescript
expect(() => functionThatThrows()).toThrow();
expect(() => functionThatThrows()).toThrow(SpecificError);
expect(() => functionThatThrows()).toThrow('error message');

// or with try-catch
try {
  await riskyOperation();
  fail('Should have thrown');
} catch (error) {
  expect(error).toBeInstanceOf(BadRequestException);
}
```

**Mocking Modules:**
```typescript
vi.mock('@teable/core', () => ({
  exportedFunction: vi.fn(() => 'mocked value'),
}));
```

**Clearing Mocks Between Tests:**
- Vitest clears mocks automatically between tests
- Or explicitly: `vi.clearAllMocks()` in `afterEach()`

## Test Utilities

**Testing Library (React):**
- Package: `@testing-library/react` and `@testing-library/jest-dom`
- Used in Next.js app tests
- Setup file: `apps/nextjs-app/config/tests/setupVitest.ts`
- Provides render, screen, userEvent utilities

**Happy DOM:**
- Environment for Next.js app tests (lightweight)
- Config: `environment: 'happy-dom'` in vitest.config.ts

**Node Environment:**
- Environment for NestJS backend tests (e.g., `environment: 'node'`)
- Allows database access, file system operations

---

*Testing analysis: 2026-05-24*
