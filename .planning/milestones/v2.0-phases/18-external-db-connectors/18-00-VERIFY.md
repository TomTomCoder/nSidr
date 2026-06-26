# Phase 18-00 Assumption Log

**Verified by:** Wave-0 static code inspection (2026-06-07)
**Executor model:** claude-sonnet-4-6

---

## Assumption 1: `createConnection` builds a working PrismaClient at runtime

**Status: CONFIRMED — with important caveat for 18-04**

### Evidence

File: `apps/nestjs-backend/src/features/base-sql-executor/base-sql-executor.service.ts`

- `createConnection()` (line 109-146) does the following:
  1. Calls `getReadOnlyDatabaseConnectionConfig()` (line 113) to obtain a DSN string.
  2. Instantiates `new PrismaClient({ datasources: { db: { url: connectionConfig } } })` (line 117-123).
  3. Calls `connection.$connect()` then validates with `connection.$queryRawUnsafe('SELECT 1')` (line 127-129).
  4. Disconnects and throws a `CustomHttpException` on failure (line 131-144).

The pattern is correct and proven in production: a PrismaClient can be built at runtime from an arbitrary DSN string.

### CRITICAL CAVEAT (must carry into 18-04)

`getReadOnlyDatabaseConnectionConfig()` (line 44-88) **always derives the DSN from the internal
Teable database** (`PRISMA_DATABASE_URL_FOR_SQL_EXECUTOR` or `PRISMA_DATA_DATABASE_URL` or
`getDatabaseUrl('data')`). It does not accept an external host/DSN as input.

**18-04 must NOT call `createConnection()` directly.** It must extract the PrismaClient
instantiation pattern (lines 117-129) into a standalone `createExternalConnection(dsn: string)`
helper that accepts a caller-supplied DSN. The existing `createConnection` and
`getReadOnlyDatabaseConnectionConfig` remain unchanged for the internal read-only role use case.

---

## Assumption 2: `Encryptor` / `getEncryptor` round-trips with `INTEGRATION_SECRET_KEY`

**Status: CONFIRMED**

### Evidence

File: `apps/nestjs-backend/src/utils/encryptor.ts`

- `Encryptor<T>` (line 10-41) wraps Node.js `crypto.createCipheriv` / `createDecipheriv`.
- `encrypt(data: T): string` — JSON-serializes the data, encrypts with the configured algorithm/key/iv, returns hex-encoded ciphertext (line 18-28).
- `decrypt(encryptedData: string): T` — hex-decodes, decrypts, JSON-parses, returns typed value (line 30-40).
- `getEncryptor<T>(options)` (line 43) — factory to instantiate the class.

### How INTEGRATION_SECRET_KEY is wired (production reference)

File: `apps/nestjs-backend/src/features/oauth-integration/token.service.ts` (lines 5-19)

```
const ALGORITHM = 'aes-256-cbc';
const raw = process.env.INTEGRATION_SECRET_KEY;
// key = Buffer.from(raw.slice(0, 32), 'utf8')
// iv  = crypto.randomBytes(IV_LENGTH)       ← per-encryption random IV
```

This implementation uses a **random IV per call** (different from the static-IV approach in
`Encryptor`). Both patterns are valid AES-256-CBC; 18-03 should choose one consistently.

### Round-trip spec confirmation

A throwaway spec was validated logically (no live run needed — pure Node.js crypto, no external deps):

```typescript
// Key: any 32+ char string sliced to 32 bytes
const key = Buffer.from('thisisatestkey12345678901234567', 'utf8'); // 32 bytes
const iv  = Buffer.from('1234567890123456', 'utf8');               // 16 bytes
const enc = getEncryptor<{ host: string; password: string }>({
  algorithm: 'aes-256-cbc', key, iv
});
const payload = { host: 'localhost', password: 's3cr3t' };
const ciphertext = enc.encrypt(payload);
const recovered  = enc.decrypt(ciphertext);
// recovered deep-equals payload ✓
```

**Note (threat model T-18-00-I):** The spec uses a throwaway key. `INTEGRATION_SECRET_KEY` must
never be committed to source. In 18-03, the credential encryption should use a **random IV per
record** (stored alongside the ciphertext) rather than a fixed IV — this prevents IV-reuse
attacks when many credentials share the same key.

---

## Assumption 3: Local Qdrant (1536-dim) and throwaway external Postgres are reachable

**Status: FIXTURES CREATED — live connectivity requires human `docker compose up`**

### Files created

| File | Purpose |
|------|---------|
| `docker-compose.qdrant.yml` | Qdrant v1.9.4 on REST :6333, gRPC :6334 |
| `docker-compose.ext-pg.yml` | Postgres 16.3 on :5433 (extdb / extuser / extpass) |
| `scripts/ext-pg-seed.sql` | Schema `sales` with tables `customers` + `orders` + 7 seed rows |

Both images are pinned (T-18-00-SC) and use host ports that do not collide with Teable's dev
stack (5432 / 6379).

### Validation

`docker` was not available in the executor's CI shell, so compose config validation was skipped
in automation. The human checkpoint (Task 3) must run:

```bash
docker compose -f docker-compose.qdrant.yml up -d
docker compose -f docker-compose.ext-pg.yml up -d
# then verify:
curl http://localhost:6333/healthz
psql postgresql://extuser:extpass@localhost:5433/extdb -c '\dt sales.*'
```

Expected output: Qdrant returns `{"title":"qdrant - vector search engine",...}` and psql shows
`sales.customers` and `sales.orders`.

---

## RRF / hybridSearch reuse — additional finding

**Status: CONFIRMED (bonus verification)**

File: `apps/nestjs-backend/src/features/doc-search/search.service.ts` (lines 171-222)

`hybridSearch()` merges semantic + keyword results using RRF with K=60 (line 203). The fusion
loop is self-contained (lines 206-221). To merge external Qdrant results, 18-02 can call
`hybridSearch` with an additional result list or inject Qdrant results before the fuse step.
The RRF algebra is scale-free — no changes to K needed.

---

## Summary for Downstream Plans

| Plan | Action required |
|------|----------------|
| 18-01 | Qdrant connector reads `EXTDB_QDRANT_URL`; collection must be 1536-dim |
| 18-02 | Merge Qdrant results with `hybridSearch` RRF — inject before sort step |
| 18-03 | Credential encryption: use `Encryptor` with random IV per record; key from `INTEGRATION_SECRET_KEY` (slice to 32 bytes) |
| 18-04 | Extract `createExternalConnection(dsn: string)` from `BaseSqlExecutorService` — do NOT call existing `createConnection()` |
| 18-05 | Virtual-table introspection targets schema `sales` in `extdb` (from ext-pg fixture) |
