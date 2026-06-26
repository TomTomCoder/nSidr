import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ExternalPgConnectorService } from './external-pg-connector.service';

/** Injection tokens for PgIntrospectionService dependencies */
export const PG_INTROSPECTION_CONNECTOR = Symbol('PG_INTROSPECTION_CONNECTOR');
export const PG_INTROSPECTION_TTL_MS = Symbol('PG_INTROSPECTION_TTL_MS');

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export interface IExternalColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  columnDefault: string | null;
}

export interface IExternalTable {
  tableName: string;
  tableSchema: string;
  columns: IExternalColumn[];
}

// ---------------------------------------------------------------------------
// Cache entry
// ---------------------------------------------------------------------------

interface ICacheEntry {
  tables: IExternalTable[];
  expiresAt: number;
}

/**
 * Default TTL for cached introspection results: 5 minutes.
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Row types from information_schema queries
// ---------------------------------------------------------------------------

interface ITableRow {
  table_name: string;
  table_schema: string;
  table_type: string;
}

interface IColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IPkRow {
  table_name: string;
  column_name: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * PgIntrospectionService
 *
 * Queries information_schema.tables / .columns and pg_constraint to build a
 * normalized schema map for an external Postgres connection.
 *
 * All queries go through ExternalPgConnectorService.query(), which enforces
 * the SELECT-only statement filter (T-18-04-E).
 *
 * Results are cached per connectionId with a configurable TTL. Call
 * invalidate(connectionId) to force a refresh.
 */
@Injectable()
export class PgIntrospectionService {
  private readonly cache = new Map<string, ICacheEntry>();

  private readonly connector: Pick<ExternalPgConnectorService, 'query'>;
  private readonly ttlMs: number;

  constructor(
    @Optional()
    @Inject(PG_INTROSPECTION_CONNECTOR)
    connector?: Pick<ExternalPgConnectorService, 'query'>,
    @Optional() @Inject(PG_INTROSPECTION_TTL_MS) ttlMs?: number
  ) {
    // connector is required in prod; tests may omit it and pass a fake via provide
    this.connector = connector as Pick<ExternalPgConnectorService, 'query'>;
    this.ttlMs = ttlMs ?? DEFAULT_TTL_MS;
  }

  /**
   * Return the schema map for the given connection. Results are cached for
   * `ttlMs` milliseconds and served from cache on subsequent calls.
   */
  async introspect(connectionId: string): Promise<IExternalTable[]> {
    const cached = this.cache.get(connectionId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.tables;
    }

    const tables = await this.fetchSchema(connectionId);
    this.cache.set(connectionId, { tables, expiresAt: Date.now() + this.ttlMs });
    return tables;
  }

  /**
   * Evict the cached schema for the given connection so the next introspect()
   * call fetches fresh data.
   */
  invalidate(connectionId: string): void {
    this.cache.delete(connectionId);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async fetchSchema(connectionId: string): Promise<IExternalTable[]> {
    // Query 1: list user tables (exclude system schemas)
    const tableRows = await this.connector.query<ITableRow[]>(
      connectionId,
      `SELECT table_name, table_schema, table_type
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
         AND table_type = 'BASE TABLE'
       ORDER BY table_schema, table_name`
    );

    if (!tableRows || tableRows.length === 0) {
      return [];
    }

    // Query 2: fetch all columns for those tables
    const columnRows = await this.connector.query<IColumnRow[]>(
      connectionId,
      `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_name, ordinal_position`
    );

    // Query 3: fetch primary key columns via information_schema (SELECT-only)
    const pkRows = await this.connector.query<IPkRow[]>(
      connectionId,
      `SELECT kcu.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema    = kcu.table_schema
        AND tc.table_name      = kcu.table_name
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY kcu.table_name, kcu.ordinal_position`
    );

    return this.buildSchema(tableRows, columnRows ?? [], pkRows ?? []);
  }

  private buildSchema(
    tableRows: ITableRow[],
    columnRows: IColumnRow[],
    pkRows: IPkRow[]
  ): IExternalTable[] {
    // Build a set of "tableName:columnName" for O(1) PK lookup
    const pkSet = new Set<string>(pkRows.map((r) => `${r.table_name}:${r.column_name}`));

    // Group columns by table name
    const columnsByTable = new Map<string, IExternalColumn[]>();
    for (const col of columnRows) {
      const existing = columnsByTable.get(col.table_name) ?? [];
      existing.push({
        columnName: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        isPrimaryKey: pkSet.has(`${col.table_name}:${col.column_name}`),
        columnDefault: col.column_default ?? null,
      });
      columnsByTable.set(col.table_name, existing);
    }

    return tableRows.map((t) => ({
      tableName: t.table_name,
      tableSchema: t.table_schema,
      columns: columnsByTable.get(t.table_name) ?? [],
    }));
  }
}
