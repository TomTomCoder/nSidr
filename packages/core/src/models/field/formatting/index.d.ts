import { z } from '../../../zod';
import { CellValueType } from '../constant';
import { type IDatetimeFormatting } from './datetime';
import { type INumberFormatting } from './number';
export * from './number';
export * from './datetime';
export * from './time-zone';
export type IUnionFormatting = IDatetimeFormatting | INumberFormatting;
export declare const unionFormattingSchema: z.ZodAny;
export declare const getDefaultFormatting: (cellValueType: CellValueType) => {
    precision: number;
    type: import("./number").NumberFormattingType.Decimal;
} | {
    precision: number;
    type: import("./number").NumberFormattingType.Percent;
} | {
    precision: number;
    type: import("./number").NumberFormattingType.Currency;
    symbol: string;
} | {
    date: string;
    time: import("./datetime").TimeFormatting;
    timeZone: string;
} | undefined;
export declare const getFormattingSchema: (cellValueType: CellValueType) => z.ZodObject<{
    date: z.ZodString;
    time: z.ZodEnum<typeof import("./datetime").TimeFormatting>;
    timeZone: z.ZodString;
}, z.core.$strip> | z.ZodDiscriminatedUnion<[z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<import("./number").NumberFormattingType.Decimal>;
}, z.core.$strict>, z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<import("./number").NumberFormattingType.Percent>;
}, z.core.$strict>, z.ZodObject<{
    precision: z.ZodNumber;
    type: z.ZodLiteral<import("./number").NumberFormattingType.Currency>;
    symbol: z.ZodString;
}, z.core.$strict>], "type"> | z.ZodUndefined;
