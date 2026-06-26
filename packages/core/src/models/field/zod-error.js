"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFieldOptions = void 0;
/* eslint-disable sonarjs/no-duplicate-string */
const lodash_1 = require("lodash");
const zod_validation_error_1 = require("zod-validation-error");
const filter_1 = require("../view/filter/filter");
const ai_config_1 = require("./ai-config");
const constant_1 = require("./constant");
const field_schema_1 = require("./field.schema");
const lookup_options_base_schema_1 = require("./lookup-options-base.schema");
// eslint-disable-next-line sonarjs/cognitive-complexity
const validateLookupOptions = (data) => {
    const { isLookup, isConditionalLookup, lookupOptions, type } = data;
    const res = [];
    const isRollup = type === constant_1.FieldType.Rollup;
    const needsStandardLookupOptions = (isLookup && !isConditionalLookup) || isRollup;
    const needsConditionalLookupOptions = Boolean(isConditionalLookup);
    const allowsLookupOptions = needsStandardLookupOptions || needsConditionalLookupOptions;
    if (lookupOptions && !allowsLookupOptions) {
        res.push({
            message: 'lookupOptions is not allowed when isLookup attribute is true or field type is rollup.',
            i18nKey: 'sdk:editor.lookup.lookupOptionsNotAllowed',
        });
    }
    if (needsStandardLookupOptions && !lookupOptions) {
        res.push({
            message: 'lookupOptions is required when isLookup attribute is true or field type is rollup.',
            i18nKey: 'sdk:editor.lookup.lookupOptionsRequired',
        });
    }
    if (needsConditionalLookupOptions && !lookupOptions) {
        res.push({
            message: 'lookupOptions is required when lookup is marked as conditional.',
            i18nKey: 'sdk:editor.lookup.lookupOptionsRequired',
        });
    }
    if (!lookupOptions) {
        return res;
    }
    if (needsStandardLookupOptions) {
        if (!(0, lookup_options_base_schema_1.isLinkLookupOptions)(lookupOptions)) {
            res.push({
                path: ['lookupOptions'],
                message: 'linkFieldId is required when isLookup attribute is true or field type is rollup.',
                i18nKey: 'sdk:editor.link.linkFieldIdRequired',
            });
        }
        else {
            if (!(0, lodash_1.isString)(lookupOptions.foreignTableId)) {
                res.push({
                    path: ['lookupOptions'],
                    message: 'foreignTableId is required when isLookup attribute is true or field type is rollup.',
                    i18nKey: 'sdk:editor.link.foreignTableIdRequired',
                });
            }
            if (!(0, lodash_1.isString)(lookupOptions.linkFieldId)) {
                res.push({
                    path: ['lookupOptions'],
                    message: 'linkFieldId is required when isLookup attribute is true or field type is rollup.',
                    i18nKey: 'sdk:editor.link.linkFieldIdRequired',
                });
            }
            if (!(0, lodash_1.isString)(lookupOptions.lookupFieldId)) {
                res.push({
                    path: ['lookupOptions'],
                    message: 'lookupFieldId is required when isLookup attribute is true or field type is rollup.',
                    i18nKey: 'sdk:editor.lookup.lookupFieldIdRequired',
                });
            }
        }
    }
    if (needsConditionalLookupOptions) {
        if ((0, lookup_options_base_schema_1.isLinkLookupOptions)(lookupOptions)) {
            res.push({
                path: ['lookupOptions'],
                message: 'linkFieldId is not allowed when lookup is marked as conditional.',
                i18nKey: 'sdk:editor.lookup.lookupOptionsNotAllowed',
            });
        }
        else {
            if (!(0, lodash_1.isString)(lookupOptions.foreignTableId)) {
                res.push({
                    path: ['lookupOptions'],
                    message: 'foreignTableId is required when lookup is marked as conditional.',
                    i18nKey: 'sdk:editor.link.foreignTableIdRequired',
                });
            }
            if (!(0, lodash_1.isString)(lookupOptions.lookupFieldId)) {
                res.push({
                    path: ['lookupOptions'],
                    message: 'lookupFieldId is required when lookup is marked as conditional.',
                    i18nKey: 'sdk:editor.lookup.lookupFieldIdRequired',
                });
            }
            const filterFieldIds = (0, filter_1.extractFieldIdsFromFilter)(lookupOptions.filter);
            if (!lookupOptions.filter || filterFieldIds.length === 0) {
                res.push({
                    path: ['lookupOptions', 'filter'],
                    message: 'filter is required when lookup is marked as conditional.',
                    i18nKey: 'sdk:editor.conditionalLookup.filterRequired',
                });
            }
        }
    }
    return res;
};
// eslint-disable-next-line sonarjs/cognitive-complexity
const validateOptions = (data) => {
    const { type, options, isLookup } = data;
    const res = [];
    if (isLookup) {
        return res;
    }
    if (type === constant_1.FieldType.Link && !(0, lodash_1.isString)(options?.foreignTableId)) {
        res.push({
            path: ['options'],
            message: 'foreignTableId is required when type is link',
            i18nKey: 'sdk:editor.link.foreignTableIdRequired',
        });
    }
    if (type === constant_1.FieldType.Rollup && !(0, lodash_1.isString)(options?.expression)) {
        res.push({
            path: ['options'],
            message: 'expression is required when type is rollup',
            i18nKey: 'sdk:editor.rollup.expressionRequired',
        });
    }
    if (type === constant_1.FieldType.Formula && !(0, lodash_1.isString)(options?.expression)) {
        res.push({
            path: ['options'],
            message: 'expression is required when type is formula',
            i18nKey: 'sdk:editor.formula.expressionRequired',
        });
    }
    if (type === constant_1.FieldType.ConditionalRollup) {
        const filter = options?.filter;
        const hasFilterConditions = !!filter && (0, filter_1.extractFieldIdsFromFilter)(filter).length > 0;
        if (!hasFilterConditions) {
            res.push({
                path: ['options'],
                message: 'filter is required when type is conditionalRollup',
                i18nKey: 'sdk:editor.conditionalRollup.filterRequired',
            });
        }
    }
    const isSelect = type === constant_1.FieldType.SingleSelect || type === constant_1.FieldType.MultipleSelect;
    if (isSelect &&
        options?.choices?.some((choice) => !(0, lodash_1.isString)(choice.name) || choice.name.trim() === '')) {
        res.push({
            path: ['options'],
            message: 'choice name is not empty when type is singleSelect or multipleSelect',
            i18nKey: 'sdk:editor.select.choicesNameRequired',
        });
    }
    const schema = (0, field_schema_1.getOptionsSchema)(type);
    const shouldValidateSchema = schema && options !== undefined;
    const result = shouldValidateSchema ? schema.safeParse(options) : undefined;
    if (result && !result.success) {
        res.push({
            path: ['options'],
            message: (0, zod_validation_error_1.fromZodError)(result.error).message,
            i18nKey: 'sdk:editor.error.refineOptionsError',
            context: {
                message: (0, zod_validation_error_1.fromZodError)(result.error).message,
            },
        });
    }
    return res;
};
const validateAIConfig = (data) => {
    const { aiConfig, type } = data;
    const res = [];
    if (!aiConfig || typeof aiConfig !== 'object') {
        return res;
    }
    const hasModelKey = (0, lodash_1.isString)(aiConfig.modelKey);
    if (!hasModelKey) {
        res.push({
            path: ['aiConfig'],
            message: 'modelKey is required when aiConfig is not null',
            i18nKey: 'sdk:editor.aiConfig.modelKeyRequired',
        });
    }
    const { type: aiConfigType } = aiConfig;
    switch (aiConfigType) {
        case ai_config_1.FieldAIActionType.Extraction:
        case ai_config_1.FieldAIActionType.Summary:
        case ai_config_1.FieldAIActionType.Improvement:
        case ai_config_1.FieldAIActionType.Classification:
        case ai_config_1.FieldAIActionType.Tag:
        case ai_config_1.FieldAIActionType.ImageGeneration:
        case ai_config_1.FieldAIActionType.Rating: {
            if (!(0, lodash_1.isString)(aiConfig.sourceFieldId)) {
                res.push({
                    path: ['aiConfig'],
                    message: `sourceFieldId is required when aiConfig type is ${aiConfigType}`,
                    i18nKey: 'sdk:editor.aiConfig.sourceFieldIdRequired',
                });
            }
            break;
        }
        case ai_config_1.FieldAIActionType.Translation:
            if (!(0, lodash_1.isString)(aiConfig.sourceFieldId)) {
                res.push({
                    path: ['aiConfig'],
                    message: `sourceFieldId is required when aiConfig type is ${aiConfigType}`,
                    i18nKey: 'sdk:editor.aiConfig.sourceFieldIdRequired',
                });
            }
            if (!(0, lodash_1.isString)(aiConfig.targetLanguage)) {
                res.push({
                    path: ['aiConfig'],
                    message: `targetLanguage is required when aiConfig type is ${aiConfigType}`,
                    i18nKey: 'sdk:editor.aiConfig.targetLanguageRequired',
                });
            }
            break;
        case ai_config_1.FieldAIActionType.Customization:
        case ai_config_1.FieldAIActionType.ImageCustomization: {
            if (!(0, lodash_1.isString)(aiConfig.prompt)) {
                res.push({
                    path: ['aiConfig'],
                    message: `prompt is required when aiConfig type is ${aiConfigType}`,
                    i18nKey: 'sdk:editor.aiConfig.promptRequired',
                });
            }
            break;
        }
        default:
            res.push({
                path: ['aiConfig'],
                message: `aiConfig type: ${aiConfigType} is not supported`,
                i18nKey: 'sdk:editor.aiConfig.typeNotSupported',
                context: {
                    type: aiConfigType,
                },
            });
            break;
    }
    const aiConfigSchema = (0, ai_config_1.getAiConfigSchema)(type);
    const result = aiConfigSchema.safeParse(aiConfig);
    if (!result.success) {
        res.push({
            path: ['aiConfig'],
            message: `RefineAICofigError: ${(0, zod_validation_error_1.fromZodError)(result.error).message}`,
            i18nKey: 'sdk:editor.error.refineAICofigError',
            context: {
                message: (0, zod_validation_error_1.fromZodError)(result.error).message,
            },
        });
    }
    return res;
};
const validateFieldOptions = (data) => {
    const validateLookupOptionsRes = validateLookupOptions(data);
    const validateOptionsRes = validateOptions(data);
    const validateAIConfigRes = validateAIConfig(data);
    return [...validateLookupOptionsRes, ...validateOptionsRes, ...validateAIConfigRes];
};
exports.validateFieldOptions = validateFieldOptions;
