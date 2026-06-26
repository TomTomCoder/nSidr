"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodeToStatusMap = void 0;
const http_response_types_1 = require("./http-response.types");
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.ErrorCodeToStatusMap = {
    [http_response_types_1.HttpErrorCode.VALIDATION_ERROR]: 400,
    [http_response_types_1.HttpErrorCode.INVALID_CAPTCHA]: 400,
    [http_response_types_1.HttpErrorCode.INVALID_CREDENTIALS]: 400,
    [http_response_types_1.HttpErrorCode.UNAUTHORIZED]: 401,
    [http_response_types_1.HttpErrorCode.UNAUTHORIZED_SHARE]: 401,
    [http_response_types_1.HttpErrorCode.PAYMENT_REQUIRED]: 402,
    [http_response_types_1.HttpErrorCode.CREDIT_LIMIT_EXCEEDED]: 402,
    [http_response_types_1.HttpErrorCode.RESTRICTED_RESOURCE]: 403,
    [http_response_types_1.HttpErrorCode.NOT_FOUND]: 404,
    [http_response_types_1.HttpErrorCode.REQUEST_TIMEOUT]: 408,
    [http_response_types_1.HttpErrorCode.CONFLICT]: 409,
    [http_response_types_1.HttpErrorCode.UNPROCESSABLE_ENTITY]: 422,
    [http_response_types_1.HttpErrorCode.FAILED_DEPENDENCY]: 424,
    [http_response_types_1.HttpErrorCode.USER_LIMIT_EXCEEDED]: 460,
    [http_response_types_1.HttpErrorCode.TOO_MANY_REQUESTS]: 429,
    [http_response_types_1.HttpErrorCode.PAYLOAD_TOO_LARGE]: 413,
    [http_response_types_1.HttpErrorCode.INTERNAL_SERVER_ERROR]: 500,
    [http_response_types_1.HttpErrorCode.DATABASE_CONNECTION_UNAVAILABLE]: 503,
    [http_response_types_1.HttpErrorCode.GATEWAY_TIMEOUT]: 504,
    [http_response_types_1.HttpErrorCode.UNKNOWN_ERROR_CODE]: 500,
    [http_response_types_1.HttpErrorCode.VIEW_NOT_FOUND]: 404,
    [http_response_types_1.HttpErrorCode.AUTOMATION_NODE_PARSE_ERROR]: 400,
    [http_response_types_1.HttpErrorCode.AUTOMATION_NODE_NEED_TEST]: 400,
    [http_response_types_1.HttpErrorCode.AUTOMATION_NODE_TEST_OUTDATED]: 400,
    [http_response_types_1.HttpErrorCode.NETWORK_ERROR]: 0,
};
