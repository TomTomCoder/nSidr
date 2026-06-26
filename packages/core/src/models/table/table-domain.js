"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableDomain = void 0;
const constant_1 = require("../field/constant");
const lookup_options_base_schema_1 = require("../field/lookup-options-base.schema");
const record_1 = require("../record");
const table_fields_1 = require("./table-fields");
/**
 * TableDomain represents a table with its fields and provides methods to interact with them
 * This is a domain object that encapsulates table-related business logic
 */
class TableDomain {
    id;
    name;
    dbTableName;
    icon;
    description;
    lastModifiedTime;
    baseId;
    dbViewName;
    _fields;
    constructor(params) {
        this.id = params.id;
        this.name = params.name;
        this.dbTableName = params.dbTableName;
        this.icon = params.icon;
        this.description = params.description;
        this.lastModifiedTime = params.lastModifiedTime;
        this.baseId = params.baseId;
        this.dbViewName = params.dbViewName;
        this._fields = new table_fields_1.TableFields(params.fields);
    }
    getTableNameAndId() {
        return `${this.name}_${this.id}`;
    }
    /**
     * Get the fields collection
     */
    get fields() {
        return this._fields;
    }
    /**
     * Get all fields as readonly array
     */
    get fieldList() {
        return this._fields.fields;
    }
    get fieldMap() {
        return this._fields.toFieldMap();
    }
    /**
     * Get field count
     */
    get fieldCount() {
        return this._fields.length;
    }
    /**
     * Check if table has any fields
     */
    get hasFields() {
        return !this._fields.isEmpty;
    }
    getFieldsByProjection(projection) {
        if (!projection || projection.length === 0) {
            return this.fieldList;
        }
        const fieldSet = new Set(projection);
        return this.fieldList.filter((field) => fieldSet.has(field.id) || fieldSet.has(field.name) || fieldSet.has(field.dbFieldName));
    }
    /**
     * Get fields map by specified key type
     */
    getFieldsMap(fieldKeyType) {
        switch (fieldKeyType) {
            case record_1.FieldKeyType.Id:
                return this._fields.toFieldMap();
            case record_1.FieldKeyType.Name:
                return this._fields.toFieldNameMap();
            case record_1.FieldKeyType.DbFieldName:
                return this._fields.toFieldDbNameMap();
            default:
                throw new Error(`Unsupported field key type: ${fieldKeyType}`);
        }
    }
    /**
     * Add a field to the table
     */
    addField(field) {
        this._fields.add(field);
    }
    /**
     * Add multiple fields to the table
     */
    addFields(fields) {
        this._fields.addMany(fields);
    }
    /**
     * Remove a field from the table
     */
    removeField(fieldId) {
        return this._fields.remove(fieldId);
    }
    /**
     * Find a field by id
     */
    getField(fieldId) {
        return this._fields.findById(fieldId);
    }
    /**
     * Find a field by id, throw error if not found
     */
    mustGetField(fieldId) {
        const field = this.getField(fieldId);
        if (!field) {
            throw new Error(`Field ${fieldId} not found`);
        }
        return field;
    }
    /**
     * Find a field by name
     */
    getFieldByName(name) {
        return this._fields.findByName(name);
    }
    /**
     * Find a field by database field name
     */
    getFieldByDbName(dbFieldName) {
        return this._fields.findByDbFieldName(dbFieldName);
    }
    /**
     * Check if a field exists
     */
    hasField(fieldId) {
        return this._fields.hasField(fieldId);
    }
    /**
     * Check if a field name exists
     */
    hasFieldName(name) {
        return this._fields.hasFieldName(name);
    }
    /**
     * Get the primary field
     */
    getPrimaryField() {
        return this._fields.getPrimaryField();
    }
    /**
     * Get the last modified fields
     */
    getLastModifiedFields() {
        return this._fields.getLastModifiedFields();
    }
    /**
     * Get all computed fields
     */
    getComputedFields() {
        return this._fields.getComputedFields();
    }
    /**
     * Get all lookup fields
     */
    getLookupFields() {
        return this._fields.getLookupFields();
    }
    /**
     * Update a field in the table
     */
    updateField(fieldId, updatedField) {
        return this._fields.update(fieldId, updatedField);
    }
    /**
     * Get all field ids
     */
    getFieldIds() {
        return this._fields.getIds();
    }
    /**
     * Get all field names
     */
    getFieldNames() {
        return this._fields.getNames();
    }
    /**
     * Create a field map by id
     */
    createFieldMap() {
        return this._fields.toFieldMap();
    }
    /**
     * Create a field map by name
     */
    createFieldNameMap() {
        return this._fields.toFieldNameMap();
    }
    /**
     * Filter fields by predicate
     */
    filterFields(predicate) {
        return this._fields.filter(predicate);
    }
    /**
     * Map fields to another type
     */
    mapFields(mapper) {
        return this._fields.map(mapper);
    }
    getLinkFieldsByProjection(projection) {
        if (!projection) {
            return this._fields.filter((field) => field.type === constant_1.FieldType.Link && !field.isLookup);
        }
        const expanded = this.expandFieldIdsWithLinkDependencies(projection);
        if (!expanded.size) {
            return [];
        }
        return Array.from(expanded)
            .map((fieldId) => this.getField(fieldId))
            .filter((field) => !!field && field.type === constant_1.FieldType.Link && !field.isLookup);
    }
    /**
     * Get all foreign table IDs from link fields
     */
    getAllForeignTableIds(fieldIds) {
        if (!fieldIds || fieldIds.length === 0) {
            return this._fields.getAllForeignTableIds();
        }
        const expandedFieldIds = this.expandFieldIdsWithLinkDependencies(fieldIds);
        return this._fields.getAllForeignTableIds([...expandedFieldIds]);
    }
    // eslint-disable-next-line sonarjs/cognitive-complexity
    expandFieldIdsWithLinkDependencies(fieldIds) {
        const visited = new Set();
        const stack = [...fieldIds];
        while (stack.length) {
            const fieldId = stack.pop();
            if (!fieldId || visited.has(fieldId)) {
                continue;
            }
            visited.add(fieldId);
            const field = this.getField(fieldId);
            if (!field) {
                continue;
            }
            const linkFields = field.getLinkFields(this);
            for (const linkField of linkFields) {
                if (!visited.has(linkField.id)) {
                    stack.push(linkField.id);
                }
            }
            const lookupOptions = field.lookupOptions;
            if (lookupOptions && (0, lookup_options_base_schema_1.isLinkLookupOptions)(lookupOptions)) {
                const linkFieldId = lookupOptions.linkFieldId;
                if (linkFieldId && !visited.has(linkFieldId)) {
                    stack.push(linkFieldId);
                }
            }
        }
        return visited;
    }
    /**
     * Create a copy of the table domain object
     */
    clone() {
        return new TableDomain({
            id: this.id,
            name: this.name,
            dbTableName: this.dbTableName,
            icon: this.icon,
            description: this.description,
            lastModifiedTime: this.lastModifiedTime,
            baseId: this.baseId,
            dbViewName: this.dbViewName,
            fields: this._fields.toArray(),
        });
    }
    /**
     * Convert to plain object representation
     */
    toPlainObject() {
        return {
            id: this.id,
            name: this.name,
            dbTableName: this.dbTableName,
            icon: this.icon,
            description: this.description,
            lastModifiedTime: this.lastModifiedTime,
            baseId: this.baseId,
            dbViewName: this.dbViewName,
            fields: this._fields.toArray(),
            fieldCount: this.fieldCount,
        };
    }
}
exports.TableDomain = TableDomain;
