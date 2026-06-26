import type { IOtOperation } from '../../models';
import { OpName } from '../common';
import type { IOpBuilder } from '../interface';
export interface ISetRecordOpContext {
    name: OpName.SetRecord;
    fieldId: string;
    newCellValue: unknown;
    oldCellValue: unknown;
}
export declare class SetRecordBuilder implements IOpBuilder {
    name: OpName.SetRecord;
    build(params: {
        fieldId: string;
        newCellValue: unknown;
        oldCellValue: unknown;
    }): IOtOperation;
    detect(op: IOtOperation): ISetRecordOpContext | null;
}
