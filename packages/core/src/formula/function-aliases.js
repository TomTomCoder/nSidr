"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFunctionNameAlias = exports.FUNCTION_NAME_ALIASES = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const common_1 = require("./functions/common");
/**
 * Maps non-standard function tokens to their canonical FunctionName
 * counterpart so both formula evaluation and SQL conversion share the
 * same normalization logic.
 */
exports.FUNCTION_NAME_ALIASES = {
    ARRAYJOIN: common_1.FunctionName.ArrayJoin,
    ARRAYUNIQUE: common_1.FunctionName.ArrayUnique,
    ARRAYFLATTEN: common_1.FunctionName.ArrayFlatten,
    ARRAYCOMPACT: common_1.FunctionName.ArrayCompact,
};
/**
 * Normalize a function token (already uppercased) to its canonical
 * FunctionName enum when an alias is declared. Returns the original
 * token when no alias is registered.
 */
const normalizeFunctionNameAlias = (token) => exports.FUNCTION_NAME_ALIASES[token] ?? token;
exports.normalizeFunctionNameAlias = normalizeFunctionNameAlias;
