import type { IFieldMap } from '../../formula';
import type { LinkFieldCore } from '../field/derivate/link.field';
import type { FieldCore } from '../field/field';
/**
 * TableFields represents a collection of fields within a table
 * This class provides methods to manage and query fields
 */
export declare class TableFields {
    private readonly _fields;
    constructor(fields?: FieldCore[]);
    /**
     * Get all fields as readonly array
     */
    get fields(): readonly FieldCore[];
    /**
     * Get the number of fields
     */
    get length(): number;
    /**
     * Get fields ordered by dependency (topological order)
     * - Formula fields depend on fields referenced in their expression
     * - Lookup fields depend on their link field
     * - Rollup fields depend on their link field
     * The order is stable relative to original positions when possible.
     */
    get ordered(): FieldCore[];
    /**
     * Check if fields collection is empty
     */
    get isEmpty(): boolean;
    /**
     * Add a field to the collection
     */
    add(field: FieldCore): void;
    /**
     * Add multiple fields to the collection
     */
    addMany(fields: FieldCore[]): void;
    /**
     * Remove a field by id
     */
    remove(fieldId: string): boolean;
    /**
     * Find a field by id
     */
    findById(fieldId: string): FieldCore | undefined;
    /**
     * Find a field by name
     */
    findByName(name: string): FieldCore | undefined;
    /**
     * Find a field by database field name
     */
    findByDbFieldName(dbFieldName: string): FieldCore | undefined;
    /**
     * Get all field ids
     */
    getIds(): string[];
    /**
     * Get all field names
     */
    getNames(): string[];
    /**
     * Filter fields by predicate
     */
    filter(predicate: (field: FieldCore) => boolean): FieldCore[];
    /**
     * Map fields to another type
     */
    map<T>(mapper: (field: FieldCore) => T): T[];
    /**
     * Check if a field exists by id
     */
    hasField(fieldId: string): boolean;
    /**
     * Check if a field name exists
     */
    hasFieldName(name: string): boolean;
    /**
     * Get primary field (if exists)
     */
    getPrimaryField(): FieldCore | undefined;
    /**
     * Get last modified fields
     */
    getLastModifiedFields(): FieldCore[];
    /**
     * Get computed fields
     */
    getComputedFields(): FieldCore[];
    getLinkFields(): LinkFieldCore[];
    /**
     * Get lookup fields
     */
    getLookupFields(): FieldCore[];
    /**
     * Update a field in the collection
     */
    update(fieldId: string, updatedField: FieldCore): boolean;
    /**
     * Clear all fields
     */
    clear(): void;
    /**
     * Create a copy of the fields collection
     */
    clone(): TableFields;
    /**
     * Convert to plain array
     */
    toArray(): FieldCore[];
    /**
     * Create field map by id
     */
    toFieldMap(): IFieldMap;
    /**
     * Create field map by name
     */
    toFieldNameMap(): Map<string, FieldCore>;
    toFieldDbNameMap(): Map<string, FieldCore>;
    /**
     * Get all foreign table ids from link fields
     */
    getAllForeignTableIds(fieldIds?: string[]): Set<string>;
    /**
     * Iterator support for for...of loops
     */
    [Symbol.iterator](): Iterator<FieldCore>;
}
