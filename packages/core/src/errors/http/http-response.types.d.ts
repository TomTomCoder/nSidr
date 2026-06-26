import type { ILocalization } from '../types';
export type IHttpError = {
    /** a human-readable explanation specific to this occurrence of the problem. */
    message: string;
    /** the HTTP status code applicable to this problem, expressed as a string value. */
    status: number;
    /** an application-specific error code, expressed as a string value. */
    code: string;
    /** additional data */
    data?: unknown;
};
export declare enum HttpErrorCode {
    VALIDATION_ERROR = "validation_error",
    INVALID_CAPTCHA = "invalid_captcha",
    INVALID_CREDENTIALS = "invalid_credentials",
    UNAUTHORIZED = "unauthorized",
    UNAUTHORIZED_SHARE = "unauthorized_share",
    PAYMENT_REQUIRED = "payment_required",
    CREDIT_LIMIT_EXCEEDED = "credit_limit_exceeded",
    RESTRICTED_RESOURCE = "restricted_resource",
    NOT_FOUND = "not_found",
    REQUEST_TIMEOUT = "request_timeout",
    CONFLICT = "conflict",
    UNPROCESSABLE_ENTITY = "unprocessable_entity",
    FAILED_DEPENDENCY = "failed_dependency",
    USER_LIMIT_EXCEEDED = "user_limit_exceeded",
    TOO_MANY_REQUESTS = "too_many_requests",
    PAYLOAD_TOO_LARGE = "payload_too_large",
    INTERNAL_SERVER_ERROR = "internal_server_error",
    DATABASE_CONNECTION_UNAVAILABLE = "database_connection_unavailable",
    GATEWAY_TIMEOUT = "gateway_timeout",
    UNKNOWN_ERROR_CODE = "unknown_error_code",
    NETWORK_ERROR = "network_error",
    /** view */
    VIEW_NOT_FOUND = "view_not_found",
    /** automation */
    AUTOMATION_NODE_PARSE_ERROR = "automation_node_parse_error",
    AUTOMATION_NODE_NEED_TEST = "automation_node_need_test",
    AUTOMATION_NODE_TEST_OUTDATED = "automation_node_test_outdated"
}
export type ICustomHttpExceptionData<T extends string = string> = Record<string, unknown> & {
    localization?: ILocalization<T>;
};
