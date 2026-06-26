# Coding Conventions

**Analysis Date:** 2026-05-24

## Naming Patterns

**Files:**
- Test files use `.test.ts`, `.test.tsx`, or `.spec.ts` suffixes (e.g., `asserts.test.ts`, `zod.validation.pipe.spec.ts`)
- Service classes follow `[name].service.ts` pattern (e.g., `prisma.service.ts`)
- Module definitions follow `[name].module.ts` pattern (e.g., `prisma.module.ts`)
- Component files are PascalCase: `ColorPicker.tsx`, not `color-picker.tsx`
- Utility/helper files are kebab-case: `string-convert.ts`, `database-url.ts`
- Config files use descriptive kebab-case: `vitest.config.ts`, `playwright.config.ts`

**Functions:**
- Use camelCase for function names: `buildDatetimeFormatSql()`, `hasDatetimeTimezoneToken()`
- Use camelCase for function parameters: `buildDatetimeFormatSql(columnName, formatString)`
- Getters use `get` prefix: `getEslintFixCmd()`, `getNextJsEnv()`
- Test functions use lowercase: `describe()`, `it()`, `expect()`

**Variables:**
- Use camelCase for local variables: `validData`, `schemaWithCustomError`
- Use camelCase for constants (not SCREAMING_SNAKE_CASE): `defaultTxTimeout`, `webServerPort`
- Use PascalCase for classes and type constructors: `PrismaClient`, `ZodValidationPipe`
- Use SCREAMING_SNAKE_CASE only for interface naming constants: `DATETIME_FORMAT_TOKEN_TO_POSTGRES`

**Types:**
- TypeScript interfaces prefixed with `I`: `ITx`, `IDatabaseTarget`, `IWebServerConfig`
- Type aliases in PascalCase: `IWebServerMode`, generic types like `Record<string, string>`
- Union types and literal types: `'DEV' | 'START' | 'BUILD_AND_START'`

## Code Style

**Formatting:**
- Prettier v3.2.5 enforces code formatting
- Config file: `.prettierrc.js` (uses `@teable/eslint-config-bases` helpers)
- Single quotes for code, double quotes for Markdown
- 2-space indentation (Prettier default)
- Trailing commas in multi-line objects/arrays

**Linting:**
- ESLint 8.57.0 as primary linter
- Config package: `@teable/eslint-config-bases` (workspace package at `packages/eslint-config-bases`)
- ESLint extends multiple base configs:
  - TypeScript support via `@teable/eslint-config-bases/typescript`
  - SonarQube rules via `@teable/eslint-config-bases/sonar`
  - Jest/Vitest via `@teable/eslint-config-bases/jest`
  - React via `@teable/eslint-config-bases/react` (with Tailwind and RTL support)
  - Next.js core-web-vitals via `plugin:@next/next/core-web-vitals`
  - Prettier integration via `@teable/eslint-config-bases/prettier-plugin`

**TypeScript:**
- TypeScript 5.4.3 with strict mode enabled
- Target: ES2017
- Module: ESNext
- JSX: react-jsx (automatic JSX transform)
- Path aliases configured in `tsconfig.json` (uses `tsconfigPaths` plugin in Vitest)
- Type checking run via `pnpm g:typecheck` (parallel workspace execution)

## Import Organization

**Order (enforced by ESLint):**
1. External library imports (`react`, `@nestjs/common`, etc.)
2. Workspace package imports (`@teable/*` from other packages)
3. Local relative imports (`../`, `./`)
4. Type-only imports separated with `import type`

**Path Aliases:**
- Workspace packages use `@teable/[package-name]` (monorepo dependencies)
- Relative paths use `../` for parent directories
- ESLint relaxed for test files: `import/no-named-as-default-member` disabled

**Example from `prisma.service.ts`:**
```typescript
import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import type { ClsService } from 'nestjs-cls';
import { getDatabaseUrl, type IDatabaseTarget } from './database-url';
import { TimeoutHttpException } from './utils';
```

## Error Handling

**Patterns:**
- Throw custom exceptions for application errors (e.g., `BadRequestException` from NestJS)
- Use try-catch for Prisma operations and graceful error wrapping
- Example from `zod.validation.pipe.spec.ts`: Catch validation errors and wrap in domain exceptions
- Prisma timeout errors (`P2028`) wrapped in `TimeoutHttpException`

