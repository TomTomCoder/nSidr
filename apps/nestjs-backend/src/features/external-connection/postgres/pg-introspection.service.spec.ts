/* eslint-disable sonarjs/no-duplicate-string */
import { vi } from 'vitest';
import { PgIntrospectionService } from './pg-introspection.service';

// ---------------------------------------------------------------------------
// Fake connector
// ---------------------------------------------------------------------------

type FakeConnector = {
  query: ReturnType<typeof vi.fn>;
};

function makeConnector(responses: unknown[][]): FakeConnector {
  let callIndex = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const resp = responses[callIndex % responses.length];
      callIndex++;
      return Promise.resolve(resp);
    }),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TABLE_ROWS = [
  { table_name: 'orders', table_schema: 'public', table_type: 'BASE TABLE' },
  { table_name: 'products', table_schema: 'public', table_type: 'BASE TABLE' },
];

const COLUMN_ROWS = [
  {
    table_name: 'orders',
    column_name: 'id',
    data_type: 'integer',
    is_nullable: 'NO',
    column_default: null,
  },
  {
    table_name: 'orders',
    column_name: 'amount',
    data_type: 'numeric',
    is_nullable: 'YES',
    column_default: null,
  },
  {
    table_name: 'products',
    column_name: 'id',
    data_type: 'integer',
    is_nullable: 'NO',
    column_default: null,
  },
  {
    table_name: 'products',
    column_name: 'name',
    data_type: 'text',
    is_nullable: 'NO',
    column_default: null,
  },
];

const PK_ROWS = [
  { table_name: 'orders', column_name: 'id' },
  { table_name: 'products', column_name: 'id' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PgIntrospectionService', () => {
  let svc: PgIntrospectionService;
  let connector: FakeConnector;

  beforeEach(() => {
    // Each introspect() call issues 3 queries: tables, columns, PKs
    connector = makeConnector([TABLE_ROWS, COLUMN_ROWS, PK_ROWS]);
    svc = new PgIntrospectionService(connector as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── introspect: basic shape ───────────────────────────────────────────────

  it('returns a list of tables with their columns', async () => {
    const result = await svc.introspect('conn-1');

    expect(result).toHaveLength(2);
    const orders = result.find((t) => t.tableName === 'orders');
    expect(orders).toBeDefined();
    expect(orders!.columns).toHaveLength(2);
  });

  it('columns include name, dataType, nullable, pk flags', async () => {
    const result = await svc.introspect('conn-1');

    const orders = result.find((t) => t.tableName === 'orders')!;
    const idCol = orders.columns.find((c) => c.columnName === 'id')!;

    expect(idCol.dataType).toBe('integer');
    expect(idCol.isNullable).toBe(false);
    expect(idCol.isPrimaryKey).toBe(true);

    const amountCol = orders.columns.find((c) => c.columnName === 'amount')!;
    expect(amountCol.isNullable).toBe(true);
    expect(amountCol.isPrimaryKey).toBe(false);
  });

  // ── caching ───────────────────────────────────────────────────────────────

  it('a second call within TTL hits cache (no re-query)', async () => {
    await svc.introspect('conn-1');
    const queryCallsAfterFirst = connector.query.mock.calls.length;

    await svc.introspect('conn-1');
    // No additional queries after the first batch
    expect(connector.query.mock.calls.length).toBe(queryCallsAfterFirst);
  });

  it('a call for a different connectionId is NOT served from another conn cache', async () => {
    // Reset connector to handle 2 separate introspect cycles
    const multiConnector = makeConnector([TABLE_ROWS, COLUMN_ROWS, PK_ROWS]);
    const multiSvc = new PgIntrospectionService(multiConnector as never);

    await multiSvc.introspect('conn-1');
    const callsAfterFirst = multiConnector.query.mock.calls.length;

    await multiSvc.introspect('conn-2');
    // Should issue fresh queries for conn-2
    expect(multiConnector.query.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  // ── invalidate ────────────────────────────────────────────────────────────

  it('invalidate() forces a refresh on next introspect()', async () => {
    // First introspect
    await svc.introspect('conn-1');
    const callsAfterFirst = connector.query.mock.calls.length;

    svc.invalidate('conn-1');

    // Second introspect after invalidate must re-query
    await svc.introspect('conn-1');
    expect(connector.query.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  // ── SELECT-only introspection queries ─────────────────────────────────────

  it('introspection queries all start with SELECT (go through read-only path)', async () => {
    await svc.introspect('conn-1');

    for (const call of connector.query.mock.calls) {
      const sql: string = call[1] as string;
      expect(sql.trim().toUpperCase()).toMatch(/^SELECT/);
    }
  });
});
