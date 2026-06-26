"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEW_JSON_KEYS = exports.viewRoSchema = exports.viewVoSchema = exports.shareViewMetaSchema = exports.sharePasswordSchema = void 0;
const utils_1 = require("../../utils");
const zod_1 = require("../../zod");
const column_meta_schema_1 = require("./column-meta.schema");
const constant_1 = require("./constant");
const calendar_view_option_schema_1 = require("./derivate/calendar-view-option.schema");
const form_view_option_schema_1 = require("./derivate/form-view-option.schema");
const gallery_view_option_schema_1 = require("./derivate/gallery-view-option.schema");
const gantt_view_option_schema_1 = require("./derivate/gantt-view-option.schema");
const grid_view_option_schema_1 = require("./derivate/grid-view-option.schema");
const kanban_view_option_schema_1 = require("./derivate/kanban-view-option.schema");
const plugin_view_option_schema_1 = require("./derivate/plugin-view-option.schema");
const filter_1 = require("./filter");
const group_1 = require("./group");
const option_schema_1 = require("./option.schema");
const sort_1 = require("./sort");
exports.sharePasswordSchema = zod_1.z.string().min(3);
exports.shareViewMetaSchema = zod_1.z.object({
    allowCopy: zod_1.z.boolean().optional(),
    includeHiddenField: zod_1.z.boolean().optional(),
    password: exports.sharePasswordSchema.optional(),
    includeRecords: zod_1.z.boolean().optional(),
    submit: zod_1.z
        .object({
        allow: zod_1.z.boolean().optional(),
        requireLogin: zod_1.z.boolean().optional(),
    })
        .optional(),
});
exports.viewVoSchema = zod_1.z.object({
    id: zod_1.z.string().startsWith(utils_1.IdPrefix.View),
    name: zod_1.z.string(),
    type: zod_1.z.enum(constant_1.ViewType),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().optional(),
    options: option_schema_1.viewOptionsSchema.optional(),
    sort: sort_1.sortSchema.optional(),
    filter: filter_1.filterSchema.optional(),
    group: group_1.groupSchema.optional(),
    isLocked: zod_1.z.boolean().optional(),
    shareId: zod_1.z.string().optional(),
    enableShare: zod_1.z.boolean().optional(),
    shareMeta: exports.shareViewMetaSchema.optional(),
    createdBy: zod_1.z.string(),
    lastModifiedBy: zod_1.z.string().optional(),
    createdTime: zod_1.z.string(),
    lastModifiedTime: zod_1.z.string().optional(),
    columnMeta: column_meta_schema_1.columnMetaSchema.meta({
        description: 'A mapping of view IDs to their corresponding column metadata.',
    }),
    pluginId: zod_1.z.string().optional(),
});
exports.viewRoSchema = exports.viewVoSchema
    .omit({
    id: true,
    pluginId: true,
    createdBy: true,
    lastModifiedBy: true,
    createdTime: true,
    lastModifiedTime: true,
})
    .partial({
    name: true,
    order: true,
    columnMeta: true,
    isLocked: true,
})
    .superRefine((data, ctx) => {
    const { type } = data;
    const optionsSchemaMap = {
        [constant_1.ViewType.Form]: form_view_option_schema_1.formViewOptionSchema,
        [constant_1.ViewType.Kanban]: kanban_view_option_schema_1.kanbanViewOptionSchema,
        [constant_1.ViewType.Gallery]: gallery_view_option_schema_1.galleryViewOptionSchema,
        [constant_1.ViewType.Calendar]: calendar_view_option_schema_1.calendarViewOptionSchema,
        [constant_1.ViewType.Grid]: grid_view_option_schema_1.gridViewOptionSchema,
        [constant_1.ViewType.Plugin]: plugin_view_option_schema_1.pluginViewOptionSchema,
        [constant_1.ViewType.Gantt]: gantt_view_option_schema_1.ganttViewOptionSchema,
    };
    if (!(type in optionsSchemaMap)) {
        return ctx.addIssue({
            path: ['options'],
            code: zod_1.z.ZodIssueCode.custom,
            message: `Unknown view type: ${type}`,
        });
    }
    const optionsSchema = optionsSchemaMap[type];
    const result = type === constant_1.ViewType.Plugin
        ? optionsSchema.safeParse(data.options)
        : optionsSchema.optional().safeParse(data.options);
    if (!result.success) {
        const issue = result.error.issues[0];
        ctx.addIssue(issue
            ? { ...issue, path: ['options'] }
            : {
                path: ['options'],
                code: zod_1.z.ZodIssueCode.custom,
                message: `${result.error.message}`,
            });
    }
});
exports.VIEW_JSON_KEYS = ['options', 'sort', 'filter', 'group', 'shareMeta', 'columnMeta'];
