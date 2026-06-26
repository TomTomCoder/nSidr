"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJsonApiErrorResponse = exports.isJsonApiSuccessResponse = exports.isJsonApiResponse = void 0;
const typeguards_1 = require("../typeguards");
const isJsonApiResponse = (val) => {
    return (0, typeguards_1.isPlainObject)(val) && typeof val?.success === 'boolean';
};
exports.isJsonApiResponse = isJsonApiResponse;
const isJsonApiSuccessResponse = (val) => {
    return (0, exports.isJsonApiResponse)(val) && val.success && 'data' in val;
};
exports.isJsonApiSuccessResponse = isJsonApiSuccessResponse;
const isJsonApiErrorResponse = (val) => {
    return ((0, exports.isJsonApiResponse)(val) && !val.success && 'errors' in val && Array.isArray(val.errors));
};
exports.isJsonApiErrorResponse = isJsonApiErrorResponse;
