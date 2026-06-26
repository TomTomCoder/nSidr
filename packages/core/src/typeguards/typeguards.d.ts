export type IIsoDateString = string;
export declare const isIsoDateString: (dateStr: unknown) => dateStr is string;
export declare const isNonEmptyString: (v: unknown, trim?: boolean) => v is string;
export declare const isPlainObject: <T = unknown, K extends string | number = string>(v: unknown) => v is Record<K, T>;
export declare const isSafeInteger: (v: unknown) => v is number;
export declare const isParsableNumeric: (v: unknown) => v is string | number;
export declare const isParsableSafeInteger: (v: unknown) => v is string | number;
export declare const isHttpStatusCode: (v: unknown) => v is number;
/**
 * Check whether a variable is not null and not undefined
 */
export declare function isPresent<T>(v: T): v is NonNullable<T>;
