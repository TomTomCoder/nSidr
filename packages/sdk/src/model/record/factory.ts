import type { IRecord } from '@teable/core';
import type { Doc } from 'sharedb/lib/client';
import type { IFieldInstance } from '../field';
import { Record } from './record';

// PERF: class-transformer's plainToInstance is reflection-heavy
// (~O(props) per call with metadata walks). The Record class has zero
// @Type/@Transform/@Expose decorators, so plainToInstance was paying
// reflection cost for transformations that don't exist. On a table
// switch with N records, this was the bulk of the 8-second main-thread
// freeze. Prototype-stamping is identical in observable behavior
// (instanceof Record still passes, all instance methods still resolve
// via the prototype chain) and runs ~50–100× faster.
export function createRecordInstance(record: IRecord, doc?: Doc<IRecord>) {
  const instance = Object.assign(Object.create(Record.prototype) as Record, record);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (instance as any).doc = doc;
  return instance;
}

export function recordInstanceFieldMap(
  instance: Record,
  fieldMap: { [fieldId: string]: IFieldInstance }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const temp: any = instance;
  temp.fieldMap = fieldMap;
  return instance;
}
