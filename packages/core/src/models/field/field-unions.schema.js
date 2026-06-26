"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unionFieldMetaVoSchema = exports.unionFieldOptionsRoSchema = exports.unionFieldOptionsVoSchema = exports.commonOptionsSchema = exports.unionFieldOptions = void 0;
const zod_1 = require("../../zod");
const select_option_schema_1 = require("./derivate/abstract/select-option.schema");
const ai_field_1 = require("./derivate/ai.field");
const attachment_option_schema_1 = require("./derivate/attachment-option.schema");
const auto_number_option_schema_1 = require("./derivate/auto-number-option.schema");
const button_option_schema_1 = require("./derivate/button-option.schema");
const checkbox_option_schema_1 = require("./derivate/checkbox-option.schema");
const conditional_rollup_option_schema_1 = require("./derivate/conditional-rollup-option.schema");
const created_by_option_schema_1 = require("./derivate/created-by-option.schema");
const created_time_option_schema_1 = require("./derivate/created-time-option.schema");
const date_option_schema_1 = require("./derivate/date-option.schema");
const formula_option_schema_1 = require("./derivate/formula-option.schema");
const last_modified_by_option_schema_1 = require("./derivate/last-modified-by-option.schema");
const last_modified_time_option_schema_1 = require("./derivate/last-modified-time-option.schema");
const link_option_schema_1 = require("./derivate/link-option.schema");
const number_option_schema_1 = require("./derivate/number-option.schema");
const rating_option_schema_1 = require("./derivate/rating-option.schema");
const rollup_option_schema_1 = require("./derivate/rollup-option.schema");
const single_line_text_option_schema_1 = require("./derivate/single-line-text-option.schema");
const user_option_schema_1 = require("./derivate/user-option.schema");
const formatting_1 = require("./formatting");
const show_as_1 = require("./show-as");
// Union of all field options that don't have read-only variants
exports.unionFieldOptions = zod_1.z.union([
    rollup_option_schema_1.rollupFieldOptionsSchema.strict(),
    conditional_rollup_option_schema_1.conditionalRollupFieldOptionsSchema.strict(),
    formula_option_schema_1.formulaFieldOptionsSchema.strict(),
    link_option_schema_1.linkFieldOptionsSchema.strict(),
    date_option_schema_1.dateFieldOptionsSchema.strict(),
    checkbox_option_schema_1.checkboxFieldOptionsSchema.strict(),
    attachment_option_schema_1.attachmentFieldOptionsSchema.strict(),
    single_line_text_option_schema_1.singlelineTextFieldOptionsSchema.strict(),
    rating_option_schema_1.ratingFieldOptionsSchema.strict(),
    user_option_schema_1.userFieldOptionsSchema.strict(),
    created_by_option_schema_1.createdByFieldOptionsSchema.strict(),
    last_modified_by_option_schema_1.lastModifiedByFieldOptionsSchema.strict(),
    button_option_schema_1.buttonFieldOptionsSchema.strict(),
    ai_field_1.aiFieldOptionsSchema.strict(),
]);
// Common options schema for lookup fields
exports.commonOptionsSchema = zod_1.z.object({
    showAs: show_as_1.unionShowAsSchema.optional(),
    formatting: formatting_1.unionFormattingSchema.optional(),
});
// Union of all field options for VO (view object) - includes all options
exports.unionFieldOptionsVoSchema = zod_1.z.union([
    exports.unionFieldOptions,
    conditional_rollup_option_schema_1.conditionalRollupFieldOptionsSchema.strict(),
    link_option_schema_1.linkFieldOptionsSchema.strict(),
    select_option_schema_1.selectFieldOptionsSchema.strict(),
    number_option_schema_1.numberFieldOptionsSchema.strict(),
    auto_number_option_schema_1.autoNumberFieldOptionsSchema.strict(),
    created_time_option_schema_1.createdTimeFieldOptionsSchema.strict(),
    last_modified_time_option_schema_1.lastModifiedTimeFieldOptionsSchema,
]);
// Union of all field options for RO (request object) - includes read-only variants
exports.unionFieldOptionsRoSchema = zod_1.z.union([
    exports.unionFieldOptions,
    conditional_rollup_option_schema_1.conditionalRollupFieldOptionsSchema.strict(),
    link_option_schema_1.linkFieldOptionsRoSchema.strict(),
    select_option_schema_1.selectFieldOptionsRoSchema.strict(),
    number_option_schema_1.numberFieldOptionsRoSchema.strict(),
    auto_number_option_schema_1.autoNumberFieldOptionsRoSchema.strict(),
    created_time_option_schema_1.createdTimeFieldOptionsRoSchema.strict(),
    last_modified_time_option_schema_1.lastModifiedTimeFieldOptionsRoSchema,
    exports.commonOptionsSchema.strict(),
]);
// Union field meta schema
exports.unionFieldMetaVoSchema = zod_1.z
    .union([formula_option_schema_1.formulaFieldMetaSchema, link_option_schema_1.linkFieldMetaSchema])
    .optional();
