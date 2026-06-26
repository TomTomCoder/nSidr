"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaAbstractCore = exports.getFormulaCellValueSchema = void 0;
const formula_1 = require("@teable/formula");
const antlr4ts_1 = require("antlr4ts");
const zod_1 = require("zod");
const asserts_1 = require("../../../../asserts");
const visitor_1 = require("../../../../formula/visitor");
const constant_1 = require("../../constant");
const field_1 = require("../../field");
const formatting_1 = require("../../formatting");
const checkbox_field_1 = require("../checkbox.field");
const date_field_1 = require("../date.field");
const number_field_1 = require("../number.field");
const single_line_text_field_1 = require("../single-line-text.field");
const getFormulaCellValueSchema = (cellValueType) => {
    switch (cellValueType) {
        case constant_1.CellValueType.Number:
            return number_field_1.numberCellValueSchema;
        case constant_1.CellValueType.DateTime:
            return date_field_1.dataFieldCellValueSchema;
        case constant_1.CellValueType.String:
            return single_line_text_field_1.singleLineTextCelValueSchema;
        case constant_1.CellValueType.Boolean:
            return checkbox_field_1.booleanCellValueSchema;
        default:
            (0, asserts_1.assertNever)(cellValueType);
    }
};
exports.getFormulaCellValueSchema = getFormulaCellValueSchema;
class FormulaAbstractCore extends field_1.FieldCore {
    static parse(expression) {
        const inputStream = antlr4ts_1.CharStreams.fromString(expression);
        const lexer = new formula_1.FormulaLexer(inputStream);
        const tokenStream = new antlr4ts_1.CommonTokenStream(lexer);
        const parser = new formula_1.Formula(tokenStream);
        parser.removeErrorListeners();
        const errorListener = new formula_1.FormulaErrorListener();
        parser.addErrorListener(errorListener);
        return parser.root();
    }
    options;
    cellValueType;
    _tree;
    get tree() {
        if (this._tree) {
            return this._tree;
        }
        this._tree = FormulaAbstractCore.parse(this.options.expression);
        return this._tree;
    }
    evaluate(dependFieldMap, record) {
        const visitor = new visitor_1.EvalVisitor(dependFieldMap, record);
        return visitor.visit(this.tree);
    }
    cellValue2String(cellValue) {
        if (cellValue == null) {
            return '';
        }
        if (this.isMultipleCellValue) {
            return cellValue.map((v) => this.item2String(v)).join(', ');
        }
        return this.item2String(cellValue);
    }
    // formula do not support
    convertStringToCellValue(_value) {
        return null;
    }
    item2String(value) {
        const formatting = this.options.formatting;
        switch (this.cellValueType) {
            case constant_1.CellValueType.Number:
                return (0, formatting_1.formatNumberToString)(value, formatting || formatting_1.defaultNumberFormatting);
            case constant_1.CellValueType.DateTime:
                return (0, formatting_1.formatDateToString)(value, formatting || formatting_1.defaultDatetimeFormatting);
        }
        return value == null ? '' : String(value);
    }
    // formula do not support
    repair(_value) {
        return null;
    }
    validateCellValue(value) {
        const schema = (0, exports.getFormulaCellValueSchema)(this.cellValueType);
        if (this.isMultipleCellValue) {
            return zod_1.z.array(schema).nullable().safeParse(value);
        }
        return schema.nullable().safeParse(value);
    }
}
exports.FormulaAbstractCore = FormulaAbstractCore;
