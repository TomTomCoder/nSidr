import { z } from 'zod';
import { Colors } from '../../colors';
import { FieldCore } from '../../field';
export declare const selectFieldChoiceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>;
    color: z.ZodEnum<typeof Colors>;
}, z.core.$strip>;
export declare const selectFieldChoiceRoSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>;
    color: z.ZodOptional<z.ZodEnum<typeof Colors>>;
}, z.core.$strip>;
export type ISelectFieldChoice = z.infer<typeof selectFieldChoiceSchema>;
export declare const selectFieldOptionsSchema: z.ZodObject<{
    choices: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>;
        color: z.ZodEnum<typeof Colors>;
    }, z.core.$strip>>;
    defaultValue: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    preventAutoNewOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const selectFieldOptionsRoSchema: z.ZodObject<{
    choices: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<typeof Colors>>;
    }, z.core.$strip>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
    preventAutoNewOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ISelectFieldOptions = z.infer<typeof selectFieldOptionsSchema>;
export type ISelectFieldOptionsRo = z.infer<typeof selectFieldOptionsRoSchema>;
export declare abstract class SelectFieldCore extends FieldCore {
    private _innerChoicesMap;
    private _innerChoicesMapKey;
    meta?: undefined;
    static defaultOptions(): ISelectFieldOptions;
    options: ISelectFieldOptions;
    get innerChoicesMap(): Record<string, {
        id: string;
        name: string;
        color: Colors;
    }>;
    validateOptions(): z.ZodSafeParseResult<{
        choices: {
            id: string;
            name: string;
            color: Colors;
        }[];
        defaultValue?: string | string[] | undefined;
        preventAutoNewOptions?: boolean | undefined;
    }>;
    cellValue2String(cellValue?: unknown): string;
    item2String(value?: unknown): string;
    validateCellValue(cellValue: unknown): z.ZodSafeParseResult<string[] | null> | z.ZodSafeParseResult<string | null>;
}
