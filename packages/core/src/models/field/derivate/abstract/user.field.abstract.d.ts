import { z } from 'zod';
import type { CellValueType } from '../../constant';
import { FieldCore } from '../../field';
export declare const userCellValueSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isSystem: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type IUserCellValue = z.infer<typeof userCellValueSchema>;
export declare abstract class UserAbstractCore extends FieldCore {
    cellValueType: CellValueType.String;
    meta?: FieldCore['meta'];
    item2String(value: unknown): string;
    cellValue2String(cellValue?: unknown): string;
    validateCellValue(cellValue: unknown): z.ZodSafeParseResult<{
        id: string;
        title: string;
        email?: string | undefined;
        avatarUrl?: string | null | undefined;
        isSystem?: boolean | undefined;
    }[] | null> | z.ZodSafeParseResult<{
        id: string;
        title: string;
        email?: string | undefined;
        avatarUrl?: string | null | undefined;
        isSystem?: boolean | undefined;
    } | null>;
}
