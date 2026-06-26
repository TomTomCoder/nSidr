import type { LinkFieldCore } from '../field';
import type { TableDomain } from './table-domain';
/**
 * Tables domain object that manages a collection of table domains
 * This class encapsulates table collection operations and provides a clean API
 * for managing multiple tables with visited state tracking
 */
export declare class Tables {
    private readonly _tableDomains;
    private readonly _visited;
    private readonly _entryTableId;
    constructor(entryTableId: string, tableDomains?: Map<string, TableDomain>, visited?: Set<string>);
    /**
     * Get all table domains as readonly map
     */
    get tableDomains(): ReadonlyMap<string, TableDomain>;
    /**
     * Get visited table IDs as readonly set
     */
    get visited(): ReadonlySet<string>;
    /**
     * Get the entry table ID
     */
    get entryTableId(): string;
    /**
     * Get the number of tables
     */
    get size(): number;
    /**
     * Check if tables collection is empty
     */
    get isEmpty(): boolean;
    /**
     * Add a table domain to the collection
     */
    addTable(tableId: string, tableDomain: TableDomain): void;
    /**
     * Add multiple table domains to the collection
     */
    addTables(tables: Map<string, TableDomain>): void;
    /**
     * Get a table domain by ID
     */
    getTable(tableId: string): TableDomain | undefined;
    mustGetTable(tableId: string): TableDomain;
    getLinkForeignTable(field: LinkFieldCore): TableDomain | undefined;
    mustGetLinkForeignTable(field: LinkFieldCore): TableDomain;
    /**
     * Check if a table exists
     */
    hasTable(tableId: string): boolean;
    /**
     * Remove a table from the collection
     */
    removeTable(tableId: string): boolean;
    /**
     * Mark a table as visited
     */
    markVisited(tableId: string): void;
    /**
     * Check if a table has been visited
     */
    isVisited(tableId: string): boolean;
    /**
     * Get all table IDs
     */
    getTableIds(): string[];
    /**
     * Get all table domains as array
     */
    getTableDomainByIdsArray(): TableDomain[];
    /**
     * Get all visited table IDs as array
     */
    getVisitedTableIds(): string[];
    /**
     * Get the entry table domain
     */
    getEntryTable(): TableDomain | undefined;
    /**
     * Get the entry table domain, throw error if not found
     * @throws Error - If entry table is not found
     */
    mustGetEntryTable(): TableDomain;
    getTableListByIds(ids: Iterable<string>): TableDomain[];
    /**
     * Get all foreign table domains (excluding the entry table)
     */
    getForeignTables(): Map<string, TableDomain>;
    /**
     * Get all foreign table IDs (excluding the entry table)
     */
    getForeignTableIds(): string[];
    /**
     * Check if a table is the entry table
     */
    isEntryTable(tableId: string): boolean;
    /**
     * Check if a table is a foreign table (not the entry table)
     */
    isForeignTable(tableId: string): boolean;
    /**
     * Filter tables by predicate
     */
    filterTables(predicate: (tableDomain: TableDomain, tableId: string) => boolean): TableDomain[];
    /**
     * Map tables to another type
     */
    mapTables<T>(mapper: (tableDomain: TableDomain, tableId: string) => T): T[];
    /**
     * Get all related table IDs from all tables in the collection
     */
    getAllRelatedTableIds(): Set<string>;
    /**
     * Get tables that are not yet visited
     */
    getUnvisitedTables(): Map<string, TableDomain>;
    /**
     * Get tables that have been visited
     */
    getVisitedTables(): Map<string, TableDomain>;
    /**
     * Clear all tables and visited state
     */
    clear(): void;
    /**
     * Create a copy of the tables collection
     */
    clone(): Tables;
    /**
     * Convert to plain object representation
     */
    toPlainObject(): {
        entryTableId: string;
        tables: {
            [k: string]: {
                id: string;
                name: string;
                dbTableName: string;
                icon: string | undefined;
                description: string | undefined;
                lastModifiedTime: string;
                baseId: string | undefined;
                dbViewName: string | undefined;
                fields: import("../field").FieldCore[];
                fieldCount: number;
            };
        };
        foreignTables: {
            [k: string]: {
                id: string;
                name: string;
                dbTableName: string;
                icon: string | undefined;
                description: string | undefined;
                lastModifiedTime: string;
                baseId: string | undefined;
                dbViewName: string | undefined;
                fields: import("../field").FieldCore[];
                fieldCount: number;
            };
        };
        visited: string[];
        size: number;
        isEmpty: boolean;
    };
    /**
     * Iterator support for for...of loops over table domains
     */
    [Symbol.iterator](): Iterator<[string, TableDomain]>;
}
