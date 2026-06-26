"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConditionalLookupOptions = exports.isLinkLookupOptions = exports.lookupOptionsRoSchema = exports.lookupOptionsVoSchema = void 0;
const zod_1 = require("../../zod");
const filter_1 = require("../view/filter");
const sort_1 = require("../view/sort");
const conditional_constants_1 = require("./conditional.constants");
const constant_1 = require("./constant");
const lookupLinkOptionsVoSchema = zod_1.z.object({
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
    fkHostTableName: zod_1.z.string().meta({
        description: 'the table name for storing keys, in many-to-many relationships, keys are stored in a separate intermediate table; in other relationships, keys are stored on one side as needed',
    }),
    selfKeyName: zod_1.z.string().meta({
        description: 'the name of the field that stores the current table primary key',
    }),
    foreignKeyName: zod_1.z.string().meta({
        description: 'The name of the field that stores the foreign table primary key',
    }),
    filterByViewId: zod_1.z.string().nullable().optional().meta({
        description: 'Optional foreign view used to filter lookup candidates.',
    }),
    visibleFieldIds: zod_1.z.array(zod_1.z.string()).nullable().optional().meta({
        description: 'Optional foreign fields shown when presenting lookup-linked records.',
    }),
    isOneWay: zod_1.z.boolean().optional().meta({
        description: 'Whether the underlying relationship is stored as one-way. Present in some persisted lookup payloads.',
    }),
    symmetricFieldId: zod_1.z.string().optional().meta({
        description: 'Optional symmetric link field id preserved on some lookup payloads for compatibility.',
    }),
    filter: filter_1.filterSchema.optional(),
    linkFieldId: zod_1.z.string().meta({
        description: 'The id of Linked record field to use for lookup',
    }),
});
const lookupLinkOptionsRoSchema = lookupLinkOptionsVoSchema.pick({
    foreignTableId: true,
    lookupFieldId: true,
    linkFieldId: true,
    filter: true,
});
const lookupLinkOptionsRoKeys = new Set([
    'foreignTableId',
    'lookupFieldId',
    'linkFieldId',
    'filter',
]);
const lookupLinkOptionsVoOnlyKeys = new Set([
    'baseId',
    'relationship',
    'fkHostTableName',
    'selfKeyName',
    'foreignKeyName',
    'filterByViewId',
    'visibleFieldIds',
    'isOneWay',
    'symmetricFieldId',
]);
const normalizeLookupOptionsRoInput = (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return input;
    }
    const lookupOptions = input;
    if (!('linkFieldId' in lookupOptions)) {
        return input;
    }
    const extraKeys = Object.keys(lookupOptions).filter((key) => !lookupLinkOptionsRoKeys.has(key));
    if (!extraKeys.length || extraKeys.some((key) => !lookupLinkOptionsVoOnlyKeys.has(key))) {
        return input;
    }
    return Object.fromEntries(Object.entries(lookupOptions).filter(([key]) => lookupLinkOptionsRoKeys.has(key)));
};
const lookupConditionalOptionsVoSchema = zod_1.z.object({
    baseId: zod_1.z.string().optional().meta({
        description: 'the base id of the table that this field is linked to, only required for cross base link',
    }),
    foreignTableId: zod_1.z.string().meta({
        description: 'the table this field is linked to',
    }),
    lookupFieldId: zod_1.z.string().meta({
        description: 'the field in the foreign table that will be displayed as the current field',
    }),
    filter: filter_1.filterSchema.meta({
        description: 'Filter to apply when resolving conditional lookup values.',
    }),
    sort: zod_1.z
        .object({
        fieldId: zod_1.z.string().meta({
            description: 'The field in the foreign table used to order lookup records.',
        }),
        order: zod_1.z
            .enum(sort_1.SortFunc)
            .meta({ description: 'Ordering direction to apply to the sorted field.' }),
    })
        .optional()
        .meta({
        description: 'Optional sort configuration applied before aggregating lookup values.',
    }),
    limit: zod_1.z.number().int().positive().max(conditional_constants_1.CONDITIONAL_QUERY_MAX_LIMIT).optional().meta({
        description: 'Maximum number of matching records to include in the lookup result.',
    }),
});
const lookupConditionalOptionsRoSchema = lookupConditionalOptionsVoSchema;
// Helper function for lookup options error handling
function getLookupOptionsError(input) {
    // Check for common mistake: expression in lookupOptions
    if ('expression' in input) {
        return 'Rollup field configuration error: "expression" (e.g., "sum({values})") should be in "options", not "lookupOptions". lookupOptions should contain: { linkFieldId, lookupFieldId, foreignTableId } for link lookup, or { foreignTableId, lookupFieldId, filter } for conditional lookup';
    }
    // Determine which schema to use based on discriminator
    // Link lookup has linkFieldId, conditional lookup has filter
    const hasLinkFieldId = 'linkFieldId' in input;
    const hasFilter = 'filter' in input;
    let targetSchema;
    let schemaType;
    if (hasLinkFieldId) {
        targetSchema = lookupLinkOptionsVoSchema.strict();
        schemaType = 'Link lookup';
    }
    else if (hasFilter) {
        targetSchema = lookupConditionalOptionsVoSchema.strict();
        schemaType = 'Conditional lookup';
    }
    else {
        return 'Lookup options must be either link lookup (with linkFieldId) or conditional lookup (with filter)';
    }
    // Parse with specific schema to get accurate error
    const result = targetSchema.safeParse(input);
    if (!result.success) {
        return `${schemaType} error: ${result.error.issues[0].message}`;
    }
    return undefined;
}
exports.lookupOptionsVoSchema = zod_1.z.union([lookupLinkOptionsVoSchema.strict(), lookupConditionalOptionsVoSchema.strict()], {
    error: (issue) => {
        if (issue.input && typeof issue.input === 'object') {
            return getLookupOptionsError(issue.input);
        }
        return undefined;
    },
});
exports.lookupOptionsRoSchema = zod_1.z.preprocess(normalizeLookupOptionsRoInput, zod_1.z.union([lookupLinkOptionsRoSchema.strict(), lookupConditionalOptionsRoSchema.strict()], {
    error: (issue) => {
        if (issue.input && typeof issue.input === 'object') {
            const input = issue.input;
            // Check for common mistake first
            if ('expression' in input) {
                return 'Rollup field configuration error: "expression" (e.g., "sum({values})") should be in "options", not "lookupOptions". lookupOptions should contain: { linkFieldId, lookupFieldId, foreignTableId }';
            }
            // Determine schema based on discriminator
            const hasLinkFieldId = 'linkFieldId' in input;
            const hasFilter = 'filter' in input;
            let targetSchema;
            let schemaType;
            if (hasLinkFieldId) {
                targetSchema = lookupLinkOptionsRoSchema.strict();
                schemaType = 'Link lookup';
            }
            else if (hasFilter) {
                targetSchema = lookupConditionalOptionsRoSchema.strict();
                schemaType = 'Conditional lookup';
            }
            else {
                return 'Lookup options must be either link lookup (with linkFieldId) or conditional lookup (with filter)';
            }
            // Parse with specific schema
            const result = targetSchema.safeParse(input);
            if (!result.success) {
                return `${schemaType} error: ${result.error.issues[0].message}`;
            }
        }
        return undefined;
    },
}));
const isLinkLookupOptions = (options) => {
    return Boolean(options && typeof options === 'object' && 'linkFieldId' in options);
};
exports.isLinkLookupOptions = isLinkLookupOptions;
const isConditionalLookupOptions = (options) => {
    return Boolean(options && typeof options === 'object' && !('linkFieldId' in options));
};
exports.isConditionalLookupOptions = isConditionalLookupOptions;
