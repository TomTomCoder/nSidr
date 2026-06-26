import type { IJsonApiErrorResponse, IJsonApiResponse, IJsonApiSuccessResponse } from './json-api-response.types';
export declare const isJsonApiResponse: <T = unknown>(val: unknown) => val is IJsonApiResponse<T>;
export declare const isJsonApiSuccessResponse: <T = unknown>(val: unknown) => val is IJsonApiSuccessResponse<T>;
export declare const isJsonApiErrorResponse: (val: unknown) => val is IJsonApiErrorResponse;
