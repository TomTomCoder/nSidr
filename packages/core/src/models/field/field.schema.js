"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldsQuerySchema = exports.updateFieldRoSchema = exports.createFieldRoSchema = exports.convertFieldRoSchema = exports.getOptionsSchema = exports.FIELD_VO_PROPERTIES = exports.FIELD_RO_PROPERTIES = exports.fieldVoSchema = void 0;
const asserts_1 = require("../../asserts");
const utils_1 = require("../../utils");
const zod_1 = require("../../zod");
const ai_config_1 = require("./ai-config");
const constant_1 = require("./constant");
const select_field_abstract_1 = require("./derivate/abstract/select.field.abstract");
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
const field_unions_schema_1 = require("./field-unions.schema");
const lookup_options_base_schema_1 = require("./lookup-options-base.schema");
const zod_error_1 = require("./zod-error");
// All union schemas and types are now imported from field-unions.schema.ts
const optionalFieldVoProperty = (schema) => zod_1.z.preprocess((value) => (value === null ? undefined : value), schema.optional());
exports.fieldVoSchema = zod_1.z.object({
    id: zod_1.z.string().startsWith(utils_1.IdPrefix.Field).meta({
        description: 'The id of the field.',
    }),
    name: zod_1.z.string().meta({
        description: 'The name of the field. can not be duplicated in the table.',
        example: 'Tags',
    }),
    type: zod_1.z.enum(constant_1.FieldType).meta({
        description: 'The field types supported by teable.',
        example: constant_1.FieldType.SingleSelect,
    }),
    description: optionalFieldVoProperty(zod_1.z.string()).meta({
        description: 'The description of the field.',
        example: 'this is a summary',
    }),
    options: field_unions_schema_1.unionFieldOptionsVoSchema.meta({
        description: "The configuration options of the field. The structure of the field's options depend on the field's type.",
    }),
    meta: optionalFieldVoProperty(field_unions_schema_1.unionFieldMetaVoSchema).meta({
        description: "The metadata of the field. The structure of the field's meta depend on the field's type. Currently formula and link fields have meta.",
    }),
    aiConfig: ai_config_1.fieldAIConfigSchema.nullable().optional().meta({
        description: 'The AI configuration of the field.',
    }),
    isLookup: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Whether this field is lookup field. witch means cellValue and [fieldType] is looked up from the linked table.',
    }),
    isConditionalLookup: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Whether this lookup field applies a conditional filter when resolving linked records.',
    }),
    lookupOptions: optionalFieldVoProperty(lookup_options_base_schema_1.lookupOptionsVoSchema).meta({
        description: 'field lookup options.',
    }),
    notNull: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Whether this field is not null.',
    }),
    unique: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Whether this field is not unique.',
    }),
    isPrimary: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Whether this field is primary field.',
    }),
    isComputed: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Whether this field is computed field, you can not modify cellValue in computed field.',
    }),
    isPending: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: "Whether this field's calculation is pending.",
    }),
    hasError: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: "Whether This field has a configuration error. Check the fields referenced by this field's formula or configuration.",
    }),
    cellValueType: zod_1.z.enum(constant_1.CellValueType).meta({
        description: 'The cell value type of the field.',
    }),
    isMultipleCellValue: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Whether this field has multiple cell value.',
    }),
    dbFieldType: zod_1.z.enum(constant_1.DbFieldType).meta({
        description: 'The field type of database that cellValue really store.',
    }),
    dbFieldName: zod_1.z
        .string()
        .min(1, { message: 'name cannot be empty' })
        .regex(/^\w{0,63}$/, {
        message: 'Invalid name format',
    })
        .meta({
        description: 'Field(column) name in backend database. Limitation: 1-63 characters, can only contain letters, numbers and underscore, case sensitive, cannot be duplicated with existing db field name in the table.',
    }),
    recordRead: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Field record read permission. When set to false, reading records is denied. When true or not set, reading records is allowed.',
    }),
    recordCreate: optionalFieldVoProperty(zod_1.z.boolean()).meta({
        description: 'Field record create permission. When set to false, creating records is denied. When true or not set, creating records is allowed.',
    }),
});
exports.FIELD_RO_PROPERTIES = [
    'type',
    'name',
    'dbFieldName',
    'isLookup',
    'isConditionalLookup',
    'description',
    'lookupOptions',
    'options',
];
exports.FIELD_VO_PROPERTIES = [
    'type',
    'description',
    'options',
    'meta',
    'aiConfig',
    'name',
    'isLookup',
    'isConditionalLookup',
    'lookupOptions',
    'notNull',
    'unique',
    'isPrimary',
    'isComputed',
    'isPending',
    'hasError',
    'cellValueType',
    'isMultipleCellValue',
    'dbFieldType',
    'dbFieldName',
    'recordRead',
    'recordCreate',
];
/**
 * make sure FIELD_VO_PROPERTIES is exactly equals IFieldVo
 * if here shows lint error, you should update FIELD_VO_PROPERTI ES
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
const _validator2 = true;
/* eslint-enable @typescript-eslint/no-unused-vars */
const getOptionsSchema = (type) => {
    switch (type) {
        case constant_1.FieldType.SingleLineText:
            return single_line_text_option_schema_1.singlelineTextFieldOptionsSchema;
        case constant_1.FieldType.LongText:
            return long_text_option_schema_1.longTextFieldOptionsSchema;
        case constant_1.FieldType.User:
            return user_option_schema_1.userFieldOptionsSchema;
        case constant_1.FieldType.Attachment:
            return attachment_option_schema_1.attachmentFieldOptionsSchema;
        case constant_1.FieldType.Checkbox:
            return checkbox_option_schema_1.checkboxFieldOptionsSchema;
        case constant_1.FieldType.MultipleSelect:
            return select_field_abstract_1.selectFieldOptionsRoSchema;
        case constant_1.FieldType.SingleSelect:
            return select_field_abstract_1.selectFieldOptionsRoSchema;
        case constant_1.FieldType.Date:
            return date_option_schema_1.dateFieldOptionsSchema;
        case constant_1.FieldType.Number:
            return number_option_schema_1.numberFieldOptionsRoSchema;
        case constant_1.FieldType.Rating:
            return rating_option_schema_1.ratingFieldOptionsSchema;
        case constant_1.FieldType.Formula:
            return formula_option_schema_1.formulaFieldOptionsSchema;
        case constant_1.FieldType.Rollup:
            return rollup_option_schema_1.rollupFieldOptionsSchema;
        case constant_1.FieldType.ConditionalRollup:
            return conditional_rollup_option_schema_1.conditionalRollupFieldOptionsSchema;
        case constant_1.FieldType.Link:
            return link_option_schema_1.linkFieldOptionsRoSchema;
        case constant_1.FieldType.CreatedTime:
            return created_time_option_schema_1.createdTimeFieldOptionsRoSchema;
        case constant_1.FieldType.LastModifiedTime:
            return last_modified_time_option_schema_1.lastModifiedTimeFieldOptionsRoSchema;
        case constant_1.FieldType.AutoNumber:
            return auto_number_option_schema_1.autoNumberFieldOptionsRoSchema;
        case constant_1.FieldType.CreatedBy:
            return created_by_option_schema_1.createdByFieldOptionsSchema;
        case constant_1.FieldType.LastModifiedBy:
            return last_modified_by_option_schema_1.lastModifiedByFieldOptionsSchema;
        case constant_1.FieldType.Button:
            return button_option_schema_1.buttonFieldOptionsSchema;
        case constant_1.FieldType.Ai:
            return ai_field_1.aiFieldOptionsSchema;
        default:
            (0, asserts_1.assertNever)(type);
    }
};
exports.getOptionsSchema = getOptionsSchema;
const refineOptions = (data, ctx) => {
    if (data.isConditionalLookup && !data.isLookup) {
        ctx.addIssue({
            path: ['isConditionalLookup'],
            code: 'custom',
            message: 'isConditionalLookup requires isLookup to be true.',
        });
    }
    const validateRes = (0, zod_error_1.validateFieldOptions)(data);
    validateRes.forEach((item) => {
        ctx.addIssue({
            path: item.path,
            code: 'custom',
            message: item.message,
        });
    });
    // Validate aiConfig matches field type
    if (data.aiConfig != null) {
        const aiConfigSchema = (0, ai_config_1.getAiConfigSchema)(data.type);
        const result = aiConfigSchema.safeParse(data.aiConfig);
        if (!result.success) {
            result.error.issues.forEach((issue) => {
                ctx.addIssue({
                    ...issue,
                    path: ['aiConfig', ...issue.path],
                });
            });
        }
    }
};
const baseFieldRoSchema = exports.fieldVoSchema
    .partial()
    .pick({
    type: true,
    name: true,
    unique: true,
    notNull: true,
    dbFieldName: true,
    isLookup: true,
    isConditionalLookup: true,
    description: true,
})
    .required({
    type: true,
})
    .extend({
    name: exports.fieldVoSchema.shape.name.min(1).optional(),
    description: exports.fieldVoSchema.shape.description.nullable().optional(),
    lookupOptions: lookup_options_base_schema_1.lookupOptionsRoSchema.optional().meta({
        description: 'The lookup options for field, you need to configure it when isLookup attribute is true or field type is rollup.',
    }),
    options: field_unions_schema_1.unionFieldOptionsRoSchema.optional().meta({
        description: "The options of the field. The configuration of the field's options depend on the it's specific type.",
    }),
    aiConfig: ai_config_1.fieldAIConfigSchema.nullable().optional().meta({
        description: 'The AI configuration of the field.',
    }),
});
exports.convertFieldRoSchema = baseFieldRoSchema
    .extend({
    options: baseFieldRoSchema.shape.options.nullable().optional(),
})
    .superRefine(refineOptions);
