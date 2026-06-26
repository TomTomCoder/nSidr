"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullsToUndefinedShallow = exports.nullsToUndefined = void 0;
function nullsToUndefined(obj) {
    if (obj == null) {
        return undefined;
    }
    // object check based on: https://stackoverflow.com/a/51458052/6489012
    if (obj.constructor.name === 'Object') {
        for (const key in obj) {
            obj[key] = nullsToUndefined(obj[key]);
        }
    }
    return obj;
}
exports.nullsToUndefined = nullsToUndefined;
/* eslint-disable @typescript-eslint/no-explicit-any */
function nullsToUndefinedShallow(obj) {
    if (obj == null) {
        return undefined;
    }
    // object check based on: https://stackoverflow.com/a/51458052/6489012
    if (obj.constructor.name === 'Object') {
        for (const key in obj) {
            obj[key] = obj[key] == null ? undefined : obj[key];
        }
    }
    return obj;
}
exports.nullsToUndefinedShallow = nullsToUndefinedShallow;
