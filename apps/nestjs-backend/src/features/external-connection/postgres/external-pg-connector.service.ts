import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@teable/db-main-prisma';
import type { IExternalConnectionConfig } from '../external-connection.service';
import { ExternalConnectionService } from '../external-connection.service';
import { assertSelectOnly } from './statement-filter';

/** Injection token for the PrismaClient factory used by ExternalPgConnectorService. */
export const EXTERNAL_PRISMA_FACTORY = Symbol('EXTERNAL_PRISMA_FACTORY');

/**
 * Minimal interface for the PrismaClient surface we need.
 * Allows test injection of a fake without importing the full PrismaClient type.
 */
export interface IExternalPgClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

/**
 * Factory signature for creating a PrismaClient wired to an external DSN.
 * Injected so tests can supply a fake.
 */
export type ExternalPrismaFactory = (dsn: string) => IExternalPgClient;

/**
 * Default factory: creates a real PrismaClient pointing at the given DSN.
 */
export const defaultPrismaFactory: ExternalPrismaFactory = (dsn: string) =>
  new PrismaClient({
    datasources: { db: { url: dsn } },
  }) as unknown as IExternalPgClient;

/**
 * ExternalPgConnectorService
 *
 * Opens a read-only connection to a user-configured external Postgres using
 * the stored (SSRF-validated, AES-encrypted) ExternalConnection config.
 *
 * Design notes:
 * - Reuses the base-sql-executor "new PrismaClient with datasource URL" pattern
 *   but PARAMETERIZES the URL from the decrypted external connection config.
 * - Enforces read-only via assertSelectOnly() before any $queryRawUnsafe call
 *   (T-18-04-T, defense-in-depth alongside a read-only DB role if configured).
 * - Caches live clients per connectionId; call dispose() to release.
 * - The host is SSRF-validated at save time (18-01), so this service trusts it.
 */
@Injectable()
export class ExternalPgConnectorService {
  /** Live PrismaClient instances keyed by connectionId */
  private readonly pool = new Map<string, IExternalPgClient>();

  private readonly prismaFactory: ExternalPrismaFactory;

  constructor(
    private readonly connectionService: ExternalConnectionService,
    @Optional() @Inject(EXTERNAL_PRISMA_FACTORY) prismaFactory?: ExternalPrismaFactory
  ) {
    this.prismaFactory = prismaFactory ?? defaultPrismaFactory;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Open (or reuse a cached) connection to the external Postgres identified by
   * `connectionId`. Validates the connection with SELECT 1 on first connect.
   *
   * @throws BadRequestException if the connection cannot be established.
   */
  async connect(spaceId: string, connectionId: string): Promise<void> {
    if (this.pool.has(connectionId)) {
      return; // reuse existing connection
    }

    const dto = await this.connectionService.get(spaceId, connectionId);
    const dsn = ExternalPgConnectorService.buildDsn(dto.config);
    const client = this.prismaFactory(dsn);

    await client.$connect();

    // Validate connectivity (mirrors base-sql-executor.service.ts pattern)
    try {
      await client.$queryRawUnsafe('SELECT 1');
    } catch (err) {
      await client.$disconnect().catch(() => void 0);
      throw new BadRequestException(
        `External Postgres connection failed: ${(err as Error).message}`
      );
    }

    this.pool.set(connectionId, client);
  }

  /**
   * Execute a SELECT-only query against the external Postgres.
   * The statement is validated by assertSelectOnly() before reaching the DB.
   *
   * @throws Error if the statement is not a read-only SELECT (from statement filter).
   * @throws Error if the query fails on the DB side.
   */
  async query<T = unknown>(connectionId: string, sql: string): Promise<T> {
    // Defense-in-depth: reject any non-SELECT before it touches the wire
    assertSelectOnly(sql);

    const client = this.pool.get(connectionId);
    if (!client) {
      throw new BadRequestException(
        `No active connection for connectionId "${connectionId}". Call connect() first.`
      );
    }

    return client.$queryRawUnsafe<T>(sql);
  }

  /**
   * Disconnect and evict the client for the given connectionId.
   * Safe to call even if no connection exists (idempotent).
   */
  async dispose(connectionId: string): Promise<void> {
    const client = this.pool.get(connectionId);
    if (!client) return;
    this.pool.delete(connectionId);
    await client.$disconnect().catch(() => void 0);
  }

  /**
   * Disconnect all pooled connections (called on module destroy).
   */
  async disposeAll(): Promise<void> {
    const ids = [...this.pool.keys()];
    await Promise.all(ids.map((id) => this.dispose(id)));
  }

  // --------------------------------------------------------------------------
  // Static helpers (exposed for testing)
  // --------------------------------------------------------------------------

  /**
   * Build a postgresql:// DSN from the decrypted ExternalConnectionConfig.
   * Percent-encodes user/password to handle special characters safely.
   */
  static buildDsn(config: IExternalConnectionConfig): string {
    const host = config.host ?? 'localhost';
    const port = config.port ?? 5432;
    const database = config.database ?? 'postgres';
    const user = encodeURIComponent(config.user ?? 'postgres');
    const password = encodeURIComponent(config.password ?? '');
    const ssl = config.ssl ? '?sslmode=require' : '';

    return `postgresql://${user}:${password}@${host}:${port}/${database}${ssl}`;
  }
}
