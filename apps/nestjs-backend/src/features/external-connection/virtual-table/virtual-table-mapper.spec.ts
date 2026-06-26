import { describe, expect, it } from 'vitest';
import type { IExternalColumn } from '../postgres/pg-introspection.service';
import type { IVirtualTable } from './virtual-table-mapper';
import { buildVirtualTable, mapColumn } from './virtual-table-mapper';

// ---------------------------------------------------------------------------
// mapColumn tests
// ---------------------------------------------------------------------------

describe('mapColumn', () => {
  const col = (dataType: string): IExternalColumn => ({
    columnName: 'col',
    dataType,
    isNullable: true,
    isPrimaryKey: false,
    columnDefault: null,
  });

  it('maps text to singleLineText', () => {
    expect(mapColumn(col('text')).fieldType).toBe('singleLineText');
  });

  it('maps character varying (varchar) to singleLineText', () => {
    expect(mapColumn(col('character varying')).fieldType).toBe('singleLineText');
  });

  it('maps varchar to singleLineText', () => {
    expect(mapColumn(col('varchar')).fieldType).toBe('singleLineText');
  });

  it('maps character to singleLineText', () => {
    expect(mapColumn(col('character')).fieldType).toBe('singleLineText');
  });

  it('maps integer to number', () => {
    expect(mapColumn(col('integer')).fieldType).toBe('number');
  });

  it('maps int to number', () => {
    expect(mapColumn(col('int')).fieldType).toBe('number');
  });

  it('maps bigint to number', () => {
    expect(mapColumn(col('bigint')).fieldType).toBe('number');
  });

  it('maps smallint to number', () => {
    expect(mapColumn(col('smallint')).fieldType).toBe('number');
  });

  it('maps numeric to number', () => {
    expect(mapColumn(col('numeric')).fieldType).toBe('number');
  });

  it('maps decimal to number', () => {
    expect(mapColumn(col('decimal')).fieldType).toBe('number');
  });

  it('maps real to number', () => {
    expect(mapColumn(col('real')).fieldType).toBe('number');
  });

  it('maps double precision to number', () => {
    expect(mapColumn(col('double precision')).fieldType).toBe('number');
  });

  it('maps boolean to checkbox', () => {
    expect(mapColumn(col('boolean')).fieldType).toBe('checkbox');
  });

  it('maps bool to checkbox', () => {
    expect(mapColumn(col('bool')).fieldType).toBe('checkbox');
  });

  it('maps timestamp to date', () => {
    expect(mapColumn(col('timestamp')).fieldType).toBe('date');
  });

  it('maps timestamp without time zone to date', () => {
    expect(mapColumn(col('timestamp without time zone')).fieldType).toBe('date');
  });

  it('maps timestamp with time zone to date', () => {
    expect(mapColumn(col('timestamp with time zone')).fieldType).toBe('date');
  });

  it('maps timestamptz to date', () => {
    expect(mapColumn(col('timestamptz')).fieldType).toBe('date');
  });

  it('maps date to date', () => {
    expect(mapColumn(col('date')).fieldType).toBe('date');
  });

  it('maps json to longText', () => {
    expect(mapColumn(col('json')).fieldType).toBe('longText');
  });

  it('maps jsonb to longText', () => {
    expect(mapColumn(col('jsonb')).fieldType).toBe('longText');
  });

  it('maps unknown type to singleLineText fallback', () => {
    expect(mapColumn(col('uuid')).fieldType).toBe('singleLineText');
  });

  it('maps geometry (unknown) to singleLineText fallback', () => {
    expect(mapColumn(col('geometry')).fieldType).toBe('singleLineText');
  });

  it('preserves column metadata in the mapped shape', () => {
    const source: IExternalColumn = {
      columnName: 'my_col',
      dataType: 'integer',
      isNullable: false,
      isPrimaryKey: true,
      columnDefault: '42',
    };
    const result = mapColumn(source);
    expect(result.columnName).toBe('my_col');
    expect(result.isPrimaryKey).toBe(true);
    expect(result.isNullable).toBe(false);
    expect(result.fieldType).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// buildVirtualTable tests
// ---------------------------------------------------------------------------

describe('buildVirtualTable', () => {
  it('builds a virtual table descriptor with mapped columns', () => {
    const table: IVirtualTable = buildVirtualTable('conn-1', {
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
      ],
    });

    expect(table.connectionId).toBe('conn-1');
    expect(table.tableName).toBe('orders');
    expect(table.tableSchema).toBe('public');
    expect(table.columns).toHaveLength(2);
    expect(table.columns[0].fieldType).toBe('number');
    expect(table.columns[1].fieldType).toBe('singleLineText');
    expect(table.readOnly).toBe(true);
  });
});
