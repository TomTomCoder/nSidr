"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGroup = exports.groupStringSchema = exports.viewGroupRoSchema = exports.groupSchema = exports.groupItemSchema = void 0;
const zod_1 = require("../../../zod");
const sort_1 = require("../sort");
exports.groupItemSchema = zod_1.z.object({
    fieldId: zod_1.z.string().meta({
        description: 'The id of the field.',
    }),
    order: sort_1.orderSchema,
});
exports.groupSchema = exports.groupItemSchema.array().nullable();
exports.viewGroupRoSchema = zod_1.z.object({
    group: exports.groupSchema.nullable(),
});
exports.groupStringSchema = zod_1.z.string().transform((val, ctx) => {
    let jsonValue;
    try {
        jsonValue = JSON.parse(val);
    }
    catch {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Invalid JSON string',
        });
        return zod_1.z.NEVER;
    }
    return exports.groupSchema.parse(jsonValue);
});
function parseGroup(queryGroup) {
    if (queryGroup == null)
        return;
    const parsedGroup = exports.groupSchema.safeParse(queryGroup);
    return parsedGroup.success ? parsedGroup.data?.slice(0, 3) : undefined;
}
exports.parseGroup = parseGroup;
