# Codebase Concerns

**Analysis Date:** 2026-05-24

## Tech Debt

### Issue 1: "God Module" AppModule - Flat 49-Module Import Structure

**Issue:** All 49 feature modules imported flat in `apps/nestjs-backend/src/app.module.ts:70-125` with no hierarchical organization.

**Files:**
- `apps/nestjs-backend/src/app.module.ts` (lines 70-125)
- `apps/nestjs-backend/src/features/` (all 49 modules)

**Impact:**
- No lazy-loading capability
- Any module change ripples through entire application startup
- Full app must initialize for any feature test
- Increased startup time and memory usage
- Impossible to parallelize module initialization
- New developers cannot understand dependency graph

**Fix Approach:**
Implement tiered module architecture:
1. **Tier 0 (Global):** ConfigModule, LoggerModule, CacheModule, TracingModule
2. **Tier 1 (Data Access):** PrismaModule, RepositoryFactory, QueryBuilder
3. **Tier 2 (Business Logic):** AuthModule, UserModule, SpaceModule, BaseModule, TableModule
4. **Tier 3 (Features):** AiModule, AgentModule, OAuthIntegrationModule, DocSearchModule
5. **Tier 4 (API):** Controllers, OpenAPI modules

Create explicit barrel files (`core.module.ts`, `data-access.module.ts`, `business-logic.module.ts`) that re-export only what each tier provides. Add ESLint rules to enforce tier imports (prevent Features from importing other Features directly).

---

### Issue 2: Tight Coupling - Direct PrismaService Imports in Feature Modules

**Issue:** Services throughout the codebase import `PrismaService` directly instead of using repository abstractions.

**Files:**
- `apps/nestjs-backend/src/features/ai/prompt.service.ts` — imports `PrismaService` directly
- `apps/nestjs-backend/src/features/ai/ai.module.ts` (line 13) — imports SettingModule, TableOpenApiModule, FieldOpenApiModule, RecordOpenApiModule
- `apps/nestjs-backend/src/features/agent/agent.module.ts` — imports AiModule (circular risk)
- `apps/nestjs-backend/src/share-db/readonly/record-readonly.service.ts`
- `apps/nestjs-backend/src/share-db/share-db.service.ts`
- `apps/nestjs-backend/src/features/base-share/base-share.service.ts`
- And 30+ additional service files with direct Prisma imports

**Impact:**
- Hard to test without mocking concrete Prisma implementation
- Cannot reuse services in different contexts (CLI, mobile backend, etc.)
- Violates Dependency Inversion Principle
- Constructor signatures don't show actual data dependencies
- Difficult to swap database implementations
- Circular module dependencies risk (AiModule ↔ AgentModule)

**Fix Approach:**
Create repository abstractions (interfaces) for each domain entity:
1. `IPromptRepository` — PromptService uses this, not PrismaService
2. `ITokenRepository` — OAuthIntegrationService uses this
3. `IFieldRepository` — FieldService uses this (partial abstraction exists)
4. `IBaseRepository` — BaseService uses this (partial abstraction exists)

Implement each interface with `PrismaXxxRepository` classes. Inject repositories via DI instead of PrismaService. Remove module re-exports of OpenAPI modules that shouldn't be dependencies.

---

### Issue 3: Massive Monolithic Service Classes

**Issue:** Core business logic concentrated in very large service classes with >1500 lines.

**Files:**
- `apps/nestjs-backend/src/features/record/record.service.ts` (2,882 lines) — Handles all record operations
- `apps/nestjs-backend/src/features/base/base-import.service.ts` (2,692 lines) — Import logic
- `apps/nestjs-backend/src/features/field/open-api/field-open-api.service.ts` (2,205 lines) — Field API
- `apps/nestjs-backend/src/features/field/field-calculate/field-supplement.service.ts` (2,354 lines) — Field calculation
- `apps/nestjs-backend/src/features/record/query-builder/field-cte-visitor.ts` (2,836 lines) — SQL generation
- `apps/nestjs-backend/src/features/field/field.service.ts` (1,669 lines) — Core field operations
- `apps/nestjs-backend/src/features/ai/ai.service.ts` (1,535 lines) — AI operations

**Impact:**
- Difficult to maintain — cognitive load very high
- Single class handles too many responsibilities
- Hard to test individual features
- Code changes affect multiple unrelated concerns
- Difficult to reuse parts of logic
- Long methods (some >100 lines) with complex branching

**Fix Approach:**
Break into smaller, single-responsibility classes. For example, RecordService should delegate to:
- `RecordQueryService` — Query building and retrieval
- `RecordCreateService` — Creation logic
- `RecordUpdateService` — Update logic
- `RecordDeleteService` — Deletion logic
- `RecordPermissionService` (exists, expand) — Permission checks
- `RecordValidationService` — Validation

