"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnMetaRoSchema = exports.pluginColumnMetaSchema = exports.formColumnMetaSchema = exports.calendarColumnMetaSchema = exports.galleryColumnMetaSchema = exports.kanbanColumnMetaSchema = exports.gridColumnMetaSchema = exports.columnMetaSchema = exports.columnSchema = exports.pluginColumnSchema = exports.formColumnSchema = exports.calendarColumnSchema = exports.galleryColumnSchema = exports.kanbanColumnSchema = exports.gridColumnSchema = exports.columnSchemaBase = exports.fieldsViewVisibleRoSchema = void 0;
const utils_1 = require("../../utils");
const zod_1 = require("../../zod");
const aggregation_1 = require("../aggregation");
exports.fieldsViewVisibleRoSchema = zod_1.z.object({
    viewFields: zod_1.z
        .object({
        fieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field).length(19),
        hidden: zod_1.z.boolean(),
    })
        .array()
        .nonempty(),
});
exports.columnSchemaBase = zod_1.z
    .object({
    order: zod_1.z.number().meta({
        description: 'Order is a floating number, column will sort by it in the view.',
    }),
})
    .meta({
    description: 'A mapping of field IDs to their corresponding column metadata.',
});
exports.gridColumnSchema = exports.columnSchemaBase.extend({
    width: zod_1.z.number().optional().meta({
        description: 'Column width in the view.',
    }),
    hidden: zod_1.z.boolean().optional().meta({
        description: 'If column hidden in the view.',
    }),
    statisticFunc: zod_1.z.enum(aggregation_1.StatisticsFunc).nullable().optional().meta({
        description: 'Statistic function of the column in the view.',
    }),
});
exports.kanbanColumnSchema = exports.columnSchemaBase.extend({
    visible: zod_1.z.boolean().optional().meta({
        description: 'If column visible in the kanban view.',
    }),
});
exports.galleryColumnSchema = exports.columnSchemaBase.extend({
    visible: zod_1.z.boolean().optional().meta({
        description: 'If column visible in the gallery view.',
    }),
});
exports.calendarColumnSchema = exports.columnSchemaBase.extend({
    visible: zod_1.z.boolean().optional().meta({
        description: 'If column visible in the calendar view.',
    }),
});
exports.formColumnSchema = exports.columnSchemaBase.extend({
    visible: zod_1.z.boolean().optional().meta({
        description: 'If column visible in the view.',
    }),
    required: zod_1.z.boolean().optional().meta({
        description: 'If column is required.',
    }),
});
exports.pluginColumnSchema = exports.columnSchemaBase.extend({
    hidden: zod_1.z.boolean().optional().meta({
        description: 'If column hidden in the view.',
    }),
});
exports.columnSchema = zod_1.z.union([
    exports.gridColumnSchema.strict(),
    exports.kanbanColumnSchema.strict(),
    exports.galleryColumnSchema.strict(),
    exports.formColumnSchema.strict(),
    exports.pluginColumnSchema.strict(),
]);
exports.columnMetaSchema = zod_1.z.record(zod_1.z.string().startsWith(utils_1.IdPrefix.Field), exports.columnSchema);
exports.gridColumnMetaSchema = zod_1.z.record(zod_1.z.string().startsWith(utils_1.IdPrefix.Field), exports.gridColumnSchema);
exports.kanbanColumnMetaSchema = zod_1.z.record(zod_1.z.string().startsWith(utils_1.IdPrefix.Field), exports.kanbanColumnSchema);
exports.galleryColumnMetaSchema = zod_1.z.record(zod_1.z.string().startsWith(utils_1.IdPrefix.Field), exports.galleryColumnSchema);
exports.calendarColumnMetaSchema = zod_1.z.record(zod_1.z.string().startsWith(utils_1.IdPrefix.Field), exports.calendarColumnSchema);
exports.formColumnMetaSchema = zod_1.z.record(zod_1.z.string().startsWith(utils_1.IdPrefix.Field), exports.formColumnSchema);
exports.pluginColumnMetaSchema = zod_1.z.record(zod_1.z.string().startsWith(utils_1.IdPrefix.Field), exports.pluginColumnSchema);
exports.columnMetaRoSchema = zod_1.z
    .object({
    fieldId: zod_1.z
        .string()
        .startsWith(utils_1.IdPrefix.Field)
        .describe('Field ID')
        .meta({ description: 'Field ID' }),
    columnMeta: zod_1.z.union([
        exports.gridColumnSchema.partial().strict(),
        exports.kanbanColumnSchema.partial().strict(),
        exports.formColumnSchema.partial().strict(),
        exports.pluginColumnSchema.partial().strict(),
    ]),
})
    .array();
