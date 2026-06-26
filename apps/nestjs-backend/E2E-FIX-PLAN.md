# E2E Progressive Fix Plan

Generated: 2026-05-25 | Branch: refactor/architecture-deep-fix

## Status Summary

| Category                            | Tests               | Status                |
| ----------------------------------- | ------------------- | --------------------- |
| Native module esbuild error         | ~13 files           | ✅ FIXED (b3e4919)    |
| `teable_try_cast_valid` missing     | 4 files (154 tests) | ✅ FIXED (manual SQL) |
| HTTP status code mismatches         | 5 tests             | ⏳ Wave 1             |
| Timezone/datetime failures          | ~15 tests           | ⏳ Wave 2             |
| BLANK() logic failures              | 2 tests             | ⏳ Wave 3             |
| Excel import `cols is not iterable` | 2 tests             | ⏳ Wave 3             |
| TSV content type not supported      | 1 test              | ⏳ Wave 3             |

---

## Wave 1 — HTTP Status Code Mismatches (5 tests)

### 1a. auth.e2e-spec.ts — 400 vs 409 (2 tests)

**Tests**: "system email" operations return `409 Conflict` but tests expect `400 Bad Request`

**Root cause hypothesis**: Tests were written before a "duplicate resource" check was added.
Need to check whether:

- The server intentionally returns 409 for duplicate emails (correct server behavior)
- Or the server regression changed a 400 to 409

**Fix approach**:

1. Read `apps/nestjs-backend/src/test/auth.e2e-spec.ts` around the failing assertions
2. Read the auth controller/service to understand current 409 behavior
3. If 409 is the correct semantic (duplicate email → conflict), update test expectations
4. If 400 is correct, find where the 409 is being thrown and revert

**Files to investigate**:

- `apps/nestjs-backend/src/test/auth.e2e-spec.ts`
- `apps/nestjs-backend/src/features/auth/` (controller + service)

---

### 1b. space.e2e-spec.ts — 403 vs 404 (3 tests)

**Tests**: Operations on a deleted space return `404 Not Found` but tests expect `403 Forbidden`

**Root cause hypothesis**: Authorization check runs AFTER the existence check. A deleted space
returns 404 before the permission check returns 403.

**Fix approach**:

1. Read `apps/nestjs-backend/src/test/space.e2e-spec.ts` around failing assertions
2. Check space guard/middleware — does auth check precede existence check?
3. Option A: Move permission guard before existence check (returns 403 first)
4. Option B: Update tests to expect 404 (if 404 is semantically correct for deleted resources)

**Files to investigate**:

- `apps/nestjs-backend/src/test/space.e2e-spec.ts`
- `apps/nestjs-backend/src/features/space/` (guard, service, controller)

---

## Wave 2 — Timezone/Datetime Failures (~15 tests)

**Affected files**:

- `formula.e2e-spec.ts` (DATE_ADD, date arithmetic)
- `formula-datetime-parse-update.e2e-spec.ts` (DATETIME_PARSE)
- `generated-column-numeric-coercion.e2e-spec.ts` (date coercion)

**Symptom**: Tests expect UTC midnight `T00:00:00.000Z` but receive `T22:00:00.000Z` (UTC+2 offset, consistent with Europe/Paris)

**Root cause hypothesis**: PostgreSQL server timezone is set to `Europe/Paris` (or system TZ), not UTC.
When Teable does date arithmetic in DB (e.g., `NOW()::date`, `date_trunc('day', ...)`) it uses the DB session timezone.

`vitest-e2e.config.ts` sets `process.env.TZ = 'UTC'` but this only affects Node.js — not PostgreSQL.

**Fix approach**:

1. Check PostgreSQL timezone: `SHOW timezone;` in psql
2. Check if Prisma/the NestJS app sets a session timezone on connection
3. Option A: Add `SET timezone = 'UTC'` to the Prisma connection string or datasource config
4. Option B: Set `TimeZone = 'UTC'` in `postgresql.conf` (global, affects all connections)
5. Option C: Migrate formula date computations to always use `AT TIME ZONE 'UTC'`

**Likely quickest fix**: Add `options=-c timezone=UTC` to the PostgreSQL connection URL in `.env.test`
Example: `postgresql://user:pass@localhost:5432/teable?options=-c%20timezone%3DUTC`

**Files to investigate**:

- `.env` / `.env.test` in `apps/nestjs-app` (Prisma connection URL)
- `packages/db-main-prisma/prisma/schema.prisma` (datasource config)
- Formula engine date functions

---

## Wave 3 — Logic Bugs (5 tests)

### 3a. BLANK() logic failures (2 tests)

**Affected files**: `formula.e2e-spec.ts`, `formula-metadata-coercion.e2e-spec.ts`

**Root cause**: BLANK() formula returns unexpected value — likely a type coercion edge case
where empty string, null, or 0 are not being treated consistently as "blank"

**Fix approach**:

1. Read failing test assertions to identify the exact expected vs actual values
2. Trace BLANK() implementation in `packages/core/src/formula/`
3. Check if a recent refactor changed null/undefined/empty-string handling

**Files to investigate**:

- `packages/core/src/formula/functions/` (BLANK implementation)
- Failing test assertions in formula spec files

---

### 3b. Excel import `cols is not iterable` (2 tests)

**Affected file**: `table-import.e2e-spec.ts`

**Root cause**: `ExcelImporter.genColumns` at line 302 of `import.class.ts`:

```ts
for (const [sheetName, cols] of Object.entries(parseResult))
```

`cols` is not iterable — `parseResult` entries have an unexpected shape (possibly `null`, `undefined`, or a non-array value for a sheet)

**Fix approach**:

1. Add null/undefined guard before iterating: `if (!cols || !Array.isArray(cols)) continue;`
2. Or fix the upstream `parseResult` shape to always return arrays

**Files to fix**:

- `apps/nestjs-backend/src/features/import/open-api/import.class.ts:302`

---

### 3c. TSV content type not supported (1 test)

**Affected file**: `table-import.e2e-spec.ts`

**Symptom**: `text/tab-separated-values;charset=utf-8` is rejected by the import endpoint

**Fix approach**:

1. Find where the import endpoint validates content types
2. Add `text/tab-separated-values` to the allowed MIME types list (alongside `text/csv`)

**Files to investigate**:

- `apps/nestjs-backend/src/features/import/open-api/` (content type validation)
- Or the file upload middleware

---

## Execution Order

```
Wave 1 (quickest wins, 5 tests):
  → Fix auth.e2e-spec status codes  (investigate: update test OR fix server)
  → Fix space.e2e-spec status codes (investigate: guard ordering)

Wave 2 (requires DB config change, ~15 tests):
  → Set PostgreSQL session timezone to UTC
  → Re-run formula date tests to confirm

Wave 3 (code changes, 5 tests):
  → Fix Excel importer null guard
  → Add TSV content type support
  → Fix BLANK() logic

Final:
  → Run full E2E suite to confirm zero failures
  → Commit each fix atomically with descriptive message
```
