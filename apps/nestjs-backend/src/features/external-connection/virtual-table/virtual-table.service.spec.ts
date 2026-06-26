import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IExternalTable } from '../postgres/pg-introspection.service';
import type { IVirtualTable } from './virtual-table-mapper';
import { VirtualTableService } from './virtual-table.service';

// ---------------------------------------------------------------------------
// Fakes / stubs
// ---------------------------------------------------------------------------

function makeIntrospectStub(tables: IExternalTable[]) {
  return { introspect: vi.fn().mockResolvedValue(tables) };
}

function makeConnectorStub(rows: Record<string, unknown>[] = []) {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(rows),
  };
}

const ORDERS_TABLE: IExternalTable = {
  tableName: 'orders',
  tableSchema: 'public',
  columns: [
    {
      columnName: 'id',
      dataType: 'integer',
      isNullable: false,
      isPrimaryKey: true,
      columnDefault: null,
    },
    {
      columnName: 'customer',
      dataType: 'text',
      isNullable: true,
      isPrimaryKey: false,
      columnDefault: null,
    },
    {
      columnName: 'total',
      dataType: 'numeric',
      isNullable: true,
      isPrimaryKey: false,
      columnDefault: null,
    },
  ],
};

const USERS_TABLE: IExternalTable = {
  tableName: 'users',
  tableSchema: 'public',
  columns: [
    {
      columnName: 'id',
      dataType: 'integer',
      isNullable: false,
      isPrimaryKey: true,
      columnDefault: null,
    },
    {
      columnName: 'name',
      dataType: 'text',
      isNullable: false,
      isPrimaryKey: false,
      columnDefault: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// listVirtualTables
// ---------------------------------------------------------------------------

describe('VirtualTableService.listVirtualTables', () => {
  it('returns virtual table descriptors for all introspected tables', async () => {
    const introspection = makeIntrospectStub([ORDERS_TABLE, USERS_TABLE]);
    const connector = makeConnectorStub();
    const svc = new VirtualTableService(introspection as any, connector as any);

    const result: IVirtualTable[] = await svc.listVirtualTables('conn-1');

    expect(introspection.introspect).toHaveBeenCalledWith('conn-1');
    expect(result).toHaveLength(2);
    expect(result[0].tableName).toBe('orders');
    expect(result[0].readOnly).toBe(true);
    expect(result[1].tableName).toBe('users');
  });

  it('returns empty array when no tables exist', async () => {
    const introspection = makeIntrospectStub([]);
    const connector = makeConnectorStub();
    const svc = new VirtualTableService(introspection as any, connector as any);

    const result = await svc.listVirtualTables('conn-1');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getRows
// ---------------------------------------------------------------------------

describe('VirtualTableService.getRows', () => {
  let svc: VirtualTableService;
  let introspection: ReturnType<typeof makeIntrospectStub>;
  let connector: ReturnType<typeof makeConnectorStub>;

  beforeEach(() => {
    introspection = makeIntrospectStub([ORDERS_TABLE]);
    connector = makeConnectorStub([
      { id: 1, customer: 'Alice', total: '99.99' },
      { id: 2, customer: 'Bob', total: '42.00' },
    ]);
    svc = new VirtualTableService(introspection as any, connector as any);
  });

  it('issues a parameterized SELECT with LIMIT/OFFSET through the connector', async () => {
    const rows = await svc.getRows('space-1', 'conn-1', 'public', 'orders', 1, 20);

    expect(connector.connect).toHaveBeenCalledWith('space-1', 'conn-1');
    expect(connector.query).toHaveBeenCalledTimes(1);

    const sql: string = connector.query.mock.calls[0][1];
    expect(sql).toMatch(/SELECT/i);
    expect(sql).toMatch(/LIMIT/i);
    expect(sql).toMatch(/OFFSET/i);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 1, customer: 'Alice' });
  });

  it('calculates offset from page and pageSize correctly', async () => {
    await svc.getRows('space-1', 'conn-1', 'public', 'orders', 3, 10);

    const sql: string = connector.query.mock.calls[0][1];
    // page 3, pageSize 10 => OFFSET 20
    expect(sql).toMatch(/OFFSET\s+20/i);
    expect(sql).toMatch(/LIMIT\s+10/i);
  });

  it('rejects an unknown table name (not in introspected schema)', async () => {
    await expect(
      svc.getRows('space-1', 'conn-1', 'public', 'evil_table', 1, 20)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow schema not in introspection', async () => {
    await expect(
      svc.getRows('space-1', 'conn-1', 'evil_schema', 'orders', 1, 20)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces a minimum pageSize of 1', async () => {
    await expect(svc.getRows('space-1', 'conn-1', 'public', 'orders', 1, 0)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('enforces a maximum pageSize (100)', async () => {
    await expect(
      svc.getRows('space-1', 'conn-1', 'public', 'orders', 1, 101)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects page < 1', async () => {
    await expect(
      svc.getRows('space-1', 'conn-1', 'public', 'orders', 0, 20)
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
