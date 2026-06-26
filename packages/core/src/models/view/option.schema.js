"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptionsType = exports.viewOptionsSchema = void 0;
const zod_1 = require("../../zod");
const constant_1 = require("./constant");
const calendar_view_option_schema_1 = require("./derivate/calendar-view-option.schema");
const form_view_option_schema_1 = require("./derivate/form-view-option.schema");
const gallery_view_option_schema_1 = require("./derivate/gallery-view-option.schema");
const gantt_view_option_schema_1 = require("./derivate/gantt-view-option.schema");
const grid_view_option_schema_1 = require("./derivate/grid-view-option.schema");
const kanban_view_option_schema_1 = require("./derivate/kanban-view-option.schema");
const plugin_view_option_schema_1 = require("./derivate/plugin-view-option.schema");
exports.viewOptionsSchema = zod_1.z.union([
    grid_view_option_schema_1.gridViewOptionSchema,
    kanban_view_option_schema_1.kanbanViewOptionSchema,
    gallery_view_option_schema_1.galleryViewOptionSchema,
    calendar_view_option_schema_1.calendarViewOptionSchema,
    form_view_option_schema_1.formViewOptionSchema,
    plugin_view_option_schema_1.pluginViewOptionSchema,
    gantt_view_option_schema_1.ganttViewOptionSchema,
]);
// Re-export for convenience
const validateOptionsType = (type, optionsString) => {
    switch (type) {
        case constant_1.ViewType.Grid:
            grid_view_option_schema_1.gridViewOptionSchema.parse(optionsString);
            break;
        case constant_1.ViewType.Kanban:
            kanban_view_option_schema_1.kanbanViewOptionSchema.parse(optionsString);
            break;
        case constant_1.ViewType.Gallery:
            gallery_view_option_schema_1.galleryViewOptionSchema.parse(optionsString);
            break;
        case constant_1.ViewType.Calendar:
            calendar_view_option_schema_1.calendarViewOptionSchema.parse(optionsString);
            break;
        case constant_1.ViewType.Form:
            form_view_option_schema_1.formViewOptionSchema.parse(optionsString);
            break;
        case constant_1.ViewType.Plugin:
            plugin_view_option_schema_1.pluginViewOptionSchema.parse(optionsString);
            break;
        case constant_1.ViewType.Gantt:
            gantt_view_option_schema_1.ganttViewOptionSchema.parse(optionsString);
            break;
        default:
            throw new Error(`Unsupported view type: ${type}`);
    }
};
exports.validateOptionsType = validateOptionsType;
