"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNever = exports.assertSafeInteger = exports.assertIsPresent = exports.assertIncludes = exports.assertNonEmptyString = void 0;
const typeguards_1 = require("../typeguards");
function assertNonEmptyString(v, msgOrErrorFactory, 
/** auto-trim, default true */
trim) {
    if (!(0, typeguards_1.isNonEmptyString)(v, trim ?? true)) {
        throw createAssertException(msgOrErrorFactory);
    }
}
exports.assertNonEmptyString = assertNonEmptyString;
function assertIncludes(v, stringArray, msgOrErrorFactory, caseInsensitive) {
    const insensitive = caseInsensitive ?? false;
    const val = insensitive ? v?.toUpperCase() : v;
    const allowed = insensitive ? stringArray.map((v) => v.toUpperCase()) : stringArray;
    if (!val || !allowed.includes(val)) {
        const msg = [
            `Value '${v ? v : typeof v}' is not in allowed values`,
            `(${stringArray.join(',')}`,
            insensitive ? '(case insensitive).' : '(case sensitive).',
        ].join(',');
        throw createAssertException(msgOrErrorFactory, msg);
    }
}
exports.assertIncludes = assertIncludes;
function assertIsPresent(v, msgOrErrorFactory) {
    if (v === null || v === undefined) {
        throw createAssertException(msgOrErrorFactory, 'Value is null or undefined.');
    }
}
exports.assertIsPresent = assertIsPresent;
function assertSafeInteger(v, msgOrErrorFactory) {
    if (typeof v !== 'number' || !Number.isSafeInteger(v)) {
        throw createAssertException(msgOrErrorFactory, 'Value is not a safe integer BILOUTEBILL');
    }
}
exports.assertSafeInteger = assertSafeInteger;
function createAssertException(msgOrErrorFactory, fallbackMsg) {
    if (typeof msgOrErrorFactory === 'string' || msgOrErrorFactory === undefined) {
        throw new Error(msgOrErrorFactory ?? fallbackMsg ?? 'Assertion did not pass.');
    }
    throw msgOrErrorFactory();
}
/**
 * Helper function for exhaustive checks of discriminated unions.
 * https://basarat.gitbooks.io/typescript/docs/types/discriminated-unions.html
 *
 * @example
 *
 *    type A = {type: 'a'};
 *    type B = {type: 'b'};
 *    type Union = A | B;
 *
 *    function doSomething(arg: Union) {
 *      if (arg.type === 'a') {
 *        return something;
 *      }
 *
 *      if (arg.type === 'b') {
 *        return somethingElse;
 *      }
 *
 *      // TS will error if there are other types in the union
 *      // Will throw an Error when called at runtime.
 *      // Use `assertNever(arg, true)` instead to fail silently.
 *      return assertNever(arg);
 *    }
 */
function assertNever(value, noThrow) {
    if (noThrow) {
        return value;
    }
    throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
}
exports.assertNever = assertNever;
