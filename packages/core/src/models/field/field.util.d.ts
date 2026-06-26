import type { ISetFieldPropertyOpContext } from '../../op-builder/field/set-field-property';
import type { FormulaFieldCore, LinkFieldCore } from './derivate';
import type { FieldCore } from './field';
import type { IFieldVo } from './field.schema';
import type { IFieldWithExpression } from './field.type';
export declare function isFormulaField(field: FieldCore): field is FormulaFieldCore;
export declare function isLinkField(field: FieldCore): field is LinkFieldCore;
export declare function isFieldHasExpression(field: FieldCore): field is IFieldWithExpression;
/**
 * Apply field property operations to a field VO and return a new field VO.
 * This is a pure function that does not mutate the original field VO.
 *
 * @param fieldVo - The existing field VO to base the new field on
 * @param ops - Array of field property operations to apply
 * @returns A new field VO with the operations applied
 */
export declare function applyFieldPropertyOps(fieldVo: IFieldVo, ops: ISetFieldPropertyOpContext[]): IFieldVo;
