import { CellValueType, FieldType } from '../../field/constant';
import type { IOperator } from './operator';
type FieldShape = {
    cellValueType: CellValueType;
    type: FieldType;
    isMultipleCellValue?: boolean;
};
export type FieldReferenceComparisonKind = 'user' | 'link' | 'attachment' | 'number' | 'boolean' | 'dateTime' | 'string';
export declare function getFieldReferenceComparisonKind(field: FieldShape): FieldReferenceComparisonKind;
export declare function isFieldReferenceComparable(field: FieldShape, reference: FieldShape): boolean;
export declare function getFieldReferenceSupportedOperators(field: FieldShape): IOperator[];
export declare function isFieldReferenceOperatorSupported(field: FieldShape, operator?: IOperator | null): boolean;
export {};
