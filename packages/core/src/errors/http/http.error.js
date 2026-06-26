"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
const http_response_types_1 = require("./http-response.types");
class HttpError extends Error {
    status;
    code;
    data;
    constructor(error, status, data) {
        const { message = 'Error', code = http_response_types_1.HttpErrorCode.INTERNAL_SERVER_ERROR } = typeof error === 'string' ? { message: error } : error;
        super(message);
        this.status = status;
        this.code = code;
        this.data = typeof error === 'object' ? error.data : data;
    }
}
exports.HttpError = HttpError;
