import { z } from 'zod';
import { Colors } from '../colors';
export declare enum SingleNumberDisplayType {
    Bar = "bar",
    Ring = "ring"
}
export declare enum MultiNumberDisplayType {
    Bar = "bar",
    Line = "line"
}
export declare const singleNumberShowAsSchema: z.ZodObject<{
    type: z.ZodEnum<typeof SingleNumberDisplayType>;
    color: z.ZodEnum<typeof Colors>;
    showValue: z.ZodBoolean;
    maxValue: z.ZodNumber;
}, z.core.$strip>;
export declare const multiNumberShowAsSchema: z.ZodObject<{
    type: z.ZodEnum<typeof MultiNumberDisplayType>;
    color: z.ZodEnum<typeof Colors>;
}, z.core.$strip>;
export type ISingleNumberShowAs = z.infer<typeof singleNumberShowAsSchema>;
export type IMultiNumberShowAs = z.infer<typeof multiNumberShowAsSchema>;
export declare const numberShowAsSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodEnum<typeof SingleNumberDisplayType>;
    color: z.ZodEnum<typeof Colors>;
    showValue: z.ZodBoolean;
    maxValue: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodEnum<typeof MultiNumberDisplayType>;
    color: z.ZodEnum<typeof Colors>;
}, z.core.$strict>]>;
export type INumberShowAs = z.infer<typeof numberShowAsSchema>;
