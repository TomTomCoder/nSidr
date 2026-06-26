import { z } from 'zod';
import type { TableDomain } from '../../table/table-domain';
import type { CellValueType } from '../constant';
import { FieldType } from '../constant';
import type { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import { FormulaAbstractCore } from './abstract/formula.field.abstract';
import { type IFormulaFieldMeta, type IFormulaFieldOptions } from './formula-option.schema';
import type { LinkFieldCore } from './link.field';
declare const formulaFieldCellValueSchema: z.ZodAny;
export type IFormulaCellValue = z.infer<typeof formulaFieldCellValueSchema>;
export declare class FormulaFieldCore extends FormulaAbstractCore {
    static defaultOptions(cellValueType: CellValueType): IFormulaFieldOptions;
    static convertExpressionIdToName(expression: string, dependFieldMap: {
        [fieldId: string]: {
            name: string;
        };
    }): string;
    static convertExpressionNameToId(expression: string, dependFieldMap: {
        [fieldId: string]: {
            name: string;
        };
    }): string;
    static getReferenceFieldIds(expression: string): string[];
    static getParsedValueType(expression: string, dependFieldMap: {
        [fieldId: string]: FieldCore;
    }): {
        cellValueType: CellValueType;
        isMultipleCellValue: boolean | undefined;
    };
    type: FieldType.Formula;
    options: IFormulaFieldOptions;
    meta?: IFormulaFieldMeta;
    getExpression(): string;
    getReferenceFieldIds(): string[];
    /**
     * Get referenced fields from a table domain
     * @param tableDomain - The table domain to search for referenced fields
     * @returns Array of referenced field instances
     */
    getReferenceFields(tableDomain: TableDomain): FieldCore[];
    /**
     * Check recursively whether all references in this formula are resolvable in the given table
     * - Missing referenced field returns true (unresolved)
     * - If a referenced formula exists but itself has unresolved references (or hasError), returns true
     */
    hasUnresolvedReferences(tableDomain: TableDomain, visited?: Set<string>): boolean;
    getLinkFields(tableDomain: TableDomain): LinkFieldCore[];
    /**
     * Get the generated column name for database-generated formula fields
     * This should match the naming convention used in database-column-visitor
     */
    getGeneratedColumnName(): string;
    getIsPersistedAsGeneratedColumn(): boolean;
    /**
     * Recalculates and updates the cellValueType, isMultipleCellValue, and dbFieldType for this formula field
     * based on its expression and the current field context
     * @param fieldMap Map of field ID to field instance for context
     */
    recalculateFieldTypes(fieldMap: Record<string, FieldCore>): void;
    validateOptions(): z.ZodSafeParseResult<{
        expression: string;
        formatting: {
            precision: number;
            type: import("../formatting").NumberFormattingType.Decimal;
        } | {
            precision: number;
            type: import("../formatting").NumberFormattingType.Percent;
        } | {
            precision: number;
            type: import("../formatting").NumberFormattingType.Currency;
            symbol: string;
        } | {
            date: string;
            time: import("../formatting").TimeFormatting;
            timeZone: string;
        } | undefined;
        showAs: {
            type: import("../show-as").SingleLineTextDisplayType;
        } | {
            type: import("../show-as").SingleNumberDisplayType;
            color: import("@teable/core").Colors;
            showValue: boolean;
            maxValue: number;
        } | {
            type: import("../show-as").MultiNumberDisplayType;
            color: import("@teable/core").Colors;
        } | {
            type: "markdown";
        } | undefined;
    }>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
export {};
