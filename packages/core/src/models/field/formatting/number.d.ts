import { z } from 'zod';
export declare enum NumberFormattingType {
    Decimal = "decimal",
    Percent = "percent",
    Currency = "currency"
}
export declare const decimalFormattingSchema: z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<NumberFormattingType.Decimal>;
}, z.core.$strict>;
export declare const percentFormattingSchema: z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<NumberFormattingType.Percent>;
}, z.core.$strict>;
export declare const currencyFormattingSchema: z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<NumberFormattingType.Currency>;
    symbol: z.ZodString;
}, z.core.$strict>;
export declare const numberFormattingSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<NumberFormattingType.Decimal>;
}, z.core.$strict>, z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<NumberFormattingType.Percent>;
}, z.core.$strict>, z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<NumberFormattingType.Currency>;
    symbol: z.ZodString;
}, z.core.$strict>], "type">;
export type IDecimalFormatting = z.infer<typeof decimalFormattingSchema>;
export type IPercentFormatting = z.infer<typeof percentFormattingSchema>;
export type ICurrencyFormatting = z.infer<typeof currencyFormattingSchema>;
export type INumberFormatting = z.infer<typeof numberFormattingSchema>;
export declare const defaultNumberFormatting: INumberFormatting;
export declare const formatNumberToString: (value: number | undefined, formatting: INumberFormatting) => string;
export declare const parseStringToNumber: (value: string | null, formatting?: INumberFormatting) => number | null;
