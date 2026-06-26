"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvalVisitor = void 0;
const formula_1 = require("@teable/formula");
const AbstractParseTreeVisitor_1 = require("antlr4ts/tree/AbstractParseTreeVisitor");
const constant_1 = require("../models/field/constant");
const function_aliases_1 = require("./function-aliases");
const common_1 = require("./functions/common");
const factory_1 = require("./functions/factory");
const logical_1 = require("./functions/logical");
const typed_value_1 = require("./typed-value");
const typed_value_converter_1 = require("./typed-value-converter");
const formulaBaseError = new typed_value_1.TypedValue(new logical_1.FormulaBaseError(), constant_1.CellValueType.String, false);
class EvalVisitor extends AbstractParseTreeVisitor_1.AbstractParseTreeVisitor {
    dependencies;
    record;
    timeZone;
    converter = new typed_value_converter_1.TypedValueConverter();
    constructor(dependencies, record, timeZone = 'UTC') {
        super();
        this.dependencies = dependencies;
        this.record = record;
        this.timeZone = timeZone;
    }
    visitRoot(ctx) {
        return ctx.expr().accept(this);
    }
    visitStringLiteral(ctx) {
        // Extract and return the string value without quotes
        const quotedString = ctx.text;
        const rawString = quotedString.slice(1, -1);
        // Handle escape characters
        const unescapedString = this.unescapeString(rawString);
        return new typed_value_1.TypedValue(unescapedString, constant_1.CellValueType.String);
    }
    unescapeString(str) {
        return str.replace(/\\(.)/g, (_, char) => {
            switch (char) {
                case 'n':
                    return '\n';
                case 'r':
                    return '\r';
                case 't':
                    return '\t';
                case 'b':
                    return '\b';
                case 'f':
                    return '\f';
                case 'v':
                    return '\v';
                case '\\':
                    return '\\';
                case '"':
                    return '"';
                case "'":
                    return "'";
                default:
                    return '\\' + char;
            }
        });
    }
    visitIntegerLiteral(ctx) {
        // Parse and return the integer value
        const value = parseInt(ctx.text, 10);
        return new typed_value_1.TypedValue(value, constant_1.CellValueType.Number);
    }
    visitDecimalLiteral(ctx) {
        // Parse and return the decimal value
        const value = parseFloat(ctx.text);
        return new typed_value_1.TypedValue(value, constant_1.CellValueType.Number);
    }
    visitBooleanLiteral(ctx) {
        // Parse and return the boolean value
        const value = ctx.text.toUpperCase() === 'TRUE';
        return new typed_value_1.TypedValue(value, constant_1.CellValueType.Boolean);
    }
    visitLeftWhitespaceOrComments(ctx) {
        return this.visit(ctx.expr());
    }
    visitRightWhitespaceOrComments(ctx) {
        return this.visit(ctx.expr());
    }
    visitBrackets(ctx) {
        return this.visit(ctx.expr());
    }
    getBinaryOpValueType(ctx, left, right) {
        switch (true) {
            case Boolean(ctx.PLUS()): {
                if (left.type === constant_1.CellValueType.Number && right.type === constant_1.CellValueType.Number) {
                    return constant_1.CellValueType.Number;
                }
                return constant_1.CellValueType.String;
            }
            case Boolean(ctx.MINUS()):
            case Boolean(ctx.STAR()):
            case Boolean(ctx.PERCENT()):
            case Boolean(ctx.SLASH()): {
                return constant_1.CellValueType.Number;
            }
            case Boolean(ctx.PIPE_PIPE()):
            case Boolean(ctx.AMP_AMP()):
            case Boolean(ctx.EQUAL()):
            case Boolean(ctx.BANG_EQUAL()):
            case Boolean(ctx.GT()):
            case Boolean(ctx.GTE()):
            case Boolean(ctx.LT()):
            case Boolean(ctx.LTE()): {
                return constant_1.CellValueType.Boolean;
            }
            case Boolean(ctx.AMP()): {
                return constant_1.CellValueType.String;
            }
            default: {
                throw new TypeError(`unknown operator: ${ctx.text}`);
            }
        }
    }
    transformNodeValue(typedValue, ctx) {
        // A Node with a field value type requires dedicated string conversion logic to be executed.
        if (!typedValue.field) {
            return typedValue;
        }
        const field = typedValue.field;
        const isComparisonOperator = [
            ctx.EQUAL(),
            ctx.BANG_EQUAL(),
            ctx.LT(),
            ctx.LTE(),
            ctx.GT(),
            ctx.GTE(),
        ].some((op) => Boolean(op));
        if (field.cellValueType === constant_1.CellValueType.DateTime && isComparisonOperator) {
            return typedValue;
        }
        if (field.isMultipleCellValue && field.cellValueType === constant_1.CellValueType.Number) {
            if (!typedValue.value?.length)
                return null;
            if (typedValue.value.length > 1) {
                throw new TypeError('Cannot perform mathematical calculations on an array with more than one numeric element.');
            }
            return new typed_value_1.TypedValue(Number(typedValue.value[0]), constant_1.CellValueType.Number);
        }
        if ([constant_1.CellValueType.Number, constant_1.CellValueType.Boolean, constant_1.CellValueType.String].includes(field.cellValueType)) {
            return typedValue;
        }
        return new typed_value_1.TypedValue(field.cellValue2String(typedValue.value), constant_1.CellValueType.String);
    }
    transformUnaryNodeValue(typedValue) {
        if (!typedValue.field) {
            return typedValue;
        }
        const { cellValueType, isMultipleCellValue } = typedValue.field;
        if (cellValueType !== constant_1.CellValueType.Number)
            return null;
        if (isMultipleCellValue) {
            if (!typedValue.value?.length)
                return null;
            if (typedValue.value.length > 1) {
                throw new TypeError('Cannot perform mathematical calculations on an array with more than one numeric element.');
            }
            return new typed_value_1.TypedValue(Number(typedValue.value[0]), constant_1.CellValueType.Number);
        }
        return typedValue;
    }
    visitUnaryOp(ctx) {
        const expr = ctx.expr();
        const typedValue = this.visit(expr);
        const value = this.transformUnaryNodeValue(typedValue)?.value ?? null;
        return new typed_value_1.TypedValue(value ? -value : null, constant_1.CellValueType.Number);
    }
    visitBinaryOp(ctx) {
        const leftNode = ctx.expr(0);
        const rightNode = ctx.expr(1);
        const left = this.visit(leftNode);
        const right = this.visit(rightNode);
        const lv = this.transformNodeValue(left, ctx)?.value ?? null;
        const rv = this.transformNodeValue(right, ctx)?.value ?? null;
        const valueType = this.getBinaryOpValueType(ctx, left, right);
        let value;
        switch (true) {
            case Boolean(ctx.STAR()): {
                value = lv * rv;
                break;
            }
            case Boolean(ctx.SLASH()): {
                value = !rv ? null : lv / rv;
                break;
            }
            case Boolean(ctx.PLUS()): {
                if (valueType === constant_1.CellValueType.Number) {
                    value = lv + rv;
                }
                else {
                    const leftString = lv == null ? '' : lv;
                    const rightString = rv == null ? '' : rv;
                    value = String(leftString) + String(rightString);
                }
                break;
            }
            case Boolean(ctx.PERCENT()): {
                value = !rv ? null : lv % rv;
                break;
            }
            case Boolean(ctx.MINUS()): {
                value = lv - rv;
                break;
            }
            case Boolean(ctx.GT()): {
                value = lv > rv;
                break;
            }
            case Boolean(ctx.LT()): {
                value = lv < rv;
                break;
            }
            case Boolean(ctx.GTE()): {
                value = lv >= rv;
                break;
            }
            case Boolean(ctx.LTE()): {
                value = lv <= rv;
                break;
            }
            case Boolean(ctx.EQUAL()): {
                value = this.areValuesEqual(left, right, lv, rv);
                break;
            }
            case Boolean(ctx.BANG_EQUAL()): {
                value = this.areValuesNotEqual(left, right, lv, rv);
                break;
            }
            case Boolean(ctx.AMP()): {
                value = String(lv == null ? '' : lv) + String(rv == null ? '' : rv);
                break;
            }
            case Boolean(ctx.AMP_AMP()): {
                value = lv && rv;
                break;
            }
            case Boolean(ctx.PIPE_PIPE()): {
                value = lv || rv;
                break;
            }
            default:
                throw new Error(`Unsupported binary operation: ${ctx.text}`);
        }
        return new typed_value_1.TypedValue(value, valueType);
    }
    areValuesEqual(leftTypedValue, rightTypedValue, leftValue, rightValue) {
        const normalized = this.normalizeEqualityValues(leftTypedValue, rightTypedValue, leftValue, rightValue);
        if (this.shouldUseStrictBlankEquality(leftTypedValue, rightTypedValue, leftValue, rightValue)) {
            return normalized.left === normalized.right;
        }
        return normalized.left == normalized.right;
    }
    areValuesNotEqual(leftTypedValue, rightTypedValue, leftValue, rightValue) {
        const { left: normalizedLeft, right: normalizedRight } = this.normalizeEqualityValues(leftTypedValue, rightTypedValue, leftValue, rightValue);
        if (this.shouldUseStrictBlankEquality(leftTypedValue, rightTypedValue, leftValue, rightValue)) {
            return normalizedLeft !== normalizedRight;
        }
        return normalizedLeft != normalizedRight;
    }
    shouldUseStrictBlankEquality(leftTypedValue, rightTypedValue, leftValue, rightValue) {
        const hasNumericOperand = this.isNumericLikeTypedValue(leftTypedValue) || this.isNumericLikeTypedValue(rightTypedValue);
        if (!hasNumericOperand) {
            return false;
        }
        return (this.isBlankEqualityValue(leftTypedValue, leftValue) ||
            this.isBlankEqualityValue(rightTypedValue, rightValue));
    }
    isBlankEqualityValue(typedValue, value) {
        if (typedValue.isBlank || value == null) {
            return true;
        }
        return this.isStringLikeTypedValue(typedValue) && value === '';
    }
    normalizeEqualityValues(leftTypedValue, rightTypedValue, leftValue, rightValue) {
        if (!this.shouldNormalizeBlankEquality(leftTypedValue, rightTypedValue)) {
            return {
                left: leftValue,
                right: rightValue,
            };
        }
        return {
            left: this.normalizeBlankEqualityValue(leftTypedValue, leftValue),
            right: this.normalizeBlankEqualityValue(rightTypedValue, rightValue),
        };
    }
    shouldNormalizeBlankEquality(leftTypedValue, rightTypedValue) {
        return (this.isStringLikeTypedValue(leftTypedValue) ||
            this.isStringLikeTypedValue(rightTypedValue) ||
            this.isNumericLikeTypedValue(leftTypedValue) ||
            this.isNumericLikeTypedValue(rightTypedValue));
    }
    normalizeBlankEqualityValue(typedValue, value) {
        if (value == null && this.isStringLikeTypedValue(typedValue)) {
            return '';
        }
        if (value == null && this.isNumericLikeTypedValue(typedValue)) {
            return '';
        }
        return value;
    }
    isStringLikeTypedValue(typedValue) {
        if (typedValue.type === constant_1.CellValueType.String) {
            return true;
        }
        if (typedValue.field?.cellValueType === constant_1.CellValueType.String) {
            return true;
        }
        return false;
    }
    isNumericLikeTypedValue(typedValue) {
        if (typedValue.type === constant_1.CellValueType.Number) {
            return true;
        }
        if (typedValue.field?.cellValueType === constant_1.CellValueType.Number) {
            return true;
        }
        return false;
    }
    createTypedValueByField(field) {
        let value = this.record ? this.record.fields[field.id] : null;
        if (value == null ||
            ![constant_1.CellValueType.String, constant_1.CellValueType.DateTime].includes(field.cellValueType)) {
            return new typed_value_1.TypedValue(value, field.cellValueType, field.isMultipleCellValue, field);
        }
        // some field like link or attachment may contain json object cellValue, that need to be converted to string.
        if (field.isMultipleCellValue && value[0] && typeof value[0] === 'object') {
            value = value.map((v) => (field.item2String ? field.item2String(v) : v));
        }
        if (!field.isMultipleCellValue && typeof value === 'object') {
            value = field.cellValue2String(value);
        }
        return new typed_value_1.TypedValue(value, field.cellValueType, field.isMultipleCellValue, field);
    }
    visitFieldReferenceCurly(ctx) {
        const fieldId = (0, formula_1.extractFieldReferenceId)(ctx);
        if (!fieldId) {
            throw new Error('FieldId {} is a invalid field id');
        }
        const field = this.dependencies[fieldId];
        if (!field) {
            throw new Error(`FieldId ${fieldId} is a invalid field id`);
        }
        return this.createTypedValueByField(field);
    }
    /**
     * transform typed value into function accept value type as possible as it can
     */
    transformTypedValue(typedValue, func) {
        return this.converter.convertTypedValue(typedValue, func);
    }
    visitFunctionCall(ctx) {
        const rawName = ctx.func_name().text.toUpperCase();
        const normalized = (0, function_aliases_1.normalizeFunctionNameAlias)(rawName);
        const fnName = normalized;
        const func = factory_1.FUNCTIONS[fnName];
        if (!func) {
            throw new TypeError(`Function name ${rawName} is not found`);
        }
        if (fnName === common_1.FunctionName.Blank) {
            return new typed_value_1.TypedValue(null, constant_1.CellValueType.String, false, undefined, true);
        }
        let params;
        try {
            params = ctx.expr().map((exprCtx) => {
                const typedValue = this.visit(exprCtx);
                return this.transformTypedValue(typedValue, func);
            });
        }
        catch (e) {
            if (fnName !== common_1.FunctionName.IsError)
                throw e;
            params = [formulaBaseError];
        }
        const { type, isMultiple } = func.getReturnType(params);
        if (!this.record) {
            return new typed_value_1.TypedValue(null, type, isMultiple);
        }
        const value = func.eval(params, {
            record: this.record,
            dependencies: this.dependencies,
            timeZone: this.timeZone,
        });
        return new typed_value_1.TypedValue(value, type, isMultiple);
    }
    defaultResult() {
        return new typed_value_1.TypedValue(null, constant_1.CellValueType.String);
    }
}
exports.EvalVisitor = EvalVisitor;
