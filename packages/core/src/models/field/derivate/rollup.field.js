"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollupFieldCore = exports.rollupCelValueSchema = void 0;
const zod_1 = require("zod");
const visitor_1 = require("../../../formula/visitor");
const formatting_1 = require("../formatting");
const show_as_1 = require("../show-as");
const formula_field_abstract_1 = require("./abstract/formula.field.abstract");
const rollup_option_schema_1 = require("./rollup-option.schema");
exports.rollupCelValueSchema = zod_1.z.any();
class RollupFieldCore extends formula_field_abstract_1.FormulaAbstractCore {
    static defaultOptions(cellValueType) {
        return {
            expression: rollup_option_schema_1.ROLLUP_FUNCTIONS[0],
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            formatting: (0, formatting_1.getDefaultFormatting)(cellValueType),
        };
    }
    static getParsedValueType(expression, cellValueType, isMultipleCellValue) {
        const tree = this.parse(expression);
        // nly need to perform shallow copy to generate virtual field to evaluate the expression
        const clonedInstance = new RollupFieldCore();
        clonedInstance.id = 'values';
        clonedInstance.name = 'values';
        clonedInstance.cellValueType = cellValueType;
        clonedInstance.isMultipleCellValue = isMultipleCellValue;
        // field type is not important here
        const visitor = new visitor_1.EvalVisitor({
            values: clonedInstance,
        });
        const typedValue = visitor.visit(tree);
        return {
            cellValueType: typedValue.type,
            isMultipleCellValue: typedValue.isMultiple,
        };
    }
    type;
    meta;
    validateOptions() {
        return zod_1.z
            .object({
            expression: rollup_option_schema_1.rollupFieldOptionsSchema.shape.expression,
            formatting: (0, formatting_1.getFormattingSchema)(this.cellValueType),
            showAs: (0, show_as_1.getShowAsSchema)(this.cellValueType, this.isMultipleCellValue),
        })
            .safeParse(this.options);
    }
    /**
     * Override to return the foreign table ID for rollup fields
     */
    getForeignTableId() {
        return this.lookupOptions?.foreignTableId;
    }
    accept(visitor) {
        return visitor.visitRollupField(this);
    }
}
exports.RollupFieldCore = RollupFieldCore;
