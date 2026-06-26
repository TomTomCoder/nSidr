import type { IFieldPropertyKey, IOtOperation } from '../../models';
import { OpName } from '../common';
import type { IOpBuilder } from '../interface';
export interface ISetFieldPropertyOpContext {
    name: OpName.SetFieldProperty;
    key: IFieldPropertyKey;
    newValue: unknown;
    oldValue: unknown;
}
export declare class SetFieldPropertyBuilder implements IOpBuilder {
    name: OpName.SetFieldProperty;
    build(params: {
        key: IFieldPropertyKey;
        oldValue: unknown;
        newValue: unknown;
    }): IOtOperation;
    detect(op: IOtOperation): ISetFieldPropertyOpContext | null;
}
