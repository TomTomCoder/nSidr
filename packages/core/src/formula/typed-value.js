"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedValue = void 0;
class TypedValue {
    value;
    type;
    isMultiple;
    field;
    isBlank;
    constructor(value, type, isMultiple, field, isBlank) {
        this.value = value;
        this.type = type;
        this.isMultiple = isMultiple;
        this.field = field;
        this.isBlank = isBlank;
    }
    toPlain() {
        return this.value === false ? null : this.value;
    }
}
exports.TypedValue = TypedValue;
