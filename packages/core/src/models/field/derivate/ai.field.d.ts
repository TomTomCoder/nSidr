import { z } from 'zod';
import type { FieldType } from '../constant';
import { CellValueType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { FieldCore } from '../field';
export declare const aiFieldOptionsSchema: z.ZodObject<{
    prompt: z.ZodOptional<z.ZodString>;
    sourceFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type IAiFieldOptions = z.infer<typeof aiFieldOptionsSchema>;
export declare class AiFieldCore extends FieldCore {
    type: FieldType.Ai;
    options: IAiFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.String;
    cellValue2String(value: unknown): string;
    item2String(value: unknown): string;
    convertStringToCellValue(value: string): string | null;
    repair(value: unknown): string | null;
    validateOptions(): z.ZodSafeParseResult<{
        prompt?: string | undefined;
        sourceFieldIds?: string[] | undefined;
    }>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<string | null | undefined>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
