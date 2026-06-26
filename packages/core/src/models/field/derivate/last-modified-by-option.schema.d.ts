import { z } from '../../../zod';
export declare const lastModifiedByFieldOptionsSchema: z.ZodObject<{
    trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export type ILastModifiedByFieldOptions = z.infer<typeof lastModifiedByFieldOptionsSchema>;
