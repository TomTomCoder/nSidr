"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalRollupFieldCore = void 0;
const formatting_1 = require("../formatting");
const show_as_1 = require("../show-as");
const formula_field_abstract_1 = require("./abstract/formula.field.abstract");
const conditional_rollup_option_schema_1 = require("./conditional-rollup-option.schema");
const rollup_option_schema_1 = require("./rollup-option.schema");
const rollup_field_1 = require("./rollup.field");
class ConditionalRollupFieldCore extends formula_field_abstract_1.FormulaAbstractCore {
    static defaultOptions(cellValueType) {
        return {
            expression: rollup_option_schema_1.ROLLUP_FUNCTIONS[0],
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            formatting: (0, formatting_1.getDefaultFormatting)(cellValueType),
        };
    }
    static getParsedValueType(expression, cellValueType, isMultipleCellValue) {
        return rollup_field_1.RollupFieldCore.getParsedValueType(expression, cellValueType, isMultipleCellValue);
    }
    type;
    meta;
    getFilter() {
        return this.options?.filter ?? undefined;
    }
    static supportsOrdering(expression) {
        if (!expression)
            return false;
        const match = expression.match(/^(\w+)\(\{values\}\)$/i);
        if (!match)
            return false;
        switch (match[1].toLowerCase()) {
            case 'array_join':
            case 'array_compact':
            case 'array_unique':
            case 'concatenate':
                return true;
            default:
                return false;
        }
    }
    validateOptions() {
        return conditional_rollup_option_schema_1.conditionalRollupFieldOptionsSchema
            .extend({
            formatting: (0, formatting_1.getFormattingSchema)(this.cellValueType),
            showAs: (0, show_as_1.getShowAsSchema)(this.cellValueType, this.isMultipleCellValue),
        })
            .safeParse(this.options);
    }
    getForeignTableId() {
        return this.options?.foreignTableId;
    }
    accept(visitor) {
        return visitor.visitConditionalRollupField(this);
    }
}
exports.ConditionalRollupFieldCore = ConditionalRollupFieldCore;
