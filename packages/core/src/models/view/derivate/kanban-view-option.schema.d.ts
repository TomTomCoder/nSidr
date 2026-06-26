import { z } from '../../../zod';
export declare const kanbanViewOptionSchema: z.ZodObject<{
    stackFieldId: z.ZodOptional<z.ZodString>;
    coverFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isCoverFit: z.ZodOptional<z.ZodBoolean>;
    isFieldNameHidden: z.ZodOptional<z.ZodBoolean>;
    isEmptyStackHidden: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type IKanbanViewOptions = z.infer<typeof kanbanViewOptionSchema>;
