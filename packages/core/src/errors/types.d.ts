import { z } from 'zod';
export declare const localizationSchema: z.ZodObject<{
    i18nKey: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type ILocalization<T extends string = string> = {
    i18nKey: T;
    context?: Record<string, unknown>;
};
