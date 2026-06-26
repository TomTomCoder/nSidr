"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpErrorCode = void 0;
var HttpErrorCode;
(function (HttpErrorCode) {
    // 400 - The request body does not match the schema for the expected parameters
    HttpErrorCode["VALIDATION_ERROR"] = "validation_error";
    // 400 - The captcha is invalid.
    HttpErrorCode["INVALID_CAPTCHA"] = "invalid_captcha";
    // 400 - The credentials are invalid.
    HttpErrorCode["INVALID_CREDENTIALS"] = "invalid_credentials";
    // 401 - The bearer token is not valid.
    HttpErrorCode["UNAUTHORIZED"] = "unauthorized";
    // 401 - Given the bearer token used, the client doesn't have permission to perform this operation.
    HttpErrorCode["UNAUTHORIZED_SHARE"] = "unauthorized_share";
    // 402 - Payment Required
    HttpErrorCode["PAYMENT_REQUIRED"] = "payment_required";
    // 402 - Credit limit exceeded
    HttpErrorCode["CREDIT_LIMIT_EXCEEDED"] = "credit_limit_exceeded";
    // 403 - Given the bearer token used, the client doesn't have permission to perform this operation.
    HttpErrorCode["RESTRICTED_RESOURCE"] = "restricted_resource";
    // 404 - Given the bearer token used, the resource does not exist. This error can also indicate that the resource has not been shared with owner of the bearer token.
    HttpErrorCode["NOT_FOUND"] = "not_found";
    // 408 - Requset timeout
    HttpErrorCode["REQUEST_TIMEOUT"] = "request_timeout";
    // 409 - The request could not be completed due to a conflict with the current state of the resource.
    HttpErrorCode["CONFLICT"] = "conflict";
    // 422 - The request body does not match the schema for the expected parameters
    HttpErrorCode["UNPROCESSABLE_ENTITY"] = "unprocessable_entity";
    // 424 - The request failed because it depended on another request and that request failed.
    HttpErrorCode["FAILED_DEPENDENCY"] = "failed_dependency";
    // 460 - The user has reached the limit of the number of users that can be created in the current instance.
    HttpErrorCode["USER_LIMIT_EXCEEDED"] = "user_limit_exceeded";
    // 429 - The user has reached the limit of the number of requests that can be made in the current instance.
    HttpErrorCode["TOO_MANY_REQUESTS"] = "too_many_requests";
    // 413 - The request payload is too large.
    HttpErrorCode["PAYLOAD_TOO_LARGE"] = "payload_too_large";
    // 500 - An unexpected error occurred.
    HttpErrorCode["INTERNAL_SERVER_ERROR"] = "internal_server_error";
    // 503 - database is unavailable or is not in a state that can be queried. Please try again later.
    HttpErrorCode["DATABASE_CONNECTION_UNAVAILABLE"] = "database_connection_unavailable";
    // 504 - The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server it needed to access in order to complete the request.
    HttpErrorCode["GATEWAY_TIMEOUT"] = "gateway_timeout";
    // Unknown error code
    HttpErrorCode["UNKNOWN_ERROR_CODE"] = "unknown_error_code";
    // Network error - client-side network issue, not server error
    HttpErrorCode["NETWORK_ERROR"] = "network_error";
    /** view */
    HttpErrorCode["VIEW_NOT_FOUND"] = "view_not_found";
    /** automation */
    HttpErrorCode["AUTOMATION_NODE_PARSE_ERROR"] = "automation_node_parse_error";
    // 400 - The automation node needs test.
    HttpErrorCode["AUTOMATION_NODE_NEED_TEST"] = "automation_node_need_test";
    // 400 - The automation node is outdated.
    HttpErrorCode["AUTOMATION_NODE_TEST_OUTDATED"] = "automation_node_test_outdated";
})(HttpErrorCode || (exports.HttpErrorCode = HttpErrorCode = {}));
