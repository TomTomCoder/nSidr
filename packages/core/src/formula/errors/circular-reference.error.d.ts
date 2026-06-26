/**
 * Error thrown when a circular reference is detected in formula field expansion.
 *
 * This error occurs when formula fields reference each other in a circular manner,
 * which would cause infinite recursion during SQL conversion.
 *
 * @example
 * ```
 * // Field A: {B} + 1
 * // Field B: {A} + 1
 * // This would throw a CircularReferenceError
 * ```
 */
export declare class CircularReferenceError extends Error {
    readonly name = "CircularReferenceError";
    readonly fieldId: string;
    readonly expansionStack: string[];
    constructor(fieldId: string, expansionStack?: string[]);
    /**
     * Returns the full circular reference chain
     */
    getCircularChain(): string[];
    /**
     * Returns a human-readable description of the circular reference
     */
    getCircularDescription(): string;
}
