import { z } from 'zod';
import type { CellValueType, FieldType } from '../../field/constant';
import type { IConjunction } from './conjunction';
import { type IFilterItem } from './filter-item';
export declare const baseFilterSetSchema: z.ZodObject<{
    conjunction: z.ZodUnion<readonly [z.ZodLiteral<"and">, z.ZodLiteral<"or">]>;
}, z.core.$strip>;
export type IFilterSet = z.infer<typeof baseFilterSetSchema> & {
    filterSet: (IFilterItem | IFilterSet)[];
};
export declare const nestedFilterItemSchema: z.ZodType<IFilterSet>;
export declare const FILTER_DESCRIPTION = "A filter object for complex query conditions based on fields, operators, and values. Use our visual query builder at https://app.teable.ai/developer/tool/query-builder to build filters.";
export declare const filterSchema: z.ZodNullable<z.ZodType<IFilterSet, unknown, z.core.$ZodTypeInternals<IFilterSet, unknown>>>;
export type IFilter = z.infer<typeof filterSchema>;
export declare const filterRoSchema: z.ZodObject<{
    filter: z.ZodNullable<z.ZodType<IFilterSet, unknown, z.core.$ZodTypeInternals<IFilterSet, unknown>>>;
}, z.core.$strip>;
export type IFilterRo = z.infer<typeof filterRoSchema>;
export declare const filterStringSchema: z.ZodPipe<z.ZodString, z.ZodTransform<IFilterSet | null, string>>;
export declare function mergeWithDefaultFilter(defaultViewFilter?: string | null, queryFilter?: IFilter): IFilter | undefined;
export declare const mergeFilter: (filter1?: IFilter, filter2?: IFilter, conjunction?: IConjunction) => IFilterSet | null | undefined;
export declare const extractFieldIdsFromFilter: (filter?: IFilter, includeValueFieldIds?: boolean) => string[];
export interface IFilterValidationError {
    code: 'FIELD_NOT_FOUND' | 'OPERATOR_NOT_ALLOWED' | 'MODE_NOT_ALLOWED' | 'VALUE_SHAPE_INVALID';
    path: number[];
    fieldId: string;
    operator: string;
    mode?: string;
    message: string;
}
export interface IFilterValidationFieldMeta {
    type: FieldType;
    cellValueType: CellValueType;
    isMultipleCellValue?: boolean;
}
export declare const analyzeFilterValidationIssues: (filter: IFilter | null | undefined, fieldMetaMap: Record<string, IFilterValidationFieldMeta>) => IFilterValidationError[];
