import { z } from 'zod';
import { FieldAIActionType } from './text';
export declare const attachmentFieldOutputSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    path: z.ZodString;
    token: z.ZodString;
    size: z.ZodNumber;
    mimetype: z.ZodString;
    presignedUrl: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    smThumbnailUrl: z.ZodOptional<z.ZodString>;
    lgThumbnailUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type IAttachmentFieldOutput = z.infer<typeof attachmentFieldOutputSchema>;
export declare enum ImageQuality {
    Low = "low",
    Medium = "medium",
    High = "high"
}
export declare const IMAGE_RESOLUTIONS: readonly ["1K", "2K", "4K"];
export type IImageResolution = (typeof IMAGE_RESOLUTIONS)[number];
export declare const RESOLUTION_PIXEL_MAP: Record<IImageResolution, number>;
export declare const IMAGE_ASPECT_RATIOS: readonly ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "2:3", "3:2"];
export type IImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];
export declare const attachmentFieldAIConfigBaseSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
}, z.core.$strip>;
export declare const attachmentFieldGenerateImageAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<FieldAIActionType.ImageGeneration>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type IAttachmentFieldGenerateImageAIConfig = z.infer<typeof attachmentFieldGenerateImageAIConfigSchema>;
export declare const attachmentFieldCustomizeAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<FieldAIActionType.ImageCustomization>;
    prompt: z.ZodString;
}, z.core.$strip>;
export type IAttachmentFieldCustomizeAIConfig = z.infer<typeof attachmentFieldCustomizeAIConfigSchema>;
export declare const attachmentFieldAIConfigSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<FieldAIActionType.ImageGeneration>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<FieldAIActionType.ImageCustomization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">;
export type IAttachmentFieldAIConfig = z.infer<typeof attachmentFieldAIConfigSchema>;
