"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldCore = void 0;
const zod_1 = require("zod");
const get_db_field_type_1 = require("./utils/get-db-field-type");
class FieldCore {
    id;
    name;
    description;
    notNull;
    unique;
    isPrimary;
    dbFieldName;
    get dbFieldNames() {
        return [this.dbFieldName];
    }
    aiConfig;
    isComputed;
    isPending;
    hasError;
    dbFieldType;
    // if cellValue multiple
    // every field need to consider to support multiple cellValue, because lookup value may be multiple
    isMultipleCellValue;
    // if this field is lookup field
    isLookup;
    // indicates lookup field applies conditional filtering when resolving values
    isConditionalLookup;
    lookupOptions;
    /**
     * Whether this field is full read record denied.
     */
    recordRead;
    /**
     * Whether this field is full create record denied.
     */
    recordCreate;
    /**
     * Wrapper to enforce notNull when calling validateCellValue.
     */
    validateCellValueWithNotNull(value) {
        if (this.isComputed) {
            return this.validateCellValue(value);
        }
        if (this.notNull && (value === null || value === undefined)) {
            return {
                success: false,
                error: new zod_1.ZodError([
                    {
                        code: 'custom',
                        message: 'Required',
                        path: [],
                    },
                ]),
            };
        }
        return this.validateCellValue(value);
    }
    /**
     * Updates the dbFieldType based on the current field type, cellValueType, and isMultipleCellValue
     */
    updateDbFieldType() {
        this.dbFieldType = (0, get_db_field_type_1.getDbFieldType)(this.type, this.cellValueType, this.isMultipleCellValue);
    }
    getForeignLookupField(foreignTable) {
        const lookupFieldId = this.lookupOptions?.lookupFieldId;
        if (!lookupFieldId) {
            return undefined;
        }
        return foreignTable.getField(lookupFieldId);
    }
    mustGetForeignLookupField(foreignTable) {
        const field = this.getForeignLookupField(foreignTable);
        if (!field) {
            throw new Error(`Lookup field ${this.lookupOptions?.lookupFieldId} not found`);
        }
        return field;
    }
    getLinkField(table) {
        const options = this.lookupOptions;
        if (!options || !('linkFieldId' in options)) {
            return undefined;
        }
        const linkFieldId = options.linkFieldId;
        return table.getField(linkFieldId);
    }
    getLinkFields(table) {
        const linkField = this.getLinkField(table);
        if (!linkField) {
            return [];
        }
        return [linkField];
    }
    get isStructuredCellValue() {
        return false;
    }
    getConditionalLookupOptions() {
        if (!this.isConditionalLookup) {
            return undefined;
        }
        const options = this.lookupOptions;
        if (!options || 'linkFieldId' in options) {
            return undefined;
        }
        return options;
    }
    /**
     * Returns the filter configured on this field's lookup options, if any.
     */
    getFilter() {
        return this.lookupOptions?.filter ?? undefined;
    }
}
exports.FieldCore = FieldCore;
