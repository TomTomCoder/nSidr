"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formulaFieldMetaSchema = exports.formulaFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const formatting_1 = require("../formatting");
const show_as_1 = require("../show-as");
exports.formulaFieldOptionsSchema = zod_1.z.object({
    expression: zod_1.z.string().meta({
        description: 'The formula including fields referenced by their IDs. For example, LEFT(4, {Birthday}) input will be returned as LEFT(4, {fldXXX}) via API.',
    }),
    timeZone: formatting_1.timeZoneStringSchema.optional(),
    formatting: formatting_1.unionFormattingSchema.optional(),
    showAs: show_as_1.unionShowAsSchema.optional(),
});
exports.formulaFieldMetaSchema = zod_1.z.object({
    persistedAsGeneratedColumn: zod_1.z.boolean().optional().default(false).meta({
        description: 'Whether this formula field is persisted as a generated column in the database. When true, the field value is computed and stored as a database generated column.',
    }),
});
