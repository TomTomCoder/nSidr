import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import type { ExternalPgConnectorService } from '../postgres/external-pg-connector.service';
import type { PgIntrospectionService } from '../postgres/pg-introspection.service';

export const VIRTUAL_TABLE_INTROSPECTION = Symbol('VIRTUAL_TABLE_INTROSPECTION');
export const VIRTUAL_TABLE_CONNECTOR = Symbol('VIRTUAL_TABLE_CONNECTOR');
import { buildVirtualTable } from './virtual-table-mapper';
import type { IVirtualTable } from './virtual-table-mapper';

/** Maximum number of rows that can be requested per page (DoS guard, T-18-05-D). */
const MAX_PAGE_SIZE = 100;

/**
 * VirtualTableService
 *
 * Provides federated READ-ONLY access to external Postgres tables.
 * Tables are never imported into Teable; no rows are persisted.
 *
 * Security:
 *  - Table/schema names are validated against the introspected schema (T-18-05-E).
 *  - All queries go through ExternalPgConnectorService which enforces assertSelectOnly().
 *  - Mandatory LIMIT/OFFSET pagination (T-18-05-D).
 *  - No write surface: service exposes list + getRows only (T-18-05-T).
 */
@Injectable()
export class VirtualTableService {
  private readonly introspection: Pick<PgIntrospectionService, 'introspect'>;
  private readonly connector: Pick<ExternalPgConnectorService, 'connect' | 'query'>;

  constructor(
    @Optional()
    @Inject(VIRTUAL_TABLE_INTROSPECTION)
    introspection?: Pick<PgIntrospectionService, 'introspect'>,
    @Optional()
    @Inject(VIRTUAL_TABLE_CONNECTOR)
    connector?: Pick<ExternalPgConnectorService, 'connect' | 'query'>
  ) {
    this.introspection = introspection as Pick<PgIntrospectionService, 'introspect'>;
    this.connector = connector as Pick<ExternalPgConnectorService, 'connect' | 'query'>;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Return virtual table descriptors for all introspected tables in the
   * external Postgres identified by connectionId.
   */
  async listVirtualTables(connectionId: string): Promise<IVirtualTable[]> {
    const tables = await this.introspection.introspect(connectionId);
    return tables.map((t) => buildVirtualTable(connectionId, t));
  }

  /**
   * Fetch a page of rows from an external table via query-through.
   *
   * The table/schema pair is validated against the introspected schema to
   * prevent identifier injection (T-18-05-E). The SELECT goes through
   * ExternalPgConnectorService which enforces assertSelectOnly().
   *
   * @param spaceId   - Teable space owning the connection (for permission check at connect)
   * @param connectionId - External connection ID
   * @param schema    - Postgres schema name (e.g. 'public')
   * @param tableName - Postgres table name
   * @param page      - 1-based page number
   * @param pageSize  - Number of rows per page (1 - MAX_PAGE_SIZE)
   */
  async getRows(
    spaceId: string,
    connectionId: string,
    schema: string,
    tableName: string,
    page: number,
    pageSize: number
  ): Promise<Record<string, unknown>[]> {
    // Validate pagination params first (fast, no DB call)
    if (page < 1) {
      throw new BadRequestException(`page must be >= 1, got ${page}`);
    }
    if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `pageSize must be between 1 and ${MAX_PAGE_SIZE}, got ${pageSize}`
      );
    }

    // Validate table/schema against introspected schema (T-18-05-E)
    const tables = await this.introspection.introspect(connectionId);
    const tableDesc = tables.find((t) => t.tableName === tableName && t.tableSchema === schema);
    if (!tableDesc) {
      throw new BadRequestException(
        `Table "${schema}"."${tableName}" not found in connection "${connectionId}"`
      );
    }

    // Ensure an active connection exists (idempotent if already connected)
    await this.connector.connect(spaceId, connectionId);

    // Build safe, quoted identifier SELECT with LIMIT/OFFSET
    // Identifiers are validated above; quote them defensively
    const offset = (page - 1) * pageSize;
    const quotedSchema = VirtualTableService.quoteIdent(schema);
    const quotedTable = VirtualTableService.quoteIdent(tableName);
    const sql = `SELECT * FROM ${quotedSchema}.${quotedTable} LIMIT ${pageSize} OFFSET ${offset}`;

    return this.connector.query<Record<string, unknown>[]>(connectionId, sql);
  }

  // --------------------------------------------------------------------------
  // Static helpers
  // --------------------------------------------------------------------------

  /**
   * Quote a Postgres identifier by wrapping in double-quotes and escaping
   * any embedded double-quotes (SQL standard).
   * Input is already validated against the introspected schema, so this is
   * purely defense-in-depth.
   */
  static quoteIdent(ident: string): string {
    return `"${ident.replace(/"/g, '""')}"`;
  }
}
