import { z } from '../../../zod';
export declare const numberFieldOptionsSchema: z.ZodObject<{
    formatting: z.ZodDiscriminatedUnion<[z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("../formatting").NumberFormattingType.Decimal>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("../formatting").NumberFormattingType.Percent>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("../formatting").NumberFormattingType.Currency>;
        symbol: z.ZodString;
    }, z.core.$strict>], "type">;
    showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const numberFieldOptionsRoSchema: z.ZodObject<{
    formatting: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("../formatting").NumberFormattingType.Decimal>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("../formatting").NumberFormattingType.Percent>;
    }, z.core.$strict>, z.ZodObject<{
        precision: z.ZodNumber;
        type: z.ZodLiteral<import("../formatting").NumberFormattingType.Currency>;
        symbol: z.ZodString;
    }, z.core.$strict>], "type">>;
    showAs: z.ZodOptional<z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type INumberFieldOptionsRo = z.infer<typeof numberFieldOptionsRoSchema>;
export type INumberFieldOptions = z.infer<typeof numberFieldOptionsSchema>;
