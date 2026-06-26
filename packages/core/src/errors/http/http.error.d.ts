import type { IHttpError } from './http-response.types';
import { HttpErrorCode } from './http-response.types';
export declare class HttpError extends Error implements IHttpError {
    status: number;
    code: HttpErrorCode;
    data?: unknown;
    constructor(error: string | {
        message?: string;
        code?: HttpErrorCode;
        data?: Record<string, unknown>;
    }, status: number, data?: Record<string, unknown>);
}