Use composition over inheritance. Each sub-service focuses on one operation type.

---

## Known Bugs & Issues

### Issue 1: Circular Module Dependencies Risk

**Symptoms:** Modules may fail to initialize; implicit ordering dependencies in app.module imports.

**Files:**
- `apps/nestjs-backend/src/features/agent/agent.module.ts` (imports AiModule)
- `apps/nestjs-backend/src/features/ai/ai.module.ts` (imported by AgentModule)

**Trigger:** Runtime initialization order issues when combined with lazy loading attempts.

**Current Mitigation:** Modules currently imported synchronously in order, preventing circular initialization failures at runtime.

**Recommendations:**
1. Explicitly detect and document circular dependencies
2. Refactor to break cycles (AgentService should inject IAiGenerationService interface, not AiModule)
3. Add pre-startup lint check that detects circular module imports

---

### Issue 2: $queryRawUnsafe() SQL Injection Risk

**Symptoms:** Potential SQL injection if query parameters not properly escaped.

**Files:**
- `apps/nestjs-backend/src/features/aggregation/aggregation.service.ts` (lines 581, 819, 980, 1047, 1172)
- `apps/nestjs-backend/src/features/record/record.service.ts` — May use queryRawUnsafe
- `apps/nestjs-backend/src/db-provider/select-query/postgres/select-query.postgres.ts` (2,080 lines)

**Trigger:** Any user-supplied data passed to $queryRawUnsafe without parameterization.

**Current Mitigation:** Code appears to use parameterized queries in most places, but $queryRawUnsafe name suggests unsafe patterns exist.

