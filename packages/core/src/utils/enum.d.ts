export declare function has<T extends object>(obj: T, key: keyof any): key is keyof T;
/**
 * Allows creating an object map type with a dynamic key type.
 *
 * TypeScript only allows `string` for `K` in `{[key: K]: V}` so we need a utility to bridge
 * the gap.
 *
 * This is an alias for TypeScript’s `Record` type, but the name “record” is confusing given our
 * Teable domain model.
 *
 * @hidden
 */
type IObjectMap<K extends keyof any, V> = {
    [P in K]: V;
};
export declare function getEnumValueIfExists<K extends string, V extends string>(enumObj: IObjectMap<K, V>, valueToCheck: string): V | null;
export {};
