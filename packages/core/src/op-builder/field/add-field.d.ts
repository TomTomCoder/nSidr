import type { IFieldVo } from '../../models';
import { OpName } from '../common';
import type { ICreateOpBuilder } from '../interface';
export declare class AddFieldBuilder implements ICreateOpBuilder {
    name: OpName.AddField;
    build(field: IFieldVo): IFieldVo;
}
