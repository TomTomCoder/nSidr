"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiFieldCore = exports.aiFieldOptionsSchema = void 0;
const zod_1 = require("zod");
const field_1 = require("../field");
exports.aiFieldOptionsSchema = zod_1.z.object({
    prompt: zod_1.z.string().optional(),
    sourceFieldIds: zod_1.z.array(zod_1.z.string()).optional(),
});
class AiFieldCore extends field_1.FieldCore {
    type;
    options;
    meta;
    cellValueType;
    cellValue2String(value) {
        return value == null ? '' : String(value);
    }
    item2String(value) {
        return this.cellValue2String(value);
    }
    convertStringToCellValue(value) {
        return value == null ? null : value;
    }
    repair(value) {
        if (typeof value === 'string')
            return value;
        return null;
    }
    validateOptions() {
        return exports.aiFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(value) {
        return zod_1.z.string().nullable().optional().safeParse(value);
    }
    accept(visitor) {
        return visitor.visitAiField(this);
    }
}
exports.AiFieldCore = AiFieldCore;
