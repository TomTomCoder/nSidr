import type { ITableVo } from '@teable/openapi';
import type { Doc } from 'sharedb/lib/client';
import { Table } from './table';

// PERF: replaced class-transformer's plainToInstance with prototype-stamping.
// Table has no @Type/@Transform decorators — same reasoning as
// record/factory.ts and field/factory.ts.
export function createTableInstance(tableSnapshot: ITableVo, doc?: Doc<ITableVo>) {
  const instance = Object.assign(Object.create(Table.prototype) as Table, tableSnapshot);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const temp: any = instance;
  temp.doc = doc;
  temp.baseId = doc?.collection.split('_')[1];
  return instance;
}
