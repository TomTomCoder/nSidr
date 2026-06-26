import { FieldType, ViewType } from '@teable/core';
import { describe, expect, it, vi } from 'vitest';
import { SCHEMA_TOOLS, executeSchemaTool, type ISchemaToolServices } from './schema-agent-tools';

const BASE_ID = 'bse123';

function makeServices(overrides: Partial<ISchemaToolServices> = {}): ISchemaToolServices {
  return {
    tableService: {
      createTable: vi.fn().mockResolvedValue({
        id: 'tbl1',
        name: 'Companies',
        defaultViewId: 'viwGrid',
        fields: [{ id: 'fld1', name: 'Name', type: FieldType.SingleLineText }],
      }),
    } as never,
    fieldService: {
      createField: vi.fn().mockResolvedValue({ id: 'fld2' }),
    } as never,
    viewService: {
      createView: vi.fn().mockResolvedValue({ id: 'viw2' }),
    } as never,
    appBuilderService: {
      createApp: vi.fn().mockResolvedValue({ id: 'app1', name: 'CRM', baseId: BASE_ID }),
    } as never,
    ...overrides,
  };
}

describe('SCHEMA_TOOLS definitions', () => {
  it('exposes the four schema-authoring tools', () => {
    const names = SCHEMA_TOOLS.map((t) => t.function.name);
    expect(names).toEqual(
      expect.arrayContaining(['create_table', 'create_field', 'create_view', 'create_app'])
    );
  });
});

describe('executeSchemaTool', () => {
  it('create_table defaults fields/views and scopes to baseId', async () => {
    const services = makeServices();
    const res: any = await executeSchemaTool(
      'create_table',
      { name: 'Companies' },
      BASE_ID,
      services
    );
    expect(res.success).toBe(true);
    expect(res.tableId).toBe('tbl1');
    const [baseId, ro] = (services.tableService.createTable as any).mock.calls[0];
    expect(baseId).toBe(BASE_ID);
    expect(ro.fields).toHaveLength(1); // default "Name" field
    expect(ro.views[0].type).toBe(ViewType.Grid);
  });

  it('create_field forwards link options', async () => {
    const services = makeServices();
    const res: any = await executeSchemaTool(
      'create_field',
      {
        tableId: 'tbl1',
        name: 'Contacts',
        type: FieldType.Link,
        options: { relationship: 'oneMany', foreignTableId: 'tbl2' },
      },
      BASE_ID,
      services
    );
    expect(res.success).toBe(true);
    const [tableId, ro] = (services.fieldService.createField as any).mock.calls[0];
    expect(tableId).toBe('tbl1');
    expect(ro.options.foreignTableId).toBe('tbl2');
  });

  it('create_app returns a builder URL', async () => {
    const services = makeServices();
    const res: any = await executeSchemaTool('create_app', { name: 'CRM' }, BASE_ID, services);
    expect(res.success).toBe(true);
    expect(res.appId).toBe('app1');
    expect(res.builderUrl).toContain('app1');
  });

  it('returns a structured error instead of throwing', async () => {
    const services = makeServices({
      tableService: {
        createTable: vi.fn().mockRejectedValue(new Error('boom')),
      } as never,
    });
    const res: any = await executeSchemaTool('create_table', { name: 'X' }, BASE_ID, services);
    expect(res.error).toBe('boom');
  });

  it('rejects unknown tool names', async () => {
    const res: any = await executeSchemaTool('nope', {}, BASE_ID, makeServices());
    expect(res.error).toContain('Unknown schema tool');
  });
});
