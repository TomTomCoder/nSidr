"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAbstractCore = exports.userCellValueSchema = void 0;
const zod_1 = require("zod");
const field_1 = require("../../field");
exports.userCellValueSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    email: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().optional().nullable(),
    isSystem: zod_1.z.boolean().optional(),
});
class UserAbstractCore extends field_1.FieldCore {
    cellValueType;
    item2String(value) {
        if (value == null) {
            return '';
        }
        const { title } = value;
        if (this.isMultipleCellValue && title?.includes(',')) {
            return `"${title}"`;
        }
        return title || '';
    }
    cellValue2String(cellValue) {
        if (Array.isArray(cellValue)) {
            return cellValue.map((v) => this.item2String(v)).join(', ');
        }
        return this.item2String(cellValue);
    }
    validateCellValue(cellValue) {
        if (this.isMultipleCellValue) {
            return zod_1.z
                .array(exports.userCellValueSchema)
                .transform((arr) => (arr.length === 0 ? null : arr))
                .nullable()
                .safeParse(cellValue);
        }
        return exports.userCellValueSchema.nullable().safeParse(cellValue);
    }
}
exports.UserAbstractCore = UserAbstractCore;
