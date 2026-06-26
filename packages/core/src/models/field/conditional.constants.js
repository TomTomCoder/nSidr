"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeConditionalLimit = exports.clampConditionalLimit = exports.CONDITIONAL_QUERY_DEFAULT_LIMIT = exports.CONDITIONAL_QUERY_MAX_LIMIT = void 0;
const parsePositiveInt = (raw, fallback) => {
    if (!raw)
        return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
};
const resolvedMax = parsePositiveInt(process.env.CONDITIONAL_QUERY_MAX_LIMIT, 5000);
const resolvedDefault = parsePositiveInt(process.env.CONDITIONAL_QUERY_DEFAULT_LIMIT, resolvedMax);
exports.CONDITIONAL_QUERY_MAX_LIMIT = resolvedMax;
exports.CONDITIONAL_QUERY_DEFAULT_LIMIT = Math.min(resolvedDefault, resolvedMax);
const clampConditionalLimit = (limit) => {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
        return undefined;
    }
    const truncated = Math.trunc(limit);
    if (truncated <= 0) {
        return undefined;
    }
    return Math.min(truncated, exports.CONDITIONAL_QUERY_MAX_LIMIT);
};
exports.clampConditionalLimit = clampConditionalLimit;
const normalizeConditionalLimit = (limit) => {
    return (0, exports.clampConditionalLimit)(limit) ?? exports.CONDITIONAL_QUERY_DEFAULT_LIMIT;
};
exports.normalizeConditionalLimit = normalizeConditionalLimit;
