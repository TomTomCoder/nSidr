import { z } from '../../../zod';
import { CellValueType, FieldType } from '../constant';
export * from './number';
export * from './text';
export declare const getShowAsSchema: (cellValueType: CellValueType, isMultipleCellValue: boolean | undefined, fieldType?: FieldType) => z.ZodOptional<z.ZodObject<{
    type: z.ZodEnum<typeof import("./text").SingleLineTextDisplayType>;
}, z.core.$strip>> | z.ZodUndefined | z.ZodOptional<z.ZodObject<{
    type: z.ZodLiteral<"markdown">;
}, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
    type: z.ZodEnum<typeof import("./number").MultiNumberDisplayType>;
    color: z.ZodEnum<typeof import("@teable/core").Colors>;
}, z.core.$strip>> | z.ZodOptional<z.ZodObject<{
    type: z.ZodEnum<typeof import("./number").SingleNumberDisplayType>;
    color: z.ZodEnum<typeof import("@teable/core").Colors>;
    showValue: z.ZodBoolean;
    maxValue: z.ZodNumber;
}, z.core.$strip>>;
export declare const unionShowAsSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodEnum<typeof import("./text").SingleLineTextDisplayType>;
}, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodEnum<typeof import("./number").SingleNumberDisplayType>;
    color: z.ZodEnum<typeof import("@teable/core").Colors>;
    showValue: z.ZodBoolean;
    maxValue: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodEnum<typeof import("./number").MultiNumberDisplayType>;
    color: z.ZodEnum<typeof import("@teable/core").Colors>;
}, z.core.$strict>]>]>;
export type IUnionShowAs = z.infer<typeof unionShowAsSchema>;
