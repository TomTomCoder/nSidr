/* eslint-disable @typescript-eslint/naming-convention */
import { Kysely, PostgresDialect } from 'kysely';
import type { IV2PostgresDbConfig } from './config';

// Use webpack's special require that bypasses bundling, falling back to dynamic import
// This is needed because webpack transforms dynamic imports in ways that bypass
// OpenTelemetry's module instrumentation (require-in-the-middle).
// By using native require, we ensure pg is properly instrumented for tracing.
declare const __non_webpack_require__: NodeRequire | undefined;
const useNativeRequire = typeof __non_webpack_require__ !== 'undefined';

const loadPg = async (): Promise<typeof import('pg')> => {
  if (useNativeRequire) {
    // In webpack environment, use native require to ensure OTel instrumentation works
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Promise.resolve(__non_webpack_require__!('pg') as any);
  }
  // In non-webpack environment (playground, tests), use standard import
  return import('pg');
};

const createPgDb = async <DB>(config: IV2PostgresDbConfig): Promise<Kysely<DB>> => {
  const connectionString = config.pg.connectionString;
  if (!connectionString) {
    throw new Error('Missing pg.connectionString');
  }

  // Use loadPg to ensure OTel instrumentation works in webpack environment
  const pg = await loadPg();
  const Pool = pg.Pool ?? (hasPgDefault(pg) ? pg.default.Pool : undefined);
  if (!Pool) {
    throw new Error('Missing pg.Pool');
  }

  const poolOptions = resolvePoolOptions(config);
  const pool = new Pool(poolOptions);
  pool.on('error', handlePgPoolError);
  patchPoolUtcDates(pool);

  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool,
    }),
  });
};

/**
 * Bind JS Date parameters as UTC ISO strings.
 *
 * node-postgres serializes Date objects in *local* time; for
 * `timestamp without time zone` columns Postgres drops the offset and stores
 * local wall-clock time, while Prisma (v1 read path) interprets the same
 * column as UTC. On a UTC+2 machine every v2-written timestamp therefore read
 * back 2 hours in the future ("Dernière modification : dans 2 heures").
 * UTC ISO strings parse identically for both timestamp and timestamptz.
 */
const patchPoolUtcDates = (pool: import('pg').Pool): void => {
  const toUtc = (v: unknown) => (v instanceof Date ? v.toISOString() : v);
  const patched = new WeakSet<object>();

  const patchClient = (client: { query: (...args: unknown[]) => unknown }) => {
    if (patched.has(client)) return;
    patched.add(client);
    const origQuery = client.query.bind(client);
    client.query = (...args: unknown[]) => {
      if (Array.isArray(args[1])) {
        args[1] = (args[1] as unknown[]).map(toUtc);
      } else if (
        args[0] &&
        typeof args[0] === 'object' &&
        Array.isArray((args[0] as { values?: unknown[] }).values)
      ) {
        args[0] = {
          ...(args[0] as object),
          values: (args[0] as { values: unknown[] }).values.map(toUtc),
        };
      }
      return origQuery(...args);
    };
  };

  const origConnect = pool.connect.bind(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pool as any).connect = (...args: unknown[]) => {
    if (args.length > 0) {
      // callback style: patch the client before handing it to the callback
      const cb = args[0] as (err: Error | undefined, client: never, release: never) => void;
      return origConnect((err, client, release) => {
        if (client) patchClient(client as never);
        cb(err, client as never, release as never);
      });
    }
    return origConnect().then((client) => {
      patchClient(client as never);
      return client;
    });
  };
};

export const createV2PostgresDb = async <DB = unknown>(
  config: IV2PostgresDbConfig
): Promise<Kysely<DB>> => {
  return createPgDb<DB>(config);
};

type PgDefaultExport = { Pool: typeof import('pg').Pool };

const hasPgDefault = (
  value: typeof import('pg')
): value is typeof import('pg') & {
  default: PgDefaultExport;
} => {
  return 'default' in value && !!value.default && 'Pool' in value.default;
};

type PgPoolOptions = {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxUses?: number;
  allowExitOnIdle?: boolean;
};

type PgPoolError = Error & { code?: string };

const ignoredPgPoolErrorCodes = new Set(['57P01', '57P02']);

export const shouldIgnorePgPoolError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const code = (error as PgPoolError).code;
  return typeof code === 'string' && ignoredPgPoolErrorCodes.has(code);
};

export const handlePgPoolError = (error: unknown): void => {
  if (shouldIgnorePgPoolError(error)) {
    return;
  }
  console.error('[v2-adapter-db-postgres-pg] Unexpected idle pg pool error', error);
};

const resolvePoolOptions = (config: IV2PostgresDbConfig): PgPoolOptions => {
  const { connectionString, pool } = config.pg;
  const poolOptions: PgPoolOptions = { connectionString, ...pool };

  // Align with v1: if connection_limit is present in the DSN, use it as pool max.
  if (poolOptions.max == null) {
    const maxFromDsn = readConnectionLimit(connectionString);
    poolOptions.max = maxFromDsn ?? 20;
  }

  return poolOptions;
};

const readConnectionLimit = (connectionString: string): number | undefined => {
  try {
    const url = new URL(connectionString);
    const value = url.searchParams.get('connection_limit');
    if (!value) return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
};
