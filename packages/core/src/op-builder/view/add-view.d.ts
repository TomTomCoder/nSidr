import type { IViewVo } from '../../models';
import { OpName } from '../common';
import type { ICreateOpBuilder } from '../interface';
export declare class AddViewBuilder implements ICreateOpBuilder {
    name: OpName.AddView;
    build(view: IViewVo): IViewVo;
}
