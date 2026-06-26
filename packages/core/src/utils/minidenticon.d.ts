interface MinidenticonFunction {
    (seed?: string, saturation?: number, lightness?: number, hashFn?: (str: string) => number): string;
}
declare const minidenticon: MinidenticonFunction;
export { minidenticon };
