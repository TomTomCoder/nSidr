import { z } from '../../../zod';
export declare const galleryViewOptionSchema: z.ZodObject<{
    coverFieldId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isCoverFit: z.ZodOptional<z.ZodBoolean>;
    isFieldNameHidden: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type IGalleryViewOptions = z.infer<typeof galleryViewOptionSchema>;
