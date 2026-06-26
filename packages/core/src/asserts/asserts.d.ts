type IMsgOrErrorFactory = string | (() => Error);
export declare function assertNonEmptyString(v: unknown, msgOrErrorFactory?: IMsgOrErrorFactory, 
/** auto-trim, default true */
trim?: boolean): asserts v is string;
export declare function assertIncludes<T extends string[]>(v: string | undefined, stringArray: T, msgOrErrorFactory?: IMsgOrErrorFactory, caseInsensitive?: boolean): asserts v is T[number];
export declare function assertIsPresent<T>(v: T, msgOrErrorFactory?: IMsgOrErrorFactory): asserts v is NonNullable<T>;
export declare function assertSafeInteger(v: unknown, msgOrErrorFactory?: IMsgOrErrorFactory): asserts v is number;
/**
 * Helper function for exhaustive checks of discriminated unions.
 * https://basarat.gitbooks.io/typescript/docs/types/discriminated-unions.html
 *
 * @example
 *
 *    type A = {type: 'a'};
 *    type B = {type: 'b'};
 *    type Union = A | B;
 *
 *    function doSomething(arg: Union) {
 *      if (arg.type === 'a') {
 *        return something;
 *      }
 *
 *      if (arg.type === 'b') {
 *        return somethingElse;
 *      }
 *
 *      // TS will error if there are other types in the union
 *      // Will throw an Error when called at runtime.
 *      // Use `assertNever(arg, true)` instead to fail silently.
 *      return assertNever(arg);
 *    }
 */
export declare function assertNever(value: never, noThrow?: boolean): never;
export {};
