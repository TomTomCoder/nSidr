"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.galleryViewOptionSchema = void 0;
const zod_1 = require("../../../zod");
exports.galleryViewOptionSchema = zod_1.z
    .object({
    coverFieldId: zod_1.z.string().optional().nullable().meta({
        description: 'The cover field id is a designated attachment field id, the contents of which appear at the top of each gallery card.',
    }),
    isCoverFit: zod_1.z.boolean().optional().meta({
        description: 'If true, cover images are resized to fit gallery cards.',
    }),
    isFieldNameHidden: zod_1.z.boolean().optional().meta({
        description: 'If true, hides field name in the gallery cards.',
    }),
})
    .strict();
