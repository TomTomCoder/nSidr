import type { IOtOperation } from '../../models';
import { OpName } from '../common';
import type { IOpBuilder } from '../interface';
export interface ITableOp {
    name?: string;
    dbTableName: string;
    description?: string;
    icon?: string;
    order: number;
    lastModifiedTime?: string;
}
export type ITablePropertyKey = keyof ITableOp;
export interface ISetTablePropertyOpContext {
    name: OpName.SetTableProperty;
    key: ITablePropertyKey;
    newValue: unknown;
    oldValue: unknown;
}
export declare class SetTablePropertyBuilder implements IOpBuilder {
    name: OpName.SetTableProperty;
    build(params: {
        key: ITablePropertyKey;
        oldValue: unknown;
        newValue: unknown;
    }): IOtOperation;
    detect(op: IOtOperation): ISetTablePropertyOpContext | null;
}
