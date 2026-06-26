"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkFieldCore = exports.linkCellValueSchema = void 0;
const utils_1 = require("../../../utils");
const zod_1 = require("../../../zod");
const constant_1 = require("../constant");
const field_1 = require("../field");
const link_option_schema_1 = require("./link-option.schema");
exports.linkCellValueSchema = zod_1.z.object({
    id: zod_1.z.string().startsWith(utils_1.IdPrefix.Record),
    title: zod_1.z.string().optional(),
});
const singleLinkCellValueSchema = zod_1.z
    .union([exports.linkCellValueSchema.nullable(), zod_1.z.array(exports.linkCellValueSchema).nonempty()])
    .transform((value) => (Array.isArray(value) ? value[0] : value));
const multipleLinkCellValueSchema = zod_1.z
    .union([zod_1.z.array(exports.linkCellValueSchema).nonempty().nullable(), exports.linkCellValueSchema])
    .transform((value) => {
    if (value == null) {
        return null;
    }
    return Array.isArray(value) ? value : [value];
});
class LinkFieldCore extends field_1.FieldCore {
    static defaultOptions() {
        return {};
    }
    get isStructuredCellValue() {
        return true;
    }
    type;
    options;
    cellValueType;
    getHasOrderColumn() {
        return !!this.meta?.hasOrderColumn;
    }
    /**
     * Get the order column name for this link field based on its relationship type
     * @returns The order column name to use in database queries and operations
     */
    getOrderColumnName() {
        const relationship = this.options.relationship;
        switch (relationship) {
            case constant_1.Relationship.ManyMany:
                // ManyMany relationships use a simple __order column in the junction table
                return '__order';
            case constant_1.Relationship.OneMany:
                // One-way OneMany may reuse legacy ManyMany junction storage where order column is "__order".
                if (this.options.isOneWay && this.getHasOrderColumn()) {
                    return '__order';
                }
                // Other OneMany relationships use selfKeyName + _order.
                return `${this.options.selfKeyName}_order`;
            case constant_1.Relationship.ManyOne:
            case constant_1.Relationship.OneOne:
                // ManyOne and OneOne relationships use the foreignKeyName (foreign key in current table) + _order
                return `${this.options.foreignKeyName}_order`;
            default:
                throw new Error(`Unsupported relationship type: ${relationship}`);
        }
    }
    getIsMultiValue() {
        const relationship = this.options.relationship;
        return relationship === constant_1.Relationship.ManyMany || relationship === constant_1.Relationship.OneMany;
    }
    cellValue2String(cellValue) {
        if (Array.isArray(cellValue)) {
            return cellValue.map((v) => this.item2String(v)).join(', ');
        }
        return this.item2String(cellValue);
    }
    convertStringToCellValue(_value) {
        return null;
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        const validatedValue = this.validateCellValue(value);
        if (validatedValue.success) {
            return validatedValue.data;
        }
        return null;
    }
    validateOptions() {
        return link_option_schema_1.linkFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            // Realtime convert can briefly deliver the previous single-value shape
            // before records finish re-querying into the new multi-value shape.
            return multipleLinkCellValueSchema.safeParse(value);
        }
        // Realtime convert can briefly deliver the previous multi-value shape
        // before records finish re-querying into the new single-value shape.
        return singleLinkCellValueSchema.safeParse(value);
    }
    item2String(value) {
        if (value == null) {
            return '';
        }
        return value.title || '';
    }
    accept(visitor) {
        return visitor.visitLinkField(this);
    }
    /**
     * Get the foreign table ID that this link field references
     */
    getForeignTableId() {
        return this.options.foreignTableId;
    }
    /**
     * Get the lookup field from the foreign table
     * @param foreignTable - The table domain to search for the lookup field
     * @override
     * @returns The lookup field instance if found and table IDs match
     */
    getForeignLookupField(foreignTable) {
        if (this.isLookup) {
            return super.getForeignLookupField(foreignTable);
        }
        // Ensure the foreign table ID matches the provided table domain ID
        if (this.options.foreignTableId !== foreignTable.id) {
            return undefined;
        }
        // Get the lookup field ID from options
        const lookupFieldId = this.options.lookupFieldId;
        if (!lookupFieldId) {
            return undefined;
        }
        // Get the lookup field instance from the table domain
        return foreignTable.getField(lookupFieldId);
    }
    mustGetForeignLookupField(tableDomain) {
        const field = this.getForeignLookupField(tableDomain);
        if (!field) {
            throw new Error(`Lookup field ${this.options.lookupFieldId} not found`);
        }
        return field;
    }
    getLookupFields(tableDomain) {
        return tableDomain.filterFields((field) => !!field.isLookup &&
            !!field.lookupOptions &&
            'linkFieldId' in field.lookupOptions &&
            field.lookupOptions.linkFieldId === this.id);
    }
    getRollupFields(tableDomain) {
        return tableDomain.filterFields((field) => field.type === constant_1.FieldType.Rollup &&
            !!field.lookupOptions &&
            'linkFieldId' in field.lookupOptions &&
            field.lookupOptions.linkFieldId === this.id);
    }
    getFilter() {
        return this.options?.filter ?? undefined;
    }
}
exports.LinkFieldCore = LinkFieldCore;
