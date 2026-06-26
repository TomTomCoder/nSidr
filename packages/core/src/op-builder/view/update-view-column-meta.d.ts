import type { IOtOperation, IColumn } from '../../models';
import { OpName } from '../common';
import type { IOpBuilder } from '../interface';
export interface IUpdateViewColumnMetaOpContext {
    name: OpName.UpdateViewColumnMeta;
    fieldId: string;
    newColumnMeta?: IColumn | null;
    oldColumnMeta?: IColumn | null;
}
export declare class UpdateViewColumnMetaBuilder implements IOpBuilder {
    name: OpName.UpdateViewColumnMeta;
    build(params: {
        fieldId: string;
        newColumnMeta: IColumn | null;
        oldColumnMeta?: IColumn;
    }): IOtOperation;
    detect(op: IOtOperation): IUpdateViewColumnMetaOpContext | null;
}
