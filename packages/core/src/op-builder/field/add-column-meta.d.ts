import type { IOtOperation } from '../../models';
import { OpName } from '../common';
import type { IOpBuilder } from '../interface';
export interface IAddColumnMetaOpContext {
    name: OpName.AddColumnMeta;
    viewId: string;
    newMetaValue: {
        [key: string]: unknown;
    };
    oldMetaValue?: {
        [key: string]: unknown;
    };
}
export declare class AddColumnMetaBuilder implements IOpBuilder {
    name: OpName.AddColumnMeta;
    build(params: {
        viewId: string;
        newMetaValue: {
            [key: string]: unknown;
        };
        oldMetaValue?: {
            [key: string]: unknown;
        };
    }): IOtOperation;
    detect(op: IOtOperation): IAddColumnMetaOpContext | null;
}
