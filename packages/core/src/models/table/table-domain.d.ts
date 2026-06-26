import type { IFieldMap } from '../../formula';
import type { FieldCore } from '../field/field';
import { FieldKeyType } from '../record';
import { TableFields } from './table-fields';
/**
 * TableDomain represents a table with its fields and provides methods to interact with them
 * This is a domain object that encapsulates table-related business logic
 */
export declare class TableDomain {
    readonly id: string;
    readonly name: string;
    readonly dbTableName: string;
    readonly icon?: string;
    readonly description?: string;
    readonly lastModifiedTime: string;
    readonly baseId?: string;
    readonly dbViewName?: string;
    private readonly _fields;
    constructor(params: {
        id: string;
        name: string;
        dbTableName: string;
        lastModifiedTime: string;
        icon?: string;
        description?: string;
        baseId?: string;
        fields?: FieldCore[];
        dbViewName?: string;
    });
    getTableNameAndId(): string;
    /**
     * Get the fields collection
     */
    get fields(): TableFields;
    /**
     * Get all fields as readonly array
     */
    get fieldList(): readonly FieldCore[];
    get fieldMap(): IFieldMap;
    /**
     * Get field count
     */
    get fieldCount(): number;
    /**
     * Check if table has any fields
     */
    get hasFields(): boolean;
    getFieldsByProjection(projection?: string[]): FieldCore[];
    /**
     * Get fields map by specified key type
     */
    getFieldsMap(fieldKeyType: FieldKeyType): Map<string, FieldCore>;
    /**
     * Add a field to the table
     */
    addField(field: FieldCore): void;
    /**
     * Add multiple fields to the table
     */
    addFields(fields: FieldCore[]): void;
    /**
     * Remove a field from the table
     */
    removeField(fieldId: string): boolean;
    /**
     * Find a field by id
     */
    getField(fieldId: string): FieldCore | undefined;
    /**
     * Find a field by id, throw error if not found
     */
    mustGetField(fieldId: string): FieldCore;
    /**
     * Find a field by name
     */
    getFieldByName(name: string): FieldCore | undefined;
    /**
     * Find a field by database field name
     */
    getFieldByDbName(dbFieldName: string): FieldCore | undefined;
    /**
     * Check if a field exists
     */
    hasField(fieldId: string): boolean;
    /**
     * Check if a field name exists
     */
    hasFieldName(name: string): boolean;
    /**
     * Get the primary field
     */
    getPrimaryField(): FieldCore | undefined;
    /**
     * Get the last modified fields
     */
    getLastModifiedFields(): FieldCore[];
    /**
     * Get all computed fields
     */
    getComputedFields(): FieldCore[];
    /**
     * Get all lookup fields
     */
    getLookupFields(): FieldCore[];
    /**
     * Update a field in the table
     */
    updateField(fieldId: string, updatedField: FieldCore): boolean;
    /**
     * Get all field ids
     */
    getFieldIds(): string[];
    /**
     * Get all field names
     */
    getFieldNames(): string[];
    /**
     * Create a field map by id
     */
    createFieldMap(): Map<string, FieldCore>;
    /**
     * Create a field map by name
     */
    createFieldNameMap(): Map<string, FieldCore>;
    /**
     * Filter fields by predicate
     */
    filterFields(predicate: (field: FieldCore) => boolean): FieldCore[];
    /**
     * Map fields to another type
     */
    mapFields<T>(mapper: (field: FieldCore) => T): T[];
    getLinkFieldsByProjection(projection?: Iterable<string>): FieldCore[];
    /**
     * Get all foreign table IDs from link fields
     */
    getAllForeignTableIds(fieldIds?: string[]): Set<string>;
    private expandFieldIdsWithLinkDependencies;
    /**
     * Create a copy of the table domain object
     */
    clone(): TableDomain;
    /**
     * Convert to plain object representation
     */
    toPlainObject(): {
        id: string;
        name: string;
        dbTableName: string;
        icon: string | undefined;
        description: string | undefined;
        lastModifiedTime: string;
        baseId: string | undefined;
        dbViewName: string | undefined;
        fields: FieldCore[];
        fieldCount: number;
    };
}
