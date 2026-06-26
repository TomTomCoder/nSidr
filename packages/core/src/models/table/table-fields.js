"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableFields = void 0;
const constant_1 = require("../field/constant");
const field_util_1 = require("../field/field.util");
const lookup_options_base_schema_1 = require("../field/lookup-options-base.schema");
/**
 * TableFields represents a collection of fields within a table
 * This class provides methods to manage and query fields
 */
class TableFields {
    _fields;
    constructor(fields = []) {
        this._fields = [...fields];
    }
    /**
     * Get all fields as readonly array
     */
    get fields() {
        return this._fields;
    }
    /**
     * Get the number of fields
     */
    get length() {
        return this._fields.length;
    }
    /**
     * Get fields ordered by dependency (topological order)
     * - Formula fields depend on fields referenced in their expression
     * - Lookup fields depend on their link field
     * - Rollup fields depend on their link field
     * The order is stable relative to original positions when possible.
     */
    // eslint-disable-next-line sonarjs/cognitive-complexity
    get ordered() {
        const fields = this._fields;
        const idToIndex = new Map();
        const idToField = new Map();
        fields.forEach((f, i) => {
            idToIndex.set(f.id, i);
            idToField.set(f.id, f);
        });
        // Build adjacency list dep -> dependents and in-degree counts
        const adjacency = new Map();
        const inDegree = new Map();
        for (const f of fields) {
            inDegree.set(f.id, 0);
        }
        const addEdge = (fromId, toId) => {
            if (!idToField.has(fromId) || !idToField.has(toId) || fromId === toId)
                return;
            let set = adjacency.get(fromId);
            if (!set) {
                set = new Set();
                adjacency.set(fromId, set);
            }
            if (!set.has(toId)) {
                set.add(toId);
                inDegree.set(toId, (inDegree.get(toId) || 0) + 1);
            }
        };
        for (const f of fields) {
            // Collect dependencies for each field
            let deps = [];
            if (f.type === constant_1.FieldType.Formula) {
                // Prefer instance method if available, fallback to static helper
                deps = f.getReferenceFieldIds?.();
            }
            // Lookup fields depend on their link field
            if (f.isLookup) {
                const linkFieldId = getLinkLookupFieldId(f.lookupOptions);
                if (linkFieldId) {
                    deps = [...deps, linkFieldId];
                }
            }
            // Rollup fields also depend on their link field
            if (f.type === constant_1.FieldType.Rollup) {
                const linkFieldId = getLinkLookupFieldId(f.lookupOptions);
                if (linkFieldId) {
                    deps = [...deps, linkFieldId];
                }
            }
            if (f.type === constant_1.FieldType.ConditionalRollup) {
                const linkFieldId = getLinkLookupFieldId(f.lookupOptions);
                if (linkFieldId) {
                    deps = [...deps, linkFieldId];
                }
            }
            // Create edges dep -> f.id
            for (const depId of new Set(deps)) {
                addEdge(depId, f.id);
            }
        }
        // Kahn's algorithm with stable ordering by original index
        const zeroQueue = [];
        for (const [id, deg] of inDegree) {
            if (deg === 0)
                zeroQueue.push(id);
        }
        zeroQueue.sort((a, b) => idToIndex.get(a) - idToIndex.get(b));
        const resultIds = [];
        while (zeroQueue.length > 0) {
            const id = zeroQueue.shift();
            resultIds.push(id);
            const neighbors = adjacency.get(id);
            if (!neighbors)
                continue;
            // To keep stability, process neighbors by original index
            const orderedNeighbors = Array.from(neighbors).sort((a, b) => idToIndex.get(a) - idToIndex.get(b));
            for (const nb of orderedNeighbors) {
                const nextDeg = (inDegree.get(nb) || 0) - 1;
                inDegree.set(nb, nextDeg);
                if (nextDeg === 0) {
                    // insert in position to keep queue ordered by original index
                    const idx = zeroQueue.findIndex((x) => idToIndex.get(x) > idToIndex.get(nb));
                    if (idx === -1)
                        zeroQueue.push(nb);
                    else
                        zeroQueue.splice(idx, 0, nb);
                }
            }
        }
        // If cycles exist, append remaining nodes by original order
        if (resultIds.length < fields.length) {
            const remaining = fields
                .map((f, i) => ({ id: f.id, i }))
                .filter(({ id }) => !resultIds.includes(id))
                .sort((a, b) => a.i - b.i)
                .map(({ id }) => id);
            resultIds.push(...remaining);
        }
        return resultIds.map((id) => idToField.get(id));
    }
    /**
     * Check if fields collection is empty
     */
    get isEmpty() {
        return this._fields.length === 0;
    }
    /**
     * Add a field to the collection
     */
    add(field) {
        this._fields.push(field);
    }
    /**
     * Add multiple fields to the collection
     */
    addMany(fields) {
        this._fields.push(...fields);
    }
    /**
     * Remove a field by id
     */
    remove(fieldId) {
        const index = this._fields.findIndex((field) => field.id === fieldId);
        if (index !== -1) {
            this._fields.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Find a field by id
     */
    findById(fieldId) {
        return this._fields.find((field) => field.id === fieldId);
    }
    /**
     * Find a field by name
     */
    findByName(name) {
        return this._fields.find((field) => field.name === name);
    }
    /**
     * Find a field by database field name
     */
    findByDbFieldName(dbFieldName) {
        return this._fields.find((field) => field.dbFieldName === dbFieldName);
    }
    /**
     * Get all field ids
     */
    getIds() {
        return this._fields.map((field) => field.id);
    }
    /**
     * Get all field names
     */
    getNames() {
        return this._fields.map((field) => field.name);
    }
    /**
     * Filter fields by predicate
     */
    filter(predicate) {
        return this._fields.filter(predicate);
    }
    /**
     * Map fields to another type
     */
    map(mapper) {
        return this._fields.map(mapper);
    }
    /**
     * Check if a field exists by id
     */
    hasField(fieldId) {
        return this._fields.some((field) => field.id === fieldId);
    }
    /**
     * Check if a field name exists
     */
    hasFieldName(name) {
        return this._fields.some((field) => field.name === name);
    }
    /**
     * Get primary field (if exists)
     */
    getPrimaryField() {
        return this._fields.find((field) => field.isPrimary);
    }
    /**
     * Get last modified fields
     */
    getLastModifiedFields() {
        return this._fields.filter((field) => field.type === constant_1.FieldType.LastModifiedTime || field.type === constant_1.FieldType.LastModifiedBy);
    }
    /**
     * Get computed fields
     */
    getComputedFields() {
        return this._fields.filter((field) => field.isComputed);
    }
    getLinkFields() {
        return this._fields.filter(field_util_1.isLinkField);
    }
    /**
     * Get lookup fields
     */
    getLookupFields() {
        return this._fields.filter((field) => field.isLookup);
    }
    /**
     * Update a field in the collection
     */
    update(fieldId, updatedField) {
        const index = this._fields.findIndex((field) => field.id === fieldId);
        if (index !== -1) {
            this._fields[index] = updatedField;
            return true;
        }
        return false;
    }
    /**
     * Clear all fields
     */
    clear() {
        this._fields.length = 0;
    }
    /**
     * Create a copy of the fields collection
     */
    clone() {
        return new TableFields(this._fields);
    }
    /**
     * Convert to plain array
     */
    toArray() {
        return [...this._fields];
    }
    /**
     * Create field map by id
     */
    toFieldMap() {
        return new Map(this._fields.map((field) => [field.id, field]));
    }
    /**
     * Create field map by name
     */
    toFieldNameMap() {
        return new Map(this._fields.map((field) => [field.name, field]));
    }
    toFieldDbNameMap() {
        return new Map(this._fields.map((field) => [field.dbFieldName, field]));
    }
    /**
     * Get all foreign table ids from link fields
     */
    // eslint-disable-next-line sonarjs/cognitive-complexity
    getAllForeignTableIds(fieldIds) {
        const foreignTableIds = new Set();
        const fieldIdSet = fieldIds ? new Set(fieldIds) : undefined;
        for (const field of this) {
            if (fieldIdSet && !fieldIdSet.has(field.id)) {
                continue;
            }
            if (field.isConditionalLookup) {
                const options = field.lookupOptions;
                const foreignTableId = (0, lookup_options_base_schema_1.isConditionalLookupOptions)(options)
                    ? options.foreignTableId
                    : undefined;
                if (foreignTableId) {
                    foreignTableIds.add(foreignTableId);
                }
                continue;
            }
            if (field.type === constant_1.FieldType.ConditionalRollup) {
                const foreignTableId = field.getForeignTableId?.();
                if (foreignTableId) {
                    foreignTableIds.add(foreignTableId);
                }
                continue;
            }
            if (!(0, field_util_1.isLinkField)(field))
                continue;
            // Skip errored link fields to avoid traversing deleted/missing tables
            if (field.hasError)
                continue;
            const foreignTableId = field.getForeignTableId();
            if (foreignTableId) {
                foreignTableIds.add(foreignTableId);
            }
        }
        return foreignTableIds;
    }
    /**
     * Iterator support for for...of loops
     */
    *[Symbol.iterator]() {
        for (const field of this._fields) {
            yield field;
        }
    }
}
exports.TableFields = TableFields;
const getLinkLookupFieldId = (options) => {
    return options && (0, lookup_options_base_schema_1.isLinkLookupOptions)(options) ? options.linkFieldId : undefined;
};
