"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnumValueIfExists = exports.has = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
exports.has = has;
function keys(obj) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.keys(obj);
}
function getEnumValueIfExists(enumObj, valueToCheck) {
    const invertedEnum = getInvertedEnumMemoized(enumObj);
    if (has(invertedEnum, valueToCheck) && invertedEnum[valueToCheck]) {
        const enumKey = invertedEnum[valueToCheck];
        return enumObj[enumKey];
    }
    return null;
}
exports.getEnumValueIfExists = getEnumValueIfExists;
const invertedEnumCache = new WeakMap();
/**
 * @hidden
 */
function getInvertedEnumMemoized(enumObj) {
    const existingInvertedEnum = invertedEnumCache.get(enumObj);
    if (existingInvertedEnum) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return existingInvertedEnum;
    }
    const invertedEnum = {};
    for (const enumKey of keys(enumObj)) {
        const enumValue = enumObj[enumKey];
        invertedEnum[enumValue] = enumKey;
    }
    invertedEnumCache.set(enumObj, invertedEnum);
    return invertedEnum;
}
