"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToFloat = exports.stringToSafeInteger = void 0;
const typeguards_1 = require("../typeguards");
function stringToSafeInteger(value) {
    if (!(0, typeguards_1.isParsableSafeInteger)(value)) {
        return null;
    }
    return typeof value === 'string' ? Number.parseInt(value, 10) : value;
}
exports.stringToSafeInteger = stringToSafeInteger;
function stringToFloat(value) {
    if (!(0, typeguards_1.isParsableNumeric)(typeof value === 'number' ? value.toString(10) : value ?? '')) {
        return null;
    }
    const v = Number.parseFloat(typeof value === 'string' ? value : value.toString(10));
    return Number.isNaN(v) ? null : v;
}
exports.stringToFloat = stringToFloat;
