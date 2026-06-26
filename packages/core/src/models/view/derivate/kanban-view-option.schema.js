"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kanbanViewOptionSchema = void 0;
const zod_1 = require("../../../zod");
exports.kanbanViewOptionSchema = zod_1.z
    .object({
    stackFieldId: zod_1.z.string().optional().meta({ description: 'The field id of the Kanban stack.' }),
    coverFieldId: zod_1.z.string().optional().nullable().meta({
        description: 'The cover field id is a designated attachment field id, the contents of which appear at the top of each Kanban card.',
    }),
    isCoverFit: zod_1.z.boolean().optional().meta({
        description: 'If true, cover images are resized to fit Kanban cards.',
    }),
    isFieldNameHidden: zod_1.z.boolean().optional().meta({
        description: 'If true, hides field name in the Kanban cards.',
    }),
    isEmptyStackHidden: zod_1.z.boolean().optional().meta({
        description: 'If true, hides empty stacks in the Kanban.',
    }),
})
    .strict();
