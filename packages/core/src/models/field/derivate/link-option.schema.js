"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkFieldOptionsRoSchema = exports.linkFieldMetaSchema = exports.linkFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const filter_1 = require("../../view/filter");
const constant_1 = require("../constant");
exports.linkFieldOptionsSchema = zod_1.z
    .object({
    baseId: zod_1.z.string().optional().meta({
        description: 'the base id of the table that this field is linked to, only required for cross base link',
    }),
    relationship: zod_1.z.enum(constant_1.Relationship).meta({
        description: 'describe the relationship from this table to the foreign table',
    }),
    foreignTableId: zod_1.z.string().meta({
        description: 'the table this field is linked to',
    }),
    lookupFieldId: zod_1.z.string().meta({
        description: 'the field in the foreign table that will be displayed as the current field',
    }),
    isOneWay: zod_1.z.boolean().optional().meta({
        description: 'whether the field is a one-way link, when true, it will not generate a symmetric field, it is generally has better performance',
    }),
    fkHostTableName: zod_1.z.string().meta({
        description: 'the table name for storing keys, in many-to-many relationships, keys are stored in a separate intermediate table; in other relationships, keys are stored on one side as needed',
    }),
    selfKeyName: zod_1.z.string().meta({
        description: 'the name of the field that stores the current table primary key',
    }),
    foreignKeyName: zod_1.z.string().meta({
        description: 'The name of the field that stores the foreign table primary key',
    }),
    symmetricFieldId: zod_1.z.string().optional().meta({
        description: 'the symmetric field in the foreign table, empty if the field is a one-way link',
    }),
    filterByViewId: zod_1.z.string().nullable().optional().meta({
        description: 'the view id that limits the number of records in the link field',
    }),
    visibleFieldIds: zod_1.z.array(zod_1.z.string()).nullable().optional().meta({
        description: 'the fields that will be displayed in the link field',
    }),
    filter: filter_1.filterSchema.optional(),
})
    .strip();
exports.linkFieldMetaSchema = zod_1.z.object({
    hasOrderColumn: zod_1.z.boolean().optional().default(false).meta({
        description: 'Whether this link field has an order column for maintaining insertion order. When true, the field uses a separate order column to preserve the order of linked records.',
    }),
});
exports.linkFieldOptionsRoSchema = exports.linkFieldOptionsSchema
    .pick({
    baseId: true,
    relationship: true,
    foreignTableId: true,
    isOneWay: true,
    filterByViewId: true,
    visibleFieldIds: true,
    filter: true,
})
    .extend({
    lookupFieldId: zod_1.z.string().optional(),
});
