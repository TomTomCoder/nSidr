import { z } from '../../../zod';
import { Colors } from '../../field/colors';
export declare enum ColorConfigType {
    Field = "field",
    Custom = "custom"
}
export declare const colorConfigSchema: z.ZodNullable<z.ZodOptional<z.ZodObject<{
    type: z.ZodEnum<typeof ColorConfigType>;
    fieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    color: z.ZodNullable<z.ZodOptional<z.ZodEnum<typeof Colors>>>;
}, z.core.$strip>>>;
export type IColorConfig = z.infer<typeof colorConfigSchema>;
export declare const calendarViewOptionSchema: z.ZodObject<{
    startDateFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endDateFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    titleFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    colorConfig: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<typeof ColorConfigType>;
        fieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        color: z.ZodNullable<z.ZodOptional<z.ZodEnum<typeof Colors>>>;
    }, z.core.$strip>>>;
}, z.core.$strict>;
export type ICalendarViewOptions = z.infer<typeof calendarViewOptionSchema>;
