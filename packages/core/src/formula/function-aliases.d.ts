import { FunctionName } from './functions/common';
/**
 * Maps non-standard function tokens to their canonical FunctionName
 * counterpart so both formula evaluation and SQL conversion share the
 * same normalization logic.
 */
export declare const FUNCTION_NAME_ALIASES: Record<string, FunctionName>;
/**
 * Normalize a function token (already uppercased) to its canonical
 * FunctionName enum when an alias is declared. Returns the original
 * token when no alias is registered.
 */
export declare const normalizeFunctionNameAlias: (token: string) => string;
