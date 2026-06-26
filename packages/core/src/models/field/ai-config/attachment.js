"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachmentFieldAIConfigSchema = exports.attachmentFieldCustomizeAIConfigSchema = exports.attachmentFieldGenerateImageAIConfigSchema = exports.attachmentFieldAIConfigBaseSchema = exports.IMAGE_ASPECT_RATIOS = exports.RESOLUTION_PIXEL_MAP = exports.IMAGE_RESOLUTIONS = exports.ImageQuality = exports.attachmentFieldOutputSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
const attachment_field_1 = require("../derivate/attachment.field");
const text_1 = require("./text");
// === OUTPUT SCHEMA (per D-16-01) ===
// Re-uses the existing attachment cell-value schema (array of attachment items).
exports.attachmentFieldOutputSchema = attachment_field_1.attachmentCellValueSchema;
// === END OUTPUT SCHEMA ===
var ImageQuality;
(function (ImageQuality) {
    ImageQuality["Low"] = "low";
    ImageQuality["Medium"] = "medium";
    ImageQuality["High"] = "high";
})(ImageQuality || (exports.ImageQuality = ImageQuality = {}));
// Resolution presets for multimodal LLMs (controls image quality via prompt)
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.IMAGE_RESOLUTIONS = ['1K', '2K', '4K'];
// Resolution to approximate pixel dimensions mapping (for prompt generation)
/* eslint-disable @typescript-eslint/naming-convention */
exports.RESOLUTION_PIXEL_MAP = {
    '1K': 1024,
    '2K': 2048,
    '4K': 4096,
};
/* eslint-enable @typescript-eslint/naming-convention */
// Common aspect ratios for image generation (for multimodal LLMs that use prompt-based control)
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.IMAGE_ASPECT_RATIOS = [
    '1:1',
    '16:9',
    '9:16',
    '4:3',
    '3:4',
    '21:9',
    '2:3',
    '3:2',
];
exports.attachmentFieldAIConfigBaseSchema = text_1.commonFieldAIConfig.extend({
    n: zod_1.z.number().min(1).max(10).optional(),
    size: zod_1.z
        .string()
        .regex(/^\d+x\d+$/, { message: 'Size must be in "widthxheight" format, e.g., "1024x1024"' })
        .optional(),
    quality: zod_1.z.enum(ImageQuality).optional(),
    // Aspect ratio for multimodal LLMs (Gemini, etc.) - injected into prompt
    aspectRatio: zod_1.z
        .string()
        .regex(/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/, {
        message: 'Aspect ratio must be in "width:height" format, e.g., "16:9"',
    })
        .optional(),
    // Resolution for multimodal LLMs (1K, 2K, 4K) - injected into prompt
    resolution: zod_1.z.enum(exports.IMAGE_RESOLUTIONS).optional(),
});
exports.attachmentFieldGenerateImageAIConfigSchema = exports.attachmentFieldAIConfigBaseSchema.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.ImageGeneration),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.attachmentFieldCustomizeAIConfigSchema = exports.attachmentFieldAIConfigBaseSchema.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.ImageCustomization),
    prompt: zod_1.z.string(),
});
exports.attachmentFieldAIConfigSchema = zod_1.z.discriminatedUnion('type', [
    exports.attachmentFieldGenerateImageAIConfigSchema,
    exports.attachmentFieldCustomizeAIConfigSchema,
]);