**Validation:**
- Use Zod schemas for input validation (`@teable/openapi` exposes Zod schemas)
- Custom error messages in Zod: `.refine()` with descriptive messages
- Error message truncation at ~1000 characters for very long validation errors

## Logging

**Framework:** Console or NestJS `Logger` (no external logging library)

**Patterns:**
- NestJS services use `Logger` class: `private readonly logger: Logger`
- Log errors with context and timestamps during operations
- Console output in config scripts uses `picocolors` for CLI colors
- Suppress output in CI environments using `isCI` flag

**Example from `playwright.config.ts`:**
```typescript
import pc from 'picocolors';
// ...
console.log(`${pc.green('notice')} - Using E2E_WEBSERVER_MODE: '${webServerMode}'`);
console.error(`${pc.red('error')} - E2E_WEBSERVER_MODE must be one of ...`);
```

## Comments

**When to Comment:**
- Document complex algorithms or non-obvious logic
- Explain WHY, not WHAT (code should be self-documenting)
- Link to external references (GitHub issues, RFC docs) when relevant
- Use `// eslint-disable` inline comments with reason when disabling linter rules

**JSDoc/TSDoc:**
- Use for public API exports and complex function signatures
- Type annotations preferred over JSDoc for TypeScript
- Example from `playwright.config.ts`:
```typescript
/**
 * @type {IWebServerConfig}
 */
const config = { ... }
```

**Eslint Disable Comments:**
- Disable only specific rules, not entire rules: `@typescript-eslint/no-explicit-any`
- Add reason in comment when disabling rules
- Common test file disables:
  - `@typescript-eslint/no-explicit-any` (allowed in test setup)
  - `@typescript-eslint/no-non-null-assertion` (okay in tests)
  - `react/display-name` (for dynamic components in tests)

## Function Design

**Size:** 
- Keep functions under 50 lines when possible (SonarQube rule enforced)
- Break large functions into smaller, testable units
- Use composition over nesting

**Parameters:**
- Max 3-4 parameters; use object destructuring for more
- Example from `getEslintFixCmd()`:
```typescript
const getEslintFixCmd = ({
  cwd,
  files,
  rules,
  fix,
  fixType,
  cache,
  maxWarnings,
}) => { ... }
```

**Return Values:**
- Explicitly type function returns: `-> Promise<IResult>`, not `-> Promise<unknown>`
- Use union types for multiple return shapes: `-> string | null`
- Example from code: `buildDatetimeFormatSql(columnName, format) -> string`

## Module Design

**Exports:**
- Use named exports for clarity: `export function helper() {}`
- Re-export from index files for public API: `export * from './types'`
- Type-only exports separated: `export type { ITx }`
- Example from `packages/core/src/index.ts`:
```typescript
export * from './types';
export * from './array';
export * from './asserts';
export * from './models';
export * from './utils';
```

**Barrel Files:**
- Use `index.ts` as barrel files for re-exporting packages
- Allows clean imports: `import { helper } from '@teable/core'` instead of `@teable/core/helpers`

**Class Design:**
- NestJS services use `@Injectable()` decorator
- Services extend framework classes when appropriate (e.g., `PrismaClient`)
- Use private/readonly for internal state management
- Example: `class NamedPrismaService extends PrismaClient { private readonly logger: Logger }`

## Test-Specific Conventions

**Relaxed Rules in Test Files:**
- Patterns matching `**/?(*.)+(test).{js,jsx,ts,tsx}` and `**/*.spec.ts`
- Disabled: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`
- Disabled: import namespace checks (`import/namespace`, `import/default`)
- Extra Jest rules enforced: `jest/no-focused-tests`, `jest/prefer-hooks-on-top`, `jest/consistent-test-it`

**Hooks in Order:**
- ESLint enforces: `jest/prefer-hooks-in-order` (beforeAll before beforeEach, etc.)
- Setup code in `beforeEach()`, cleanup in `afterEach()`
- No conditional logic in test bodies: `jest/no-conditional-in-test` error

---

*Convention analysis: 2026-05-24*
