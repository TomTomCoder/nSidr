import type { IRecord } from '../../models';
import { OpName } from '../common';
import type { ICreateOpBuilder } from '../interface';
export declare class AddRecordBuilder implements ICreateOpBuilder {
    name: OpName.AddRecord;
    build(record: IRecord): IRecord;
}
