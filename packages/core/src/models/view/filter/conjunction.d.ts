import { z } from 'zod';
export declare const and: z.ZodLiteral<"and">;
export declare const or: z.ZodLiteral<"or">;
export declare const conjunctionSchema: z.ZodUnion<readonly [z.ZodLiteral<"and">, z.ZodLiteral<"or">]>;
export type IConjunction = z.infer<typeof conjunctionSchema>;
