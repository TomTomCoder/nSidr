"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeParseOptions = void 0;
const asserts_1 = require("../../asserts");
const constant_1 = require("./constant");
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
const long_text_option_schema_1 = require("./derivate/long-text-option.schema");
const number_option_schema_1 = require("./derivate/number-option.schema");
const rating_option_schema_1 = require("./derivate/rating-option.schema");
const rollup_option_schema_1 = require("./derivate/rollup-option.schema");
const single_line_text_option_schema_1 = require("./derivate/single-line-text-option.schema");
const user_option_schema_1 = require("./derivate/user-option.schema");
function safeParseOptions(fieldType, value) {
    switch (fieldType) {
        case constant_1.FieldType.SingleLineText:
            return single_line_text_option_schema_1.singlelineTextFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.LongText:
            return long_text_option_schema_1.longTextFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Number:
            return number_option_schema_1.numberFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.SingleSelect:
            return select_option_schema_1.selectFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.MultipleSelect:
            return select_option_schema_1.selectFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Date:
            return date_option_schema_1.dateFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Attachment:
            return attachment_option_schema_1.attachmentFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Link:
            return link_option_schema_1.linkFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.User:
            return user_option_schema_1.userFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Checkbox:
            return checkbox_option_schema_1.checkboxFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Rating:
            return rating_option_schema_1.ratingFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Formula:
            return formula_option_schema_1.formulaFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.AutoNumber:
            return auto_number_option_schema_1.autoNumberFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.CreatedTime:
            return created_time_option_schema_1.createdTimeFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.LastModifiedTime:
            return last_modified_time_option_schema_1.lastModifiedTimeFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.CreatedBy:
            return created_by_option_schema_1.createdByFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.LastModifiedBy:
            return last_modified_by_option_schema_1.lastModifiedByFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Rollup:
            return rollup_option_schema_1.rollupFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.ConditionalRollup:
            return conditional_rollup_option_schema_1.conditionalRollupFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Button:
            return button_option_schema_1.buttonFieldOptionsSchema.safeParse(value);
        case constant_1.FieldType.Ai:
            return ai_field_1.aiFieldOptionsSchema.safeParse(value);
        default:
            (0, asserts_1.assertNever)(fieldType);
    }
}
exports.safeParseOptions = safeParseOptions;
