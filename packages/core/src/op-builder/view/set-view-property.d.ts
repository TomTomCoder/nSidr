import type { IOtOperation, IViewPropertyKeys } from '../../models';
import { OpName } from '../common';
import type { IOpBuilder } from '../interface';
export interface ISetViewPropertyOpContext {
    name: OpName.SetViewProperty;
    key: IViewPropertyKeys;
    newValue?: unknown | null;
    oldValue?: unknown | null;
}
export declare class SetViewPropertyBuilder implements IOpBuilder {
    name: OpName.SetViewProperty;
    build(params: {
        key: IViewPropertyKeys;
        newValue?: unknown | null;
        oldValue?: unknown | null;
    }): IOtOperation;
    detect(op: IOtOperation): ISetViewPropertyOpContext | null;
}