**Recommendations:**
1. Audit all $queryRawUnsafe() calls — ensure all dynamic values are parameterized
2. Replace with $queryRaw(Prisma.sql\`...\`) where possible
3. Add pre-commit lint rule flagging $queryRawUnsafe if it appears in new code
4. Document when raw queries are necessary vs. forbidden

---

## Performance Bottlenecks

### Issue 1: Record Service Query Performance - N+1 Problem Risk

**Problem:** RecordService (2,882 lines) may load records without proper batching, especially with linked fields and attachments.

**Files:**
- `apps/nestjs-backend/src/features/record/record.service.ts`
- `apps/nestjs-backend/src/features/data-loader/data-loader.service.ts` — Mitigates with DataLoader pattern

**Cause:** Complex field resolution (links, lookups, formulas) may require iterative queries.

**Improvement Path:**
1. Verify DataLoaderService is used for all linked field resolution
2. Implement field batching strategies for formula calculations
3. Profile with 1000+ record queries to find remaining N+1 patterns
4. Consider caching computed field results (with invalidation strategy)

---

### Issue 2: Large File Import/Export Operations

**Problem:** BaseImportService (2,692 lines) processes entire files in memory.

**Files:**
- `apps/nestjs-backend/src/features/base/base-import.service.ts` — May load entire CSV/Excel in memory
- `apps/nestjs-backend/src/features/base/base-export.service.ts` (1,498 lines) — Streaming export unclear

**Cause:** No evidence of streaming processing for large imports.

**Improvement Path:**
1. Implement streaming CSV/Excel parsing (PapaParse supports streaming)
2. Process records in batches (100-1000 per batch)
3. Add progress tracking for long-running imports
4. Set memory limits and reject files >100MB upfront

---

### Issue 3: Field Calculation Complexity - Field-Supplement Service

**Problem:** FieldSupplementService (2,354 lines) handles field calculation across all types (formula, lookup, rollup, count). Single monolithic service.

**Files:**
- `apps/nestjs-backend/src/features/field/field-calculate/field-supplement.service.ts`
- `apps/nestjs-backend/src/features/calculation/link.service.ts` (1,983 lines) — Link calculation

**Cause:** Different field types (formula, lookup, rollup, count) grouped into one service.

**Improvement Path:**
1. Create separate calculators per field type: FormulaCalculator, LookupCalculator, RollupCalculator, CountCalculator
2. Use strategy pattern for field-type-specific logic
3. Parallelize independent field calculations across records
4. Implement caching for lookup/rollup results with invalidation on link changes

---

## Security Considerations

### Issue 1: Direct Database Access in Feature Modules

**Risk:** Modules bypass repository abstractions and access database directly, making it hard to enforce access control.

**Files:**
- Any file importing `PrismaService` directly (documented above)

**Current Mitigation:** Some services have PermissionService checks, but not enforced by architecture.

**Recommendations:**
1. Enforce data access through repositories
2. Repositories should check permissions before returning data
3. Use database-level row-level security (RLS) as secondary defense
4. Audit all direct Prisma queries for missing permission checks

---

### Issue 2: AI/Agent Features - Potential Prompt Injection

**Risk:** AI features (PromptService, AgentExecutionService) may not properly sanitize user inputs in prompts.

**Files:**
- `apps/nestjs-backend/src/features/ai/prompt.service.ts`
- `apps/nestjs-backend/src/features/ai/ai.service.ts` (1,535 lines)
- `apps/nestjs-backend/src/features/agent/agent.module.ts`

**Current Mitigation:** None documented.

**Recommendations:**
1. Document all user inputs used in prompts
2. Sanitize/escape user inputs before passing to LLM APIs
3. Implement prompt templates (e.g., never concatenate user input directly)
4. Log all AI API calls for audit trail
5. Add rate limiting to AI endpoints

---

## Fragile Areas

### Issue 1: Field Type Conversion Logic

**Files:**
- `apps/nestjs-backend/src/features/field/field-calculate/field-converting.service.ts` (1,704 lines)
- `apps/nestjs-backend/src/features/field/field-converting-link.service.ts` — Link conversion
- `apps/nestjs-backend/src/features/field/typecast.validate.ts` — Type validation

**Why Fragile:**
- Field conversion involves complex state changes (database schema + data migration)
- Three separate monolithic services handle different aspects
- One bug in conversion can corrupt data

**Safe Modification:**
1. Add comprehensive E2E tests for each field type conversion path
2. Implement dry-run mode before actual migration
3. Create backups before running migrations
4. Test all linked field conversions in isolation
5. Verify rollback procedure works

**Test Coverage Gaps:**
- Conversion of fields with existing links to incompatible types
- Conversion of formula fields that reference converted fields
- Large-scale conversions (1000+ records)
- Conversion with concurrent updates

---

### Issue 2: Undo/Redo Operations

**Files:**
- `apps/nestjs-backend/src/features/undo-redo/operations/update-records-order.operation.ts`
- `apps/nestjs-backend/src/features/undo-redo/operations/update-records.operation.ts`

**Why Fragile:**
- Each operation type must serialize/deserialize state correctly
- Any mismatch between forward and backward state breaks consistency
- No transaction-level rollback if undo fails partway

**Safe Modification:**
1. Ensure all undo operations are idempotent
2. Add state validation before/after each operation
3. Test undo/redo chains (5+ operations sequentially)
4. Test undo/redo with concurrent updates

---

## Deprecated or Legacy Patterns

### Issue 1: ESLint Disabled Rules

**Problem:** Multiple files disable ESLint rules wholesale instead of fixing underlying issues.

**Files:**
- `apps/nestjs-backend/src/features/record/record.service.ts` (line 1) — `/* eslint-disable sonarjs/no-duplicate-string, @typescript-eslint/naming-convention */`

**Implications:**
- Hides code quality issues
- Makes violations invisible in code review

**Recommendations:**
1. Re-enable rules and fix violations (sonarjs/no-duplicate-string → extract constants, naming-convention → follow convention)
2. Never disable rules at file level — only disable specific lines with justification
3. Document why each line-level disable is necessary

---

### Issue 2: Query Builder Pattern - Complex Visitor Classes

**Files:**
- `apps/nestjs-backend/src/features/record/query-builder/field-cte-visitor.ts` (2,836 lines)
- `apps/nestjs-backend/src/features/record/query-builder/sql-conversion.visitor.ts` (2,476 lines)

**Implications:**
- Visitor pattern works but classes are too large
- Difficult to debug SQL generation issues
- Hard to extend with new field types

**Recommendations:**
1. Break visitor classes into smaller visitors per field type
2. Implement AST simplification before code generation
3. Add SQL generation tests with expected output comparisons
4. Consider using templating library instead of string concatenation

---

## Test Coverage Gaps

### Issue 1: Limited Unit Test Coverage for Core Services

**Untested Areas:**
- RecordService core operations (create, update, delete with linked fields)
- FieldService conversion and migration logic
- AiService/PromptService (no tests visible)

**Files:**
- `apps/nestjs-backend/src/features/record/record.service.ts` — No .spec.ts visible
- `apps/nestjs-backend/src/features/ai/prompt.service.ts` — No tests
- `apps/nestjs-backend/src/features/ai/ai.service.ts` — No tests

**Risk:** High-impact services have no unit test safety net.

**Priority:** HIGH

**Recommendations:**
1. Add unit tests for RecordService CRUD operations
2. Add unit tests for field conversion logic
3. Mock PrismaService (or better: inject IRepository)
4. Aim for 80% coverage of critical paths

---

### Issue 2: Integration Test Gaps

**Untested Scenarios:**
- Field conversions with linked records present
- Import operations with validation errors
- Undo/redo with concurrent updates
- Agent execution with external API failures

**Files:**
- E2E test suite: `packages/v2/e2e/src/*.e2e.spec.ts` (existing, but gaps remain)

**Risk:** Integration bugs found in production.

**Priority:** MEDIUM

**Recommendations:**
1. Add integration tests for field conversion + linked records
2. Add integration tests for import with validation edge cases
3. Add integration tests for undo/redo consistency
4. Add integration tests for agent tool execution failure paths

---

## Build & Deployment Concerns

### Issue 1: No TypeScript Config at Root

**Problem:** No `tsconfig.json` at root; each package has own config.

**Files:**
- No `tsconfig.json` in `/Users/tommylambert/Documents/Claude_Folder/teable/`

**Impact:**
- IDE TypeScript support may be inconsistent
- Build tools may not find shared types

**Recommendations:**
1. Create root `tsconfig.json` with base settings
2. Each workspace extends root config
3. Document TypeScript version requirement (see package.json: 5.4.3)

---

### Issue 2: Node Version Requirement Very High

**Problem:** Requires Node >=22.0.0 (very recent).

**Files:**
- `package.json` (line 85): `"node": ">=22.0.0"`

**Impact:**
- CI/CD must run on Node 22+
- Contributors with older Node versions cannot develop locally
- Deployment platforms must support Node 22

**Recommendations:**
1. Document why Node 22 is required (ES features? new APIs?)
2. Consider if minimum can be lowered (e.g., Node 20 LTS)
3. Add .nvmrc file for developer convenience

---

## Missing Critical Features

### Issue 1: No Database Migration Safety Checks

**Problem:** No pre-flight checks before running schema migrations.

**Files:**
- Field conversion services that modify schema
- Import services that alter data structure

**Impact:** Bad migrations can corrupt production data.

**Recommendations:**
1. Add pre-migration validation:
   - Check backup exists
   - Check disk space available
   - Check no concurrent operations running
2. Add post-migration verification:
   - Count records before/after
   - Validate data integrity checksums
3. Implement rollback procedure (backup restoration)

---

### Issue 2: Insufficient Logging in Critical Paths

**Problem:** Complex operations (field conversion, import, undo/redo) lack detailed logging.

**Files:**
- All services mentioned in "Fragile Areas" section

**Impact:** Debugging production issues is time-consuming.

**Recommendations:**
1. Add debug-level logging for all intermediate steps
2. Include operation context (user, workspace, table) in all logs
3. Structured logging (JSON) for easy parsing
4. Implement request tracing (correlation IDs across services)

---

## Scaling Limits

### Issue 1: Memory Usage with Large Record Sets

**Current Capacity:** Unknown; no documented limits.

**Limit:** Likely hits wall around 10,000+ records in memory (RecordService, BaseImportService load full result sets).

**Scaling Path:**
1. Implement streaming for large queries
2. Add pagination defaults (e.g., max 500 records per request)
3. Profile memory usage with 100K record tables
4. Consider connection pooling limits

---

### Issue 2: Database Query Performance with Complex Linked Fields

**Current Capacity:** Unknown; N+1 query pattern risk.

**Limit:** Query time likely degrades significantly with 5+ linked field levels.

**Scaling Path:**
1. Add query result caching for linked fields
2. Implement prefetching strategies (eager loading)
3. Profile with real-world schema (5+ levels of links)
4. Consider read replicas for read-heavy operations

---

## Dependencies at Risk

### Issue 1: @prisma/client Version Lock

**Package:** `@prisma/client` (pinned in monorepo)

**Risk:** Prisma updates may introduce breaking schema changes or driver incompatibilities.

**Current Version Check:** Not visible in provided package.json (likely in workspace package.json files).

**Recommendations:**
1. Document Prisma version strategy (major version lock, minor version allowed, etc.)
2. Plan quarterly Prisma updates
3. Test migrations against staging database before production

---

### Issue 2: Multiple OpenAPI Modules

**Problem:** OpenAPI modules (field-open-api, record-open-api, table-open-api) imported throughout feature modules, creating tight coupling.

**Files:**
- `apps/nestjs-backend/src/features/ai/ai.module.ts` imports TableOpenApiModule, FieldOpenApiModule, RecordOpenApiModule

**Risk:** API schema changes ripple throughout feature code.

**Recommendations:**
1. Move OpenAPI schema definitions to separate package
2. Feature modules import only interfaces, not OpenAPI modules
3. Register OpenAPI routes separately in API layer

---

## Documentation Gaps

### Issue 1: No Module Architecture Documentation

**Problem:** New developers cannot understand dependency hierarchy without reading code.

**Recommendations:**
1. Document module hierarchy (40+ modules, who imports what?)
2. Create architecture decision records (ADRs) for major patterns
3. Include module diagrams in CONTRIBUTING.md

---

### Issue 2: No Database Schema Documentation

**Problem:** Prisma schema is source of truth, but no ERD or field descriptions.

**Recommendations:**
1. Generate ER diagram from Prisma schema
2. Add descriptions to critical entities
3. Document field type constraints (length, format, etc.)

---

*Concerns audit: 2026-05-24*
