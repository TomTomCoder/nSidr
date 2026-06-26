import { z } from '../../../zod';
import { RowHeightLevel } from '../constant';
export declare const gridViewOptionSchema: z.ZodObject<{
    rowHeight: z.ZodOptional<z.ZodEnum<typeof RowHeightLevel>>;
    fieldNameDisplayLines: z.ZodOptional<z.ZodNumber>;
    frozenColumnCount: z.ZodOptional<z.ZodNumber>;
    frozenFieldId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type IGridViewOptions = z.infer<typeof gridViewOptionSchema>;
