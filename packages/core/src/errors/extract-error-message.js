"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractErrorMessage = void 0;
/**
 * Safely extract a human-readable message from any thrown value.
 *
 * Handles all common shapes:
 *  - `Error` instances          → error.message
 *  - plain strings              → the string itself
 *  - objects with message/error → the string field
 *  - nested { error: { message } } → the nested message
 *  - { responseBody: '{"error":{"message":"..."}}' } → parsed body message
 *  - everything else            → JSON.stringify (truncated) or fallback text
 */
const unknownError = 'Unknown error';
function extractErrorMessage(error) {
    if (error instanceof Error)
        return error.message || error.name || unknownError;
    if (typeof error === 'string')
        return error;
    if (typeof error !== 'object' || error === null)
        return unknownError;
    const obj = error;
    const direct = getStringField(obj, 'message') || getStringField(obj, 'error');
    if (direct)
        return direct;
    const nested = getNestedErrorMessage(obj);
    if (nested)
        return nested;
    const body = getResponseBodyMessage(obj);
    if (body)
        return body;
    try {
        return JSON.stringify(error).slice(0, 500);
    }
    catch {
        return unknownError;
    }
}
exports.extractErrorMessage = extractErrorMessage;
function getStringField(obj, field) {
    const value = obj[field];
    return typeof value === 'string' && value ? value : null;
}
function getNestedErrorMessage(obj) {
    const nested = obj.error;
    if (typeof nested === 'object' && nested !== null) {
        return getStringField(nested, 'message');
    }
    return null;
}
function getResponseBodyMessage(obj) {
    if (typeof obj.responseBody !== 'string')
        return null;
    try {
        const body = JSON.parse(obj.responseBody);
        return body.error?.message || null;
    }
    catch {
        return null;
    }
}
