"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAiOutputSchema = exports.getAiConfigSchema = exports.fieldAIConfigSchema = void 0;
const zod_1 = require("zod");
const constant_1 = require("../constant");
const attachment_1 = require("./attachment");
const date_1 = require("./date");
const multiple_select_1 = require("./multiple-select");
const rating_1 = require("./rating");
const single_select_1 = require("./single-select");
const text_1 = require("./text");
__exportStar(require("./text"), exports);
__exportStar(require("./single-select"), exports);
__exportStar(require("./multiple-select"), exports);
__exportStar(require("./attachment"), exports);
__exportStar(require("./rating"), exports);
__exportStar(require("./date"), exports);
exports.fieldAIConfigSchema = zod_1.z.union([
    text_1.textFieldAIConfigSchema,
    single_select_1.singleSelectFieldAIConfigSchema,
    multiple_select_1.multipleSelectFieldAIConfigSchema,
    attachment_1.attachmentFieldAIConfigSchema,
    rating_1.ratingFieldAIConfigSchema,
    date_1.dateFieldAIConfigSchema,
]);
const getAiConfigSchema = (type) => {
    switch (type) {
        case constant_1.FieldType.SingleLineText:
        case constant_1.FieldType.LongText:
            return text_1.textFieldAIConfigSchema;
        case constant_1.FieldType.SingleSelect:
            return single_select_1.singleSelectFieldAIConfigSchema;
        case constant_1.FieldType.MultipleSelect:
            return multiple_select_1.multipleSelectFieldAIConfigSchema;
        case constant_1.FieldType.Attachment:
            return attachment_1.attachmentFieldAIConfigSchema;
        case constant_1.FieldType.Rating:
        case constant_1.FieldType.Number:
            return rating_1.ratingFieldAIConfigSchema;
        case constant_1.FieldType.Date:
            return date_1.dateFieldAIConfigSchema;
        default:
            return zod_1.z.undefined();
    }
};
exports.getAiConfigSchema = getAiConfigSchema;
/**
 * getAiOutputSchema (per D-16-01)
 *
 * Returns the Zod schema used to validate the LLM-produced cell value BEFORE
 * the value is written to a typed cell. Distinct from getAiConfigSchema, which
 * validates the user-supplied AI config. Dispatch by FieldType; for parametric
 * types (SingleSelect/MultipleSelect/Rating) the schema is built from the
 * field's options at call time.
 */
const getAiOutputSchema = (field) => {
    switch (field.type) {
        case constant_1.FieldType.SingleSelect:
            return (0, single_select_1.buildSingleSelectFieldOutputSchema)(field.options?.choices);
        case constant_1.FieldType.MultipleSelect:
            return (0, multiple_select_1.buildMultipleSelectFieldOutputSchema)(field.options?.choices);
        case constant_1.FieldType.Rating:
            return (0, rating_1.buildRatingFieldOutputSchema)(field.options?.max ?? 5);
        case constant_1.FieldType.Date:
            return date_1.dateFieldOutputSchema;
        case constant_1.FieldType.Attachment:
            return attachment_1.attachmentFieldOutputSchema;
        default:
            return text_1.textFieldOutputSchema;
    }
};
exports.getAiOutputSchema = getAiOutputSchema;
