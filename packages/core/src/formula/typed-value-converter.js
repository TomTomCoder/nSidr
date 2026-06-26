"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedValueConverter = void 0;
const constant_1 = require("../models/field/constant");
const typed_value_1 = require("./typed-value");
class TypedValueConverter {
    // auto transform an array value to non-array value if only have 1 item
    transformMultipleValue(typedValue, func) {
        const { value, type, isMultiple } = typedValue;
        if (!isMultiple || func.acceptMultipleValue) {
            return typedValue;
        }
        if (value?.length > 1) {
            console.log(func);
            throw new TypeError(`function ${func.name} is not accept array value: ${value}`);
        }
        const transValue = value && value[0];
        return new typed_value_1.TypedValue(transValue, type);
    }
    // convert typed value to function first accept value type
    convertTypedValue(typedValue, func) {
        typedValue = this.transformMultipleValue(typedValue, func);
        if (func.acceptValueType.has(typedValue.type)) {
            return typedValue;
        }
        const firstAcceptValueType = func.acceptValueType.values().next().value;
        if (!firstAcceptValueType) {
            throw new TypeError(`function ${func.name} has no acceptable value types`);
        }
        const converted = typedValue.isMultiple
            ? typedValue.value?.map((v) => this.convertUnsupportedValue(v, typedValue.type, firstAcceptValueType))
            : this.convertUnsupportedValue(typedValue.value, typedValue.type, firstAcceptValueType);
        return new typed_value_1.TypedValue(converted == null ? null : converted, firstAcceptValueType, typedValue.isMultiple);
    }
    convertUnsupportedValue(value, inputValueType, acceptValueType) {
        if (inputValueType === acceptValueType) {
            throw new Error('Should not convert an accept value type');
        }
        if (value == null) {
            return null;
        }
        switch (acceptValueType) {
            case constant_1.CellValueType.DateTime:
                return this.convertDatetimeValue(value, inputValueType);
            case constant_1.CellValueType.Number:
                return this.convertNumberValue(value, inputValueType);
            case constant_1.CellValueType.Boolean:
                return this.convertBooleanValue(value, inputValueType);
            case constant_1.CellValueType.String:
                return this.convertStringValue(value, inputValueType);
        }
    }
    convertDatetimeValue(value, inputValueType) {
        switch (inputValueType) {
            case constant_1.CellValueType.DateTime:
                return value;
            case constant_1.CellValueType.String: {
                const date = new Date(value);
                if (!Number.isNaN(date.getTime())) {
                    return date.toISOString();
                }
                return null;
            }
            case constant_1.CellValueType.Boolean:
            case constant_1.CellValueType.Number:
                return null;
        }
    }
    convertBooleanValue(value, inputValueType) {
        switch (inputValueType) {
            case constant_1.CellValueType.Boolean:
                return value;
            case constant_1.CellValueType.String:
            case constant_1.CellValueType.Number:
            case constant_1.CellValueType.DateTime:
                return Boolean(value);
        }
    }
    convertNumberValue(value, inputValueType) {
        switch (inputValueType) {
            case constant_1.CellValueType.Number:
                return value;
            case constant_1.CellValueType.String: {
                const number = Number(value);
                if (Number.isNaN(number)) {
                    return null;
                }
                return number;
            }
            case constant_1.CellValueType.Boolean:
                return value ? 1 : 0;
            case constant_1.CellValueType.DateTime:
                return null;
        }
    }
    convertStringValue(value, inputValueType) {
        switch (inputValueType) {
            case constant_1.CellValueType.String:
            case constant_1.CellValueType.DateTime:
                return value;
            case constant_1.CellValueType.Boolean:
            case constant_1.CellValueType.Number:
                return String(value);
        }
    }
}
exports.TypedValueConverter = TypedValueConverter;
