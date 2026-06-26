"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFieldNotNullValidationEnabled = exports.checkFieldUniqueValidationEnabled = exports.checkFieldValidationEnabled = void 0;
const constant_1 = require("./constant");
const checkFieldValidationEnabled = (fieldType, isLookup) => {
    if ((0, exports.checkFieldUniqueValidationEnabled)(fieldType, isLookup) ||
        (0, exports.checkFieldNotNullValidationEnabled)(fieldType, isLookup)) {
        return true;
    }
    return false;
};
exports.checkFieldValidationEnabled = checkFieldValidationEnabled;
const checkFieldUniqueValidationEnabled = (fieldType, isLookup) => {
    if (isLookup || !constant_1.UNIQUE_VALIDATION_FIELD_TYPES.has(fieldType)) {
        return false;
    }
    return true;
};
exports.checkFieldUniqueValidationEnabled = checkFieldUniqueValidationEnabled;
const checkFieldNotNullValidationEnabled = (fieldType, isLookup) => {
    if (isLookup || !constant_1.NOT_NULL_VALIDATION_FIELD_TYPES.has(fieldType)) {
        return false;
    }
    return true;
};
exports.checkFieldNotNullValidationEnabled = checkFieldNotNullValidationEnabled;
