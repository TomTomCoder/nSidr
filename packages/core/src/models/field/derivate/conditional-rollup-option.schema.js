"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conditionalRollupFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const filter_1 = require("../../view/filter");
const sort_1 = require("../../view/sort");
const conditional_constants_1 = require("../conditional.constants");
const rollup_option_schema_1 = require("./rollup-option.schema");
exports.conditionalRollupFieldOptionsSchema = rollup_option_schema_1.rollupFieldOptionsSchema.extend({
    baseId: zod_1.z.string().optional(),
    foreignTableId: zod_1.z.string().optional(),
    lookupFieldId: zod_1.z.string().optional(),
    filter: filter_1.filterSchema.optional(),
    sort: zod_1.z
        .object({
        fieldId: zod_1.z.string(),
        order: zod_1.z.enum(sort_1.SortFunc),
    })
        .optional(),
    limit: zod_1.z.number().int().positive().max(conditional_constants_1.CONDITIONAL_QUERY_MAX_LIMIT).optional(),
});
