"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buttonFieldOptionsSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
const colors_1 = require("../colors");
exports.buttonFieldOptionsSchema = zod_1.z.object({
    label: zod_1.z.string().meta({ description: 'Button label' }),
    color: zod_1.z.enum(colors_1.Colors).meta({ description: 'Button color' }),
    maxCount: zod_1.z.number().optional().meta({ description: 'Max count of button clicks' }),
    resetCount: zod_1.z.boolean().optional().meta({ description: 'Reset count' }),
    workflow: zod_1.z
        .object({
        id: zod_1.z.string().startsWith(utils_1.IdPrefix.Workflow).optional().meta({ description: 'Workflow ID' }),
        name: zod_1.z.string().optional().meta({ description: 'Workflow Name' }),
        isActive: zod_1.z.boolean().optional().meta({ description: 'Workflow is active' }),
    })
        .optional()
        .nullable()
        .meta({ description: 'Workflow' }),
    confirm: zod_1.z
        .object({
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        confirmText: zod_1.z.string().optional(),
    })
        .optional()
        .nullable()
        .meta({ description: 'Confirm config before click' }),
});
