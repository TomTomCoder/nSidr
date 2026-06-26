import type { ZodSafeParseResult } from 'zod';
import type { TableDomain } from '../table';
import type { IFilter } from '../view/filter';
import type { CellValueType, DbFieldType, FieldType } from './constant';
import type { LinkFieldCore } from './derivate/link.field';
import type { IFieldVisitor } from './field-visitor.interface';
import type { IFieldVo } from './field.schema';
import type { IConditionalLookupOptions, ILookupOptionsVo } from './lookup-options-base.schema';
export declare abstract class FieldCore implements IFieldVo {
    id: string;
    name: string;
    description?: string;
    notNull?: boolean;
    unique?: boolean;
    isPrimary?: boolean;
    dbFieldName: string;
    get dbFieldNames(): string[];
    aiConfig?: IFieldVo['aiConfig'];
    abstract type: FieldType;
    isComputed?: boolean;
    isPending?: boolean;
    hasError?: boolean;
    dbFieldType: DbFieldType;
    abstract options: IFieldVo['options'];
    abstract meta?: IFieldVo['meta'];
    abstract cellValueType: CellValueType;
    isMultipleCellValue?: boolean;
    isLookup?: boolean;
    isConditionalLookup?: boolean;
    lookupOptions?: ILookupOptionsVo;
    /**
     * Whether this field is full read record denied.
     */
    recordRead?: boolean;
    /**
     * Whether this field is full create record denied.
     */
    recordCreate?: boolean;
    /**
     * some field may store a json type item, we need to know how to convert it to string
     * it has those difference between cellValue2String
     * item is the fundamental element of a cellValue, but cellValue may be a Array
     * example a link cellValue: [{title: 'A1', id: 'rec1'}, {title: 'A2', id: 'rec2'}]
     * in this case, {title: 'A1', id: 'rec1'} is the item in cellValue.
     *
     * caution:
     * this function should handle the case that item is undefined
     */
    abstract item2String(value?: unknown): string;
    abstract cellValue2String(value?: unknown): string;
    abstract convertStringToCellValue(str: string, ctx?: unknown): unknown;
    /**
     * try parse cellValue as possible as it can
     * if not match it would return null
     * * computed field is always return null
     */
    abstract repair(value: unknown): unknown;
    abstract validateOptions(): ZodSafeParseResult<unknown> | undefined;
    abstract validateCellValue(value: unknown): ZodSafeParseResult<unknown> | undefined;
    /**
     * Wrapper to enforce notNull when calling validateCellValue.
     */
    validateCellValueWithNotNull(value: unknown): ZodSafeParseResult<unknown> | undefined;
    /**
     * Updates the dbFieldType based on the current field type, cellValueType, and isMultipleCellValue
     */
    updateDbFieldType(): void;
    /**
     * Accept method for the Visitor pattern.
     * Each concrete field type should implement this method to call the appropriate visitor method.
     *
     * @param visitor The visitor instance
     * @returns The result of the visitor method call
     */
    abstract accept<T>(visitor: IFieldVisitor<T>): T;
    getForeignLookupField(foreignTable: TableDomain): FieldCore | undefined;
    mustGetForeignLookupField(foreignTable: TableDomain): FieldCore;
    getLinkField(table: TableDomain): LinkFieldCore | undefined;
    getLinkFields(table: TableDomain): LinkFieldCore[];
    get isStructuredCellValue(): boolean;
    getConditionalLookupOptions(): IConditionalLookupOptions | undefined;
    /**
     * Returns the filter configured on this field's lookup options, if any.
     */
    getFilter(): IFilter | undefined;
}