exports.createFieldRoSchema = baseFieldRoSchema
    .extend({
    id: zod_1.z.string().startsWith(utils_1.IdPrefix.Field).optional().meta({
        description: 'The id of the field that start with "fld", followed by exactly 16 alphanumeric characters `/^fld[\\da-zA-Z]{16}$/`. It is sometimes useful to specify an id at creation time',
        example: 'fldxxxxxxxxxxxxxxxx',
    }),
    viewId: zod_1.z.string().startsWith(utils_1.IdPrefix.View).optional().meta({
        description: 'The id of the current view where the field is being created. Used to prevent auto-hiding the new field in this view.',
    }),
    order: zod_1.z
        .object({
        viewId: zod_1.z.string().meta({
            description: 'You can only specify order in one view when create field',
        }),
        orderIndex: zod_1.z.number(),
    })
        .optional(),
})
    .superRefine(refineOptions);
exports.updateFieldRoSchema = zod_1.z.object({
    name: baseFieldRoSchema.shape.name,
    description: baseFieldRoSchema.shape.description,
    dbFieldName: baseFieldRoSchema.shape.dbFieldName,
});
exports.getFieldsQuerySchema = zod_1.z.object({
    viewId: zod_1.z.string().startsWith(utils_1.IdPrefix.View).optional().meta({
        description: 'The id of the view.',
    }),
    filterHidden: zod_1.z.coerce.boolean().optional(),
    projection: zod_1.z.array(zod_1.z.string().startsWith(utils_1.IdPrefix.Field)).optional().meta({
        description: 'If you want to get only some fields, pass in this parameter, otherwise all visible fields will be obtained',
    }),
});
