import { OpName } from '../common';
import type { ICreateOpBuilder } from '../interface';
import type { ITableOp } from './set-table-property';
export declare class AddTableBuilder implements ICreateOpBuilder {
    name: OpName.AddTable;
    build(table: ITableOp): ITableOp;
}
