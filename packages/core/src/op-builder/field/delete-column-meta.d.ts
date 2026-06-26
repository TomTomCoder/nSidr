import type { IColumn, IOtOperation } from '../../models';
import { OpName } from '../common';
import type { IOpBuilder } from '../interface';
export interface IDeleteColumnMetaOpContext {
    name: OpName.DeleteColumnMeta;
    viewId: string;
    oldMetaValue: IColumn;
}
export declare class DeleteColumnMetaBuilder implements IOpBuilder {
    name: OpName.DeleteColumnMeta;
    build(params: {
        viewId: string;
        oldMetaValue: IColumn;
    }): IOtOperation;
    detect(op: IOtOperation): IDeleteColumnMetaOpContext | null;
}
