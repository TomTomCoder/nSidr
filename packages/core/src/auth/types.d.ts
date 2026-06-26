export type ExcludeAction<T extends string, F extends string> = T extends F ? never : T;
export type PickAction<T extends string, F extends string> = T extends F ? T : never;
