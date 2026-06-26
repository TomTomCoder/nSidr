"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ganttViewOptionSchema = exports.ganttTimeScaleSchema = void 0;
const zod_1 = require("../../../zod");
exports.ganttTimeScaleSchema = zod_1.z.enum(['day', 'week', 'month', 'quarter']);
exports.ganttViewOptionSchema = zod_1.z.object({
    startField: zod_1.z.string().min(1),
    endField: zod_1.z.string().min(1),
    titleField: zod_1.z.string().optional(),
    dependencyField: zod_1.z.string().optional(),
    colorField: zod_1.z.string().optional(),
    milestoneThreshold: zod_1.z.number().default(0),
    showCriticalPath: zod_1.z.boolean().default(false),
    showWeekends: zod_1.z.boolean().default(true),
    timeScale: exports.ganttTimeScaleSchema.default('week'),
});
