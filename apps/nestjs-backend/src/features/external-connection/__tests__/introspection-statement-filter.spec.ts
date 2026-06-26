/**
 * introspection-statement-filter.spec.ts
 *
 * Cross-cutting assertions combining PgIntrospectionService with the
 * SELECT-only statement filter (assertSelectOnly).
 *
 * Plan task (c): introspection lists tables and the statement filter
 * rejects non-SELECT/multi-statement.
 */
import { PgIntrospectionService } from '../postgres/pg-introspection.service';
import { assertSelectOnly } from '../postgres/statement-filter';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TABLE_ROWS = [
  { table_name: 'customers', table_schema: 'public', table_type: 'BASE TABLE' },
  { table_name: 'orders', table_schema: 'public', table_type: 'BASE TABLE' },
];

const COLUMN_ROWS = [
  {
    table_name: 'customers',
    column_name: 'id',
    data_type: 'integer',
    is_nullable: 'NO',
    column_default: null,
  },
  {
    table_name: 'customers',
    column_name: 'email',
    data_type: 'text',
    is_nullable: 'NO',
    column_default: null,
  },
  {
    table_name: 'orders',
    column_name: 'id',
    data_type: 'integer',
    is_nullable: 'NO',
    column_default: null,
  },
  {
    table_name: 'orders',
    column_name: 'total',
    data_type: 'numeric',
    is_nullable: 'YES',
    column_default: null,
  },
];

const PK_ROWS = [
  { table_name: 'customers', column_name: 'id' },
  { table_name: 'orders', column_name: 'id' },
];

// ---------------------------------------------------------------------------
// Fake connector — cycles through pre-set responses
// ---------------------------------------------------------------------------

function makeConnector(responses: unknown[][]): { query: ReturnType<typeof vi.fn> } {
  let i = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const r = responses[i % responses.length];
      i++;
      return Promise.resolve(r);
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PgIntrospectionService — cross-cutting with statement filter', () => {
  describe('introspection lists tables and columns correctly', () => {
    it('returns all user tables from the external schema', async () => {
      const connector = makeConnector([TABLE_ROWS, COLUMN_ROWS, PK_ROWS]);
      const svc = new PgIntrospectionService(connector as never);

      const tables = await svc.introspect('conn-ext-1');
      expect(tables.map((t) => t.tableName).sort()).toEqual(['customers', 'orders']);
    });

    it('populates columns with dataType, nullable, and PK flags', async () => {
      const connector = makeConnector([TABLE_ROWS, COLUMN_ROWS, PK_ROWS]);
      const svc = new PgIntrospectionService(connector as never);

      const tables = await svc.introspect('conn-ext-1');
      const customers = tables.find((t) => t.tableName === 'customers')!;

      const idCol = customers.columns.find((c) => c.columnName === 'id')!;
      expect(idCol.dataType).toBe('integer');
      expect(idCol.isNullable).toBe(false);
      expect(idCol.isPrimaryKey).toBe(true);

      const emailCol = customers.columns.find((c) => c.columnName === 'email')!;
      expect(emailCol.isNullable).toBe(false);
      expect(emailCol.isPrimaryKey).toBe(false);
    });

    it('every SQL query issued by introspect() is a valid SELECT (passes statement filter)', async () => {
      const connector = makeConnector([TABLE_ROWS, COLUMN_ROWS, PK_ROWS]);
      const svc = new PgIntrospectionService(connector as never);

      await svc.introspect('conn-ext-1');

      for (const call of connector.query.mock.calls) {
        const sql: string = call[1] as string;
        // assertSelectOnly must not throw — all introspection queries are SELECT-only
        expect(() => assertSelectOnly(sql.trim())).not.toThrow();
      }
    });

    it('returns an empty list when the external schema has no user tables', async () => {
      const connector = makeConnector([[], [], []]);
      const svc = new PgIntrospectionService(connector as never);

      const tables = await svc.introspect('conn-empty');
      expect(tables).toEqual([]);
    });
  });

  describe('statement filter integration — read-only enforcement', () => {
    it('passes a SELECT used as the introspection query pattern', () => {
      const introspectionQuery = `SELECT table_name, table_schema, table_type
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
         AND table_type = 'BASE TABLE'
       ORDER BY table_schema, table_name`;

      expect(() => assertSelectOnly(introspectionQuery)).not.toThrow();
    });

    it('passes a JOIN SELECT used for key_column_usage query', () => {
      const pkQuery = `SELECT kcu.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema    = kcu.table_schema
        AND tc.table_name      = kcu.table_name
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY kcu.table_name, kcu.ordinal_position`;

      expect(() => assertSelectOnly(pkQuery)).not.toThrow();
    });

    it.each([
      ['INSERT INTO customers VALUES (1)', 'INSERT'],
      ['UPDATE orders SET total=0', 'UPDATE'],
      ['DELETE FROM customers', 'DELETE'],
      ['DROP TABLE customers', 'DROP'],
      ['ALTER TABLE customers ADD col text', 'ALTER'],
      ['CREATE TABLE foo (id int)', 'CREATE'],
      ['TRUNCATE customers', 'TRUNCATE'],
    ])('rejects %s (first keyword: %s)', (sql) => {
      expect(() => assertSelectOnly(sql)).toThrow(/read-only/i);
    });

    it('rejects multi-statement SELECT followed by INSERT', () => {
      expect(() =>
        assertSelectOnly("SELECT id FROM customers; INSERT INTO customers VALUES (99)")
      ).toThrow(/read-only|multi-statement/i);
    });

    it('rejects a CTE ending in INSERT (write CTE)', () => {
      expect(() =>
        assertSelectOnly('WITH x AS (SELECT id FROM customers) INSERT INTO orders SELECT id, 0 FROM x')
      ).toThrow(/read-only/i);
    });

    it('passes a read-only CTE with SELECT terminal', () => {
      expect(() =>
        assertSelectOnly('WITH top5 AS (SELECT id, total FROM orders ORDER BY total DESC LIMIT 5) SELECT * FROM top5')
      ).not.toThrow();
    });
  });

  describe('cache + invalidation cross-cutting', () => {
    it('cache hit skips re-querying (avoids statement-filter double-check overhead)', async () => {
      const connector = makeConnector([TABLE_ROWS, COLUMN_ROWS, PK_ROWS]);
      const svc = new PgIntrospectionService(connector as never);

      await svc.introspect('conn-cache');
      const callsAfterFirst = connector.query.mock.calls.length;

      // Second call — should be cached
      await svc.introspect('conn-cache');
      expect(connector.query.mock.calls.length).toBe(callsAfterFirst);
    });

    it('invalidate + re-introspect issues fresh queries (all SELECT)', async () => {
      const connector = makeConnector([TABLE_ROWS, COLUMN_ROWS, PK_ROWS]);
      const svc = new PgIntrospectionService(connector as never);

      await svc.introspect('conn-inv');
      const callsAfterFirst = connector.query.mock.calls.length;

      svc.invalidate('conn-inv');

      await svc.introspect('conn-inv');
      expect(connector.query.mock.calls.length).toBeGreaterThan(callsAfterFirst);

      // All fresh queries are still SELECT-only
      for (const call of connector.query.mock.calls.slice(callsAfterFirst)) {
        const sql: string = call[1] as string;
        expect(() => assertSelectOnly(sql.trim())).not.toThrow();
      }
    });
  });
});
