import { z } from '../../../zod';
import type { TableDomain } from '../../table/table-domain';
import type { IFilter } from '../../view/filter/filter';
import { type CellValueType, FieldType, Relationship } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import { type ILinkFieldOptions, type ILinkFieldMeta } from './link-option.schema';
export declare const linkCellValueSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ILinkCellValue = z.infer<typeof linkCellValueSchema>;
export declare class LinkFieldCore extends FieldCore {
    static defaultOptions(): Partial<ILinkFieldOptions>;
    get isStructuredCellValue(): boolean;
    type: FieldType.Link;
    options: ILinkFieldOptions;
    meta?: ILinkFieldMeta;
    cellValueType: CellValueType.String;
    isMultipleCellValue?: boolean | undefined;
    getHasOrderColumn(): boolean;
    /**
     * Get the order column name for this link field based on its relationship type
     * @returns The order column name to use in database queries and operations
     */
    getOrderColumnName(): string;
    getIsMultiValue(): boolean;
    cellValue2String(cellValue?: unknown): string;
    convertStringToCellValue(_value: string): string[] | null;
    repair(value: unknown): {
        id: string;
        title?: string | undefined;
    } | {
        id: string;
        title?: string | undefined;
    }[] | null;
    validateOptions(): z.ZodSafeParseResult<{
        relationship: Relationship;
        foreignTableId: string;
        lookupFieldId: string;
        fkHostTableName: string;
        selfKeyName: string;
        foreignKeyName: string;
        baseId?: string | undefined;
        isOneWay?: boolean | undefined;
        symmetricFieldId?: string | undefined;
        filterByViewId?: string | null | undefined;
        visibleFieldIds?: string[] | null | undefined;
        filter?: import("../../view/filter/filter").IFilterSet | null | undefined;
    }>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<{
        id: string;
        title?: string | undefined;
    }[] | null> | z.ZodSafeParseResult<{
        id: string;
        title?: string | undefined;
    } | null>;
    item2String(value: unknown): string;
    accept<T>(visitor: IFieldVisitor<T>): T;
    /**
     * Get the foreign table ID that this link field references
     */
    getForeignTableId(): string | undefined;
    /**
     * Get the lookup field from the foreign table
     * @param foreignTable - The table domain to search for the lookup field
     * @override
     * @returns The lookup field instance if found and table IDs match
     */
    getForeignLookupField(foreignTable: TableDomain): FieldCore | undefined;
    mustGetForeignLookupField(tableDomain: TableDomain): FieldCore;
    getLookupFields(tableDomain: TableDomain): FieldCore[];
    getRollupFields(tableDomain: TableDomain): FieldCore[];
    getFilter(): IFilter | undefined;
}
