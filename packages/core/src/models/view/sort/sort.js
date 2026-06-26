"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeWithDefaultSort = exports.manualSortRoSchema = exports.sortStringSchema = exports.sortSchema = exports.sortItemSchema = exports.orderSchema = void 0;
const zod_1 = require("../../../zod");
const sort_func_enum_1 = require("./sort-func.enum");
exports.orderSchema = zod_1.z.enum(sort_func_enum_1.SortFunc);
exports.sortItemSchema = zod_1.z.object({
    fieldId: zod_1.z.string().meta({
        description: 'The id of the field.',
    }),
    order: exports.orderSchema,
});
exports.sortSchema = zod_1.z
    .object({
    sortObjs: exports.sortItemSchema.array(),
    manualSort: zod_1.z.boolean().optional(),
})
    .nullable();
exports.sortStringSchema = zod_1.z.string().transform((val, ctx) => {
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
    return exports.sortSchema.parse(jsonValue);
});
exports.manualSortRoSchema = zod_1.z.object({
    sortObjs: exports.sortItemSchema.array(),
});
function mergeWithDefaultSort(defaultViewSort, querySort) {
    if (!defaultViewSort && !querySort) {
        return [];
    }
    const parseSort = exports.sortStringSchema.safeParse(defaultViewSort);
    const viewSort = parseSort.success ? parseSort.data : undefined;
    // should clear sort query when sort manually
    if (viewSort?.manualSort && !querySort?.length) {
        return [];
    }
    const mergeSort = viewSort?.sortObjs || [];
    if (querySort?.length) {
        // merge the same fieldId item, query first
        const map = new Map(querySort.map((sortItem) => [sortItem.fieldId, sortItem]));
        mergeSort.forEach((sortItem) => {
            !map.has(sortItem.fieldId) && map.set(sortItem.fieldId, sortItem);
        });
        return Array.from(map.values());
    }
    return mergeSort;
}
exports.mergeWithDefaultSort = mergeWithDefaultSort;
