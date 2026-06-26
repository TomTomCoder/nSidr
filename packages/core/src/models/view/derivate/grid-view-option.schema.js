"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gridViewOptionSchema = void 0;
const zod_1 = require("../../../zod");
const constant_1 = require("../constant");
exports.gridViewOptionSchema = zod_1.z
    .object({
    rowHeight: zod_1.z
        .enum(constant_1.RowHeightLevel)
        .optional()
        .meta({ description: 'The row height level of row in view' }),
    fieldNameDisplayLines: zod_1.z
        .number()
        .min(1)
        .max(3)
        .optional()
        .meta({ description: 'The field name display lines in view' }),
    frozenColumnCount: zod_1.z.number().min(0).optional().meta({
        description: 'The frozen column count in view. Deprecated: this field will be removed in a future release and may no longer take effect.',
    }),
    frozenFieldId: zod_1.z
        .string()
        .optional()
        .meta({ description: 'Freeze to the right side of this field id in grid view' }),
})
    .strict();
