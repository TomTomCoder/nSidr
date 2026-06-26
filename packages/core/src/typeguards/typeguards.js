"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPresent = exports.isHttpStatusCode = exports.isParsableSafeInteger = exports.isParsableNumeric = exports.isSafeInteger = exports.isPlainObject = exports.isNonEmptyString = exports.isIsoDateString = void 0;
const isIsoDateString = (dateStr) => {
    if (typeof dateStr !== 'string' || !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateStr)) {
        return false;
    }
    try {
        const d = new Date(dateStr);
        return d.toISOString() === dateStr;
    }
    catch (e) {
        return false;
    }
};
exports.isIsoDateString = isIsoDateString;
const isNonEmptyString = (v, trim = true) => {
    return typeof v === 'string' && (trim ? v.trim() : v).length > 0;
};
exports.isNonEmptyString = isNonEmptyString;
const isPlainObject = (v) => {
    return (typeof v === 'object' &&
        v !== null &&
        v.constructor === Object &&
        Object.getPrototypeOf(v) === Object.prototype);
};
exports.isPlainObject = isPlainObject;
const isSafeInteger = (v) => {
    return typeof v === 'number' && Number.isSafeInteger(v);
};
exports.isSafeInteger = isSafeInteger;
const isParsableNumeric = (v) => {
    if (typeof v === 'number' && !Number.isNaN(v)) {
        return true;
    }
    if (!(0, exports.isNonEmptyString)(v)) {
        return false;
    }
    return !Number.isNaN(Number.parseInt(v, 10) || Number.isNaN(Number.parseFloat(v)));
};
exports.isParsableNumeric = isParsableNumeric;
const isParsableSafeInteger = (v) => {
    const value = typeof v === 'string' && /^-?\d+$/.test(v) ? Number.parseInt(v, 10) : v;
    return (0, exports.isSafeInteger)(value);
};
exports.isParsableSafeInteger = isParsableSafeInteger;
const isHttpStatusCode = (v) => {
    return (0, exports.isSafeInteger)(v) && v < 600 && v >= 100;
};
exports.isHttpStatusCode = isHttpStatusCode;
/**
 * Check whether a variable is not null and not undefined
 */
function isPresent(v) {
    return v !== undefined && v !== null;
}
exports.isPresent = isPresent;
